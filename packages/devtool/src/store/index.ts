import type {
  SpooshResponse,
  TraceEvent,
  PluginContext,
  StandaloneEvent,
  StateManager,
  EventEmitter,
} from "@spoosh/core";

import type {
  CacheEntryDisplay,
  OperationTrace,
  SubscriptionTrace,
  SubscriptionMessage,
  Trace,
  InvalidationEvent,
  DevToolFilters,
  DevToolStoreInterface,
  SubscriptionConnectEvent,
  SubscriptionMessageEvent,
  ExportedTrace,
  ExportedSSE,
  ExportedItem,
  ImportedSession,
} from "../types";
import { createRingBuffer } from "./history";
import { sanitizeForExport } from "../ui/utils/format";

export interface DevToolStoreConfig {
  stateManager?: StateManager;
}

interface RegisteredPlugin {
  name: string;
  operations: string[];
}

const DEFAULT_MAX_HISTORY = 50;
const STEP_NOTIFY_DEBOUNCE = 500;

export class DevToolStore implements DevToolStoreInterface {
  private traces = createRingBuffer<OperationTrace>(DEFAULT_MAX_HISTORY);
  private events = createRingBuffer<StandaloneEvent>(DEFAULT_MAX_HISTORY * 2);
  private subscriptions =
    createRingBuffer<SubscriptionTrace>(DEFAULT_MAX_HISTORY);
  private activeTraces = new Map<string, OperationTrace>();
  private activeSubscriptions = new Map<string, SubscriptionTrace>();
  private invalidations: InvalidationEvent[] = [];
  private subscribers = new Set<() => void>();
  private registeredPlugins: RegisteredPlugin[] = [];
  private filters: DevToolFilters = {
    operationTypes: new Set(),
    traceTypeFilter: "all",
    showSkipped: true,
    showOnlyWithChanges: false,
  };

  private stateManager: StateManager | undefined;
  private eventEmitter: EventEmitter | undefined;
  private importedSession: ImportedSession | null = null;
  private sensitiveHeaders = new Set<string>();
  private totalTraceCount = 0;
  private maxHistory = DEFAULT_MAX_HISTORY;
  private resolvedPaths = new Map<string, string>();
  private stepNotifyTimeout: ReturnType<typeof setTimeout> | null = null;
  private stepNotifyPending = false;
  private lastUpdateWasStepOnly = false;
  private pendingSubscriptions = new Map<
    string,
    { trace: SubscriptionTrace; timeout: ReturnType<typeof setTimeout> }
  >();

  constructor(config: DevToolStoreConfig = {}) {
    this.stateManager = config.stateManager;
  }

  setStateManager(stateManager: StateManager): void {
    this.stateManager = stateManager;
  }

  setEventEmitter(eventEmitter: EventEmitter): void {
    this.eventEmitter = eventEmitter;
  }

  getCacheEntries(searchQuery?: string): CacheEntryDisplay[] {
    if (!this.stateManager) {
      return [];
    }

    const entries = this.stateManager.getAllCacheEntries();
    const query = searchQuery?.toLowerCase().trim();
    const resolvedPathMap = this.buildResolvedPathMap();

    return entries
      .filter((e) => {
        try {
          const parsed = JSON.parse(e.key) as { method?: string };

          if (parsed.method && parsed.method !== "GET") {
            return false;
          }
        } catch {
          // Ignore parsing errors
        }

        if (!query) return true;

        return e.key.toLowerCase().includes(query);
      })
      .map((e) => ({
        queryKey: e.key,
        entry: e.entry,
        subscriberCount: this.stateManager!.getSubscribersCount(e.key),
        resolvedPath: resolvedPathMap.get(e.key),
      }))
      .sort(
        (a, b) =>
          (b.entry.state.timestamp ?? 0) - (a.entry.state.timestamp ?? 0)
      );
  }

  private buildResolvedPathMap(): Map<string, string> {
    const pathMap = new Map<string, string>();
    const traces = this.getTraces();

    for (const trace of traces) {
      if (!pathMap.has(trace.queryKey) || trace.timestamp > 0) {
        pathMap.set(trace.queryKey, trace.path);
      }
    }

    return pathMap;
  }

  refetchStateEntry(key: string): void {
    if (!this.eventEmitter) return;

    this.eventEmitter.emit("refetch", { queryKey: key, reason: "devtool" });
    this.notify();
  }

  deleteCacheEntry(key: string): void {
    if (!this.stateManager) return;

    this.stateManager.deleteCache(key);
    this.notify();
  }

  clearAllCache(): void {
    if (!this.stateManager) return;

    this.stateManager.clear();
    this.notify();
  }

  setMaxHistory(value: number): void {
    this.maxHistory = value;
    this.traces.resize(value);
    this.events.resize(value * 2);
    this.subscriptions.resize(value);
    this.trimOldestItems();
    this.notify();
  }

  private trimOldestItems(): void {
    const totalCompleted = this.traces.length + this.subscriptions.length;

    if (totalCompleted <= this.maxHistory) return;

    const allTraces = this.traces.toArray();
    const allSubs = this.subscriptions.toArray();

    const combined: Array<{
      type: "trace" | "sub";
      timestamp: number;
      item: OperationTrace | SubscriptionTrace;
    }> = [
      ...allTraces.map((t) => ({
        type: "trace" as const,
        timestamp: t.timestamp,
        item: t,
      })),
      ...allSubs.map((s) => ({
        type: "sub" as const,
        timestamp: s.timestamp,
        item: s,
      })),
    ];

    combined.sort((a, b) => b.timestamp - a.timestamp);

    const itemsToKeep = combined.slice(0, this.maxHistory);

    const tracesToKeep = itemsToKeep
      .filter((i) => i.type === "trace")
      .map((i) => i.item as OperationTrace);
    const subsToKeep = itemsToKeep
      .filter((i) => i.type === "sub")
      .map((i) => i.item as SubscriptionTrace);

    this.traces.clear();
    this.subscriptions.clear();

    for (const t of tracesToKeep.reverse()) {
      this.traces.push(t);
    }

    for (const s of subsToKeep.reverse()) {
      this.subscriptions.push(s);
    }
  }

  setRegisteredPlugins(
    plugins: Array<{ name: string; operations: string[] }>
  ): void {
    this.registeredPlugins = plugins.filter(
      (p) => !p.name.startsWith("spoosh:devtool")
    );
  }

  startTrace(context: PluginContext, resolvedPath: string): OperationTrace {
    const now = performance.now();
    const dedupeWindow = 100;

    for (const trace of this.activeTraces.values()) {
      if (
        trace.queryKey === context.queryKey &&
        now - trace.startTime < dedupeWindow
      ) {
        return trace;
      }
    }

    const recentTraces = this.traces.toArray();

    for (let i = recentTraces.length - 1; i >= 0; i--) {
      const trace = recentTraces[i]!;

      if (now - trace.startTime > dedupeWindow) break;

      const isCacheHit =
        trace.duration !== undefined && Math.round(trace.duration) === 0;

      if (trace.queryKey === context.queryKey && isCacheHit) {
        return trace;
      }
    }

    const notifyFn = () => this.notifyDebounced();

    const trace: OperationTrace = {
      ...context,
      type: "request",
      id: crypto.randomUUID(),
      path: resolvedPath,
      startTime: now,
      timestamp: Date.now(),
      steps: [],
      response: undefined,

      addStep(event: TraceEvent, timestamp: number) {
        this.steps.push({
          traceId: this.id,
          plugin: event.plugin,
          stage: event.stage,
          timestamp,
          reason: event.reason,
          color: event.color,
          diff: event.diff,
          info: event.info,
        });
        notifyFn();
      },
    };

    this.activeTraces.set(trace.id, trace);
    this.resolvedPaths.set(context.queryKey, resolvedPath);
    this.totalTraceCount++;
    this.notify();

    return trace;
  }

  endTrace(traceId: string, response?: SpooshResponse<unknown, unknown>): void {
    const trace = this.activeTraces.get(traceId);

    if (!trace) return;

    trace.endTime = performance.now();
    trace.duration = trace.endTime - trace.startTime;
    trace.response = response;

    this.traces.push(trace);
    this.activeTraces.delete(traceId);
    this.trimOldestItems();
    this.notify();
  }

  discardTrace(traceId: string): void {
    this.activeTraces.delete(traceId);
    this.notify();
  }

  discardTracesByQueryKeys(queryKeys: string[]): void {
    const queryKeySet = new Set(queryKeys);

    for (const [traceId, trace] of this.activeTraces.entries()) {
      if (queryKeySet.has(trace.queryKey)) {
        const abortedResponse = {
          error: new Error("Aborted"),
          aborted: true,
        } as SpooshResponse<unknown, unknown>;

        trace.endTime = performance.now();
        trace.duration = trace.endTime - trace.startTime;
        trace.response = abortedResponse;

        this.traces.push(trace);
        this.activeTraces.delete(traceId);
      }
    }

    this.trimOldestItems();
    this.notify();
  }

  setTraceMeta(traceId: string, meta: Record<string, unknown>): void {
    const trace = this.getTrace(traceId);

    if (trace) {
      trace.meta = meta;
      this.notify();
    }
  }

  setTraceHeaders(traceId: string, headers: Record<string, string>): void {
    const trace = this.getTrace(traceId);

    if (trace) {
      trace.finalHeaders = headers;
      this.notify();
    }
  }

  setSensitiveHeaders(headers: Set<string>): void {
    this.sensitiveHeaders = headers;
  }

  getCurrentTrace(queryKey: string): OperationTrace | undefined {
    for (const trace of this.activeTraces.values()) {
      if (trace.queryKey === queryKey) {
        return trace;
      }
    }

    return undefined;
  }

  getTrace(traceId: string): OperationTrace | undefined {
    const completed = this.traces.toArray().find((t) => t.id === traceId);

    if (completed) return completed;

    for (const trace of this.activeTraces.values()) {
      if (trace.id === traceId) return trace;
    }

    return undefined;
  }

  getTraces(): OperationTrace[] {
    const completed = this.traces.toArray();
    const active = Array.from(this.activeTraces.values());

    return [...completed, ...active];
  }

  exportTraces(): ExportedItem[] {
    const traces = this.getTraces();
    const subscriptions = this.getSubscriptions();

    const exportedTraces: ExportedTrace[] = traces.map((trace) => {
      const request = sanitizeForExport({ ...trace.request }) as Record<
        string,
        unknown
      >;
      const rawHeaders =
        trace.finalHeaders ??
        (request.headers as Record<string, string> | undefined);

      if (rawHeaders && Object.keys(rawHeaders).length > 0) {
        const redacted: Record<string, string> = {};

        for (const [name, value] of Object.entries(rawHeaders)) {
          redacted[name] = this.sensitiveHeaders.has(name.toLowerCase())
            ? "••••••"
            : value;
        }

        request.headers = redacted;
      }

      return {
        type: "request" as const,
        id: trace.id,
        queryKey: trace.queryKey,
        operationType: trace.operationType,
        method: trace.method,
        path: trace.path,
        tags: trace.tags,
        timestamp: trace.timestamp,
        duration: trace.duration,
        request,
        response: sanitizeForExport(trace.response),
        meta: trace.meta,
        steps: trace.steps.map((step) => ({
          plugin: step.plugin,
          stage: step.stage,
          timestamp: step.timestamp,
          duration: step.duration,
          reason: step.reason,
          color: step.color,
          diff: step.diff
            ? {
                before: sanitizeForExport(step.diff.before),
                after: sanitizeForExport(step.diff.after),
                label: step.diff.label,
              }
            : undefined,
          info: step.info?.map((i) => ({
            label: i.label,
            value: sanitizeForExport(i.value),
          })),
        })),
      };
    });

    const exportedSSE: ExportedSSE[] = subscriptions.map((sub) => ({
      type: "sse" as const,
      id: sub.id,
      channel: sub.channel,
      queryKey: sub.queryKey,
      connectionUrl: sub.connectionUrl,
      status: sub.status,
      connectedAt: sub.connectedAt,
      disconnectedAt: sub.disconnectedAt,
      error: sub.error ? { message: sub.error.message } : undefined,
      retryCount: sub.retryCount,
      messageCount: sub.messageCount,
      lastMessageAt: sub.lastMessageAt,
      accumulatedData: sanitizeForExport(sub.accumulatedData) as Record<
        string,
        unknown
      >,
      messages: sub.messages.map((msg) => ({
        id: msg.id,
        eventType: msg.eventType,
        timestamp: msg.timestamp,
        rawData: sanitizeForExport(msg.rawData),
      })),
      steps: sub.steps.map((step) => ({
        plugin: step.plugin,
        stage: step.stage,
        timestamp: step.timestamp,
        duration: step.duration,
        reason: step.reason,
        color: step.color,
        diff: step.diff
          ? {
              before: sanitizeForExport(step.diff.before),
              after: sanitizeForExport(step.diff.after),
              label: step.diff.label,
            }
          : undefined,
        info: step.info?.map((i) => ({
          label: i.label,
          value: sanitizeForExport(i.value),
        })),
      })),
      timestamp: sub.timestamp,
      listenedEvents: sub.listenedEvents,
    }));

    return [...exportedTraces, ...exportedSSE].sort(
      (a, b) => a.timestamp - b.timestamp
    );
  }

  getFilteredTraces(searchQuery?: string): OperationTrace[] {
    let traces = this.getTraces();

    if (this.filters.operationTypes.size > 0) {
      traces = traces.filter((trace) =>
        this.filters.operationTypes.has(trace.operationType)
      );
    }

    if (searchQuery && searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      traces = traces.filter(
        (trace) =>
          trace.path.toLowerCase().includes(query) ||
          trace.queryKey.toLowerCase().includes(query) ||
          trace.method.toLowerCase().includes(query)
      );
    }

    return traces;
  }

  getActiveCount(): number {
    return this.activeTraces.size;
  }

  getTotalTraceCount(): number {
    return this.totalTraceCount;
  }

  getFilters(): DevToolFilters {
    return this.filters;
  }

  recordInvalidation(event: InvalidationEvent): void {
    this.invalidations.push(event);
    this.notifyDebounced();
  }

  addEvent(event: StandaloneEvent): void {
    this.events.push(event);
    this.notifyDebounced();
  }

  getEvents(): StandaloneEvent[] {
    return this.events.toArray();
  }

  getResolvedPath(queryKey: string): string | undefined {
    return this.resolvedPaths.get(queryKey);
  }

  setFilter<K extends keyof DevToolFilters>(
    key: K,
    value: DevToolFilters[K]
  ): void {
    this.filters[key] = value;
    this.notify();
  }

  getKnownPlugins(operationType?: string): string[] {
    if (!operationType) {
      return this.registeredPlugins.map((p) => p.name);
    }

    return this.registeredPlugins
      .filter((p) => p.operations.includes(operationType))
      .map((p) => p.name);
  }

  subscribe(callback: () => void): () => void {
    this.subscribers.add(callback);
    return () => this.subscribers.delete(callback);
  }

  private notify(): void {
    this.subscribers.forEach((cb) => cb());
  }

  private notifyDebounced(): void {
    if (this.stepNotifyPending) return;

    this.stepNotifyPending = true;

    if (this.stepNotifyTimeout) {
      clearTimeout(this.stepNotifyTimeout);
    }

    this.stepNotifyTimeout = setTimeout(() => {
      this.stepNotifyPending = false;
      this.stepNotifyTimeout = null;
      this.lastUpdateWasStepOnly = true;
      this.notify();
      this.lastUpdateWasStepOnly = false;
    }, STEP_NOTIFY_DEBOUNCE);
  }

  isStepUpdateOnly(): boolean {
    return this.lastUpdateWasStepOnly;
  }

  clear(): void {
    this.traces.clear();
    this.events.clear();
    this.subscriptions.clear();
    this.activeTraces.clear();

    const activeSubsToKeep = new Map<string, SubscriptionTrace>();

    for (const [id, sub] of this.activeSubscriptions.entries()) {
      if (sub.status === "connecting" || sub.status === "connected") {
        activeSubsToKeep.set(id, sub);
      }
    }

    this.activeSubscriptions.clear();

    for (const [id, sub] of activeSubsToKeep.entries()) {
      this.activeSubscriptions.set(id, sub);
    }

    for (const pending of this.pendingSubscriptions.values()) {
      clearTimeout(pending.timeout);
    }
    this.pendingSubscriptions.clear();

    this.invalidations = [];
    this.resolvedPaths.clear();
    this.totalTraceCount = activeSubsToKeep.size;
    this.notify();
  }

  importTraces(data: ExportedItem[], filename: string): void {
    this.importedSession = {
      filename,
      importedAt: Date.now(),
      items: data,
    };
    this.notify();
  }

  getImportedSession(): ImportedSession | null {
    return this.importedSession;
  }

  getFilteredImportedTraces(searchQuery?: string): ExportedItem[] {
    if (!this.importedSession) {
      return [];
    }

    let items = this.importedSession.items;

    if (searchQuery?.trim()) {
      const query = searchQuery.toLowerCase().trim();

      items = items.filter((item) => {
        if (item.type === "request") {
          return (
            item.path.toLowerCase().includes(query) ||
            item.method.toLowerCase().includes(query) ||
            item.queryKey.toLowerCase().includes(query)
          );
        }

        return (
          item.channel.toLowerCase().includes(query) ||
          item.queryKey.toLowerCase().includes(query)
        );
      });
    }

    return items;
  }

  clearImportedTraces(): void {
    this.importedSession = null;
    this.notify();
  }

  startSubscription(event: SubscriptionConnectEvent): SubscriptionTrace {
    const trace: SubscriptionTrace = {
      type: "subscription",
      id: event.subscriptionId,
      channel: event.channel,
      transport: event.transport,
      queryKey: event.queryKey,
      connectionUrl: event.connectionUrl,
      status: "connecting",
      retryCount: 0,
      messageCount: 0,
      accumulatedData: {},
      messages: [],
      steps: [],
      timestamp: event.timestamp,
      listenedEvents: event.listenedEvents,
    };

    // Delay adding to UI to avoid layout shift from ghost entries
    const timeout = setTimeout(() => {
      this.pendingSubscriptions.delete(trace.id);
      this.activeSubscriptions.set(trace.id, trace);
      this.totalTraceCount++;
      this.notify();
    }, 50);

    this.pendingSubscriptions.set(trace.id, { trace, timeout });

    return trace;
  }

  updateSubscriptionStatus(
    subscriptionId: string,
    status: SubscriptionTrace["status"],
    error?: Error
  ): void {
    // Check both active and pending subscriptions
    let trace = this.activeSubscriptions.get(subscriptionId);
    const pending = this.pendingSubscriptions.get(subscriptionId);

    if (pending) {
      trace = pending.trace;
    }

    if (!trace) return;

    trace.status = status;

    if (status === "connected") {
      trace.connectedAt = Date.now();
    }

    if (error) {
      trace.error = error;
    }

    // Only notify if subscription is already in activeSubscriptions
    if (this.activeSubscriptions.has(subscriptionId)) {
      this.notify();
    }
  }

  recordSubscriptionMessage(event: SubscriptionMessageEvent): void {
    // Check both active and pending subscriptions
    let trace = this.activeSubscriptions.get(event.subscriptionId);
    const pending = this.pendingSubscriptions.get(event.subscriptionId);

    if (pending) {
      trace = pending.trace;
    }

    if (!trace) return;

    const message: SubscriptionMessage = {
      id: event.messageId,
      eventType: event.eventType,
      timestamp: event.timestamp,
      rawData: event.rawData,
      accumulatedSnapshot: { ...trace.accumulatedData },
      previousSnapshot:
        trace.messageCount > 0 ? { ...trace.accumulatedData } : undefined,
    };

    trace.messages.push(message);
    trace.messageCount++;
    trace.lastMessageAt = event.timestamp;

    // Only notify if subscription is already in activeSubscriptions
    if (this.activeSubscriptions.has(event.subscriptionId)) {
      this.notify();
    }
  }

  updateSubscriptionAccumulatedData(
    queryKey: string,
    eventType: string,
    accumulatedData: Record<string, unknown>
  ): void {
    for (const trace of this.activeSubscriptions.values()) {
      if (trace.queryKey === queryKey) {
        trace.accumulatedData = { ...accumulatedData };

        const lastMessage = trace.messages[trace.messages.length - 1];

        if (lastMessage && lastMessage.eventType === eventType) {
          lastMessage.accumulatedSnapshot = { ...accumulatedData };
        }

        this.notify();
        return;
      }
    }

    for (const trace of this.subscriptions.toArray()) {
      if (trace.queryKey === queryKey) {
        trace.accumulatedData = { ...accumulatedData };

        const lastMessage = trace.messages[trace.messages.length - 1];

        if (lastMessage && lastMessage.eventType === eventType) {
          lastMessage.accumulatedSnapshot = { ...accumulatedData };
        }

        this.notify();
        return;
      }
    }
  }

  endSubscription(subscriptionId: string): void {
    // Check if subscription is still pending (not yet shown in UI)
    const pending = this.pendingSubscriptions.get(subscriptionId);

    if (pending) {
      const isGhostEntry =
        pending.trace.messageCount === 0 &&
        (pending.trace.status === "connecting" ||
          pending.trace.status === "connected");

      clearTimeout(pending.timeout);
      this.pendingSubscriptions.delete(subscriptionId);

      // If it has messages, add it to completed subscriptions
      if (!isGhostEntry) {
        pending.trace.status = "disconnected";
        pending.trace.disconnectedAt = Date.now();
        this.subscriptions.push(pending.trace);
        this.totalTraceCount++;
        this.trimOldestItems();
        this.notify();
      }

      return;
    }

    const trace = this.activeSubscriptions.get(subscriptionId);

    const isGhostEntry =
      trace?.messageCount === 0 &&
      (trace?.status === "connecting" || trace?.status === "connected");

    if (!trace) return;

    // Discard ghost entries from React StrictMode double-mounting
    // These are subscriptions that were disconnected before receiving any messages
    if (isGhostEntry) {
      this.activeSubscriptions.delete(subscriptionId);
      this.totalTraceCount--;
      this.notify();
      return;
    }

    trace.status = "disconnected";
    trace.disconnectedAt = Date.now();

    this.subscriptions.push(trace);
    this.activeSubscriptions.delete(subscriptionId);
    this.trimOldestItems();
    this.notify();
  }

  getSubscription(subscriptionId: string): SubscriptionTrace | undefined {
    const completed = this.subscriptions
      .toArray()
      .find((s) => s.id === subscriptionId);

    if (completed) return completed;

    const active = this.activeSubscriptions.get(subscriptionId);

    if (active) return active;

    const pending = this.pendingSubscriptions.get(subscriptionId);

    return pending?.trace;
  }

  getSubscriptions(): SubscriptionTrace[] {
    const completed = this.subscriptions.toArray();
    const active = Array.from(this.activeSubscriptions.values());

    return [...completed, ...active];
  }

  getFilteredSubscriptions(searchQuery?: string): SubscriptionTrace[] {
    let subs = this.getSubscriptions();

    if (searchQuery?.trim()) {
      const query = searchQuery.toLowerCase().trim();
      subs = subs.filter(
        (sub) =>
          sub.channel.toLowerCase().includes(query) ||
          sub.queryKey.toLowerCase().includes(query) ||
          sub.connectionUrl.toLowerCase().includes(query)
      );
    }

    return subs;
  }

  getAllTraces(searchQuery?: string): Trace[] {
    const traces = this.getFilteredTraces(searchQuery);
    const traceTypeFilter = this.filters.traceTypeFilter;
    const hasOpFilters = this.filters.operationTypes.size > 0;

    let allTraces: Trace[] = [];

    if (traceTypeFilter === "all" || traceTypeFilter === "http") {
      allTraces = [...allTraces, ...traces];
    }

    if (!hasOpFilters) {
      const subs = this.getFilteredSubscriptions(searchQuery);

      if (traceTypeFilter === "all" || traceTypeFilter === "sse") {
        const sseSubs = subs.filter((s) => s.transport === "sse");
        allTraces = [...allTraces, ...sseSubs];
      }

      // TODO: Add WS filtering back when WebSocket transport is implemented
      // if (traceTypeFilter === "all" || traceTypeFilter === "ws") {
      //   const wsSubs = subs.filter((s) => s.transport === "ws");
      //   allTraces = [...allTraces, ...wsSubs];
      // }
    }

    return allTraces.sort((a, b) => a.timestamp - b.timestamp);
  }
}
