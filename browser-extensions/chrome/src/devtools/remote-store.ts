import type { StandaloneEvent } from "@spoosh/core";

import type {
  DevToolStoreInterface,
  DevToolFilters,
  OperationTrace,
  SubscriptionTrace,
  Trace,
  CacheEntryDisplay,
  ExportedItem,
  ImportedSession,
} from "@devtool/types";
import {
  PAGE_MESSAGE_SOURCE,
  EXTENSION_MESSAGE_SOURCE,
  type PageMessage,
  type FullSyncPayload,
  type SerializedOperationTrace,
  type SerializedSubscriptionTrace,
  type TraceStartedPayload,
  type TraceEndedPayload,
  type TraceDiscardedPayload,
  type TraceStepPayload,
  type SubscriptionStartedPayload,
  type SubscriptionUpdatedPayload,
  type SubscriptionMessagePayload,
  type SubscriptionEndedPayload,
  type EventAddedPayload,
  type CacheUpdatedPayload,
  type FiltersChangedPayload,
  type TracesImportedPayload,
} from "../shared/protocol";
import { CONNECTION_NAME } from "../shared/constants";

type SubscriberCallback = () => void;

export type ConnectionState = "not_detected" | "connecting" | "connected";

export class RemoteStore implements DevToolStoreInterface {
  private port: chrome.runtime.Port | null = null;
  private tabId: number;
  private subscribers = new Set<SubscriberCallback>();
  private isConnected = false;
  private connectionState: ConnectionState = "connecting";

  private traces: OperationTrace[] = [];
  private subscriptions: SubscriptionTrace[] = [];
  private events: StandaloneEvent[] = [];
  private cacheEntries: CacheEntryDisplay[] = [];
  private importedSession: ImportedSession | null = null;
  private filters: DevToolFilters = {
    operationTypes: new Set(),
    traceTypeFilter: "all",
    showSkipped: true,
    showOnlyWithChanges: false,
  };

  private knownPlugins: string[] = [];
  private totalTraceCount = 0;
  private activeCount = 0;
  private stepUpdateOnly = false;

  constructor(tabId: number) {
    this.tabId = tabId;
  }

  connect(): void {
    this.port = chrome.runtime.connect({ name: CONNECTION_NAME });

    this.port.onMessage.addListener((message: PageMessage) => {
      this.handleMessage(message);
    });

    this.port.onDisconnect.addListener(() => {
      this.port = null;
      this.reconnect();
    });

    this.port.postMessage({ type: "INIT", tabId: this.tabId });
    this.isConnected = true;
  }

  private reconnect(): void {
    try {
      this.port = chrome.runtime.connect({ name: CONNECTION_NAME });

      this.port.onMessage.addListener((message: PageMessage) => {
        this.handleMessage(message);
      });

      this.port.onDisconnect.addListener(() => {
        this.port = null;
        this.reconnect();
      });

      this.port.postMessage({ type: "INIT", tabId: this.tabId });
      this.isConnected = true;
    } catch {
      this.isConnected = false;
      this.connectionState = "not_detected";
      this.notify();
    }
  }

  disconnect(): void {
    this.port?.disconnect();
    this.port = null;
    this.isConnected = false;
  }

  get connected(): boolean {
    return this.isConnected;
  }

  get spooshDetected(): boolean {
    return this.connectionState === "connected";
  }

  get state(): ConnectionState {
    return this.connectionState;
  }

  private handleMessage(message: PageMessage): void {
    if (message?.source !== PAGE_MESSAGE_SOURCE) {
      return;
    }

    switch (message.type) {
      case "SPOOSH_DETECTED":
        this.connectionState = "connected";
        this.notify();
        this.requestFullSync();
        break;

      case "SPOOSH_NOT_DETECTED":
        this.connectionState = "not_detected";
        this.notify();
        break;

      case "FULL_SYNC":
        this.handleFullSync(message.payload as FullSyncPayload);
        break;

      case "TRACE_STARTED":
        this.handleTraceStarted(message.payload as TraceStartedPayload);
        break;

      case "TRACE_ENDED":
        this.handleTraceEnded(message.payload as TraceEndedPayload);
        break;

      case "TRACE_DISCARDED":
        this.handleTraceDiscarded(message.payload as TraceDiscardedPayload);
        break;

      case "TRACE_STEP":
        this.handleTraceStep(message.payload as TraceStepPayload);
        break;

      case "SUBSCRIPTION_STARTED":
        this.handleSubscriptionStarted(
          message.payload as SubscriptionStartedPayload
        );
        break;

      case "SUBSCRIPTION_UPDATED":
        this.handleSubscriptionUpdated(
          message.payload as SubscriptionUpdatedPayload
        );
        break;

      case "SUBSCRIPTION_MESSAGE":
        this.handleSubscriptionMessage(
          message.payload as SubscriptionMessagePayload
        );
        break;

      case "SUBSCRIPTION_ENDED":
        this.handleSubscriptionEnded(
          message.payload as SubscriptionEndedPayload
        );
        break;

      case "EVENT_ADDED":
        this.handleEventAdded(message.payload as EventAddedPayload);
        break;

      case "CACHE_UPDATED":
        this.handleCacheUpdated(message.payload as CacheUpdatedPayload);
        break;

      case "FILTERS_CHANGED":
        this.handleFiltersChanged(message.payload as FiltersChangedPayload);
        break;

      case "TRACES_CLEARED":
        this.handleTracesCleared();
        break;

      case "TRACES_IMPORTED":
        this.handleTracesImported(message.payload as TracesImportedPayload);
        break;
    }
  }

  private requestFullSync(): void {
    this.sendCommand({ type: "REQUEST_FULL_SYNC" });
  }

  private sendCommand(command: { type: string; payload?: unknown }): void {
    this.port?.postMessage({
      type: "COMMAND",
      source: EXTENSION_MESSAGE_SOURCE,
      commandType: command.type,
      commandPayload: command.payload,
    });
  }

  private handleFullSync(payload: FullSyncPayload): void {
    this.traces = payload.traces
      .filter((t): t is SerializedOperationTrace => t.type === "request")
      .map((t) => this.deserializeOperationTrace(t));
    this.subscriptions = payload.subscriptions.map((s) =>
      this.deserializeSubscriptionTrace(s)
    );
    this.events = payload.events;
    this.filters = {
      operationTypes: new Set(payload.filters.operationTypes),
      traceTypeFilter: payload.filters
        .traceTypeFilter as DevToolFilters["traceTypeFilter"],
      showSkipped: payload.filters.showSkipped,
      showOnlyWithChanges: payload.filters.showOnlyWithChanges,
    };
    this.knownPlugins = payload.knownPlugins;
    this.cacheEntries = payload.cacheEntries;
    this.importedSession = payload.importedSession;
    this.totalTraceCount = payload.totalTraceCount;
    this.activeCount = payload.activeCount;
    this.notify();
  }

  private handleTraceStarted(payload: TraceStartedPayload): void {
    const trace = this.deserializeOperationTrace(payload.trace);
    this.traces.push(trace);
    this.totalTraceCount++;
    this.activeCount++;
    this.notify();
  }

  private handleTraceEnded(payload: TraceEndedPayload): void {
    const trace = this.traces.find((t) => t.id === payload.traceId);

    if (trace) {
      trace.response = payload.response as typeof trace.response;
      trace.duration = payload.duration;
      trace.endTime = payload.endTime;
      trace.meta = payload.meta;
      trace.finalHeaders = payload.finalHeaders;
      this.activeCount = Math.max(0, this.activeCount - 1);
      this.notify();
    }
  }

  private handleTraceDiscarded(payload: TraceDiscardedPayload): void {
    const index = this.traces.findIndex((t) => t.id === payload.traceId);

    if (index !== -1) {
      this.traces.splice(index, 1);
      this.totalTraceCount = Math.max(0, this.totalTraceCount - 1);
      this.activeCount = Math.max(0, this.activeCount - 1);
      this.notify();
    }
  }

  private handleTraceStep(payload: TraceStepPayload): void {
    const trace = this.traces.find((t) => t.id === payload.traceId);

    if (trace) {
      trace.steps.push(payload.step);
      this.stepUpdateOnly = true;
      this.notify();
      this.stepUpdateOnly = false;
    }
  }

  private handleSubscriptionStarted(payload: SubscriptionStartedPayload): void {
    const subscription = this.deserializeSubscriptionTrace(
      payload.subscription
    );
    this.subscriptions.push(subscription);
    this.totalTraceCount++;
    this.notify();
  }

  private handleSubscriptionUpdated(payload: SubscriptionUpdatedPayload): void {
    const subscription = this.subscriptions.find(
      (s) => s.id === payload.subscriptionId
    );

    if (subscription) {
      subscription.status = payload.status;

      if (payload.error) {
        subscription.error = new Error(payload.error.message);
      }

      if (payload.connectedAt) {
        subscription.connectedAt = payload.connectedAt;
      }

      if (payload.disconnectedAt) {
        subscription.disconnectedAt = payload.disconnectedAt;
      }

      this.notify();
    }
  }

  private handleSubscriptionMessage(payload: SubscriptionMessagePayload): void {
    const subscription = this.subscriptions.find(
      (s) => s.id === payload.subscriptionId
    );

    if (subscription) {
      subscription.messages.push(payload.message);
      subscription.messageCount++;
      subscription.lastMessageAt = payload.message.timestamp;
      this.notify();
    }
  }

  private handleSubscriptionEnded(payload: SubscriptionEndedPayload): void {
    const subscription = this.subscriptions.find(
      (s) => s.id === payload.subscriptionId
    );

    if (subscription) {
      subscription.status = "disconnected";
      subscription.disconnectedAt = Date.now();
      this.notify();
    }
  }

  private handleEventAdded(payload: EventAddedPayload): void {
    this.events.push(payload.event);
    this.notify();
  }

  private handleCacheUpdated(payload: CacheUpdatedPayload): void {
    this.cacheEntries = payload.entries;
    this.notify();
  }

  private handleFiltersChanged(payload: FiltersChangedPayload): void {
    this.filters = {
      operationTypes: new Set(payload.filters.operationTypes),
      traceTypeFilter: payload.filters
        .traceTypeFilter as DevToolFilters["traceTypeFilter"],
      showSkipped: payload.filters.showSkipped,
      showOnlyWithChanges: payload.filters.showOnlyWithChanges,
    };
    this.notify();
  }

  private handleTracesCleared(): void {
    this.traces = [];
    this.subscriptions = [];
    this.events = [];
    this.totalTraceCount = 0;
    this.activeCount = 0;
    this.notify();
  }

  private handleTracesImported(payload: TracesImportedPayload): void {
    this.importedSession = payload.session;
    this.notify();
  }

  private deserializeOperationTrace(
    data: SerializedOperationTrace
  ): OperationTrace {
    const stubPluginAccessor = {
      get: () => undefined,
    };

    const trace: OperationTrace = {
      type: "request",
      id: data.id,
      queryKey: data.queryKey,
      operationType: data.operationType as OperationTrace["operationType"],
      method: data.method as OperationTrace["method"],
      path: data.path,
      tags: data.tags,
      request: data.request as OperationTrace["request"],
      startTime: data.startTime,
      timestamp: data.timestamp,
      requestTimestamp: data.requestTimestamp ?? data.startTime,
      endTime: data.endTime,
      duration: data.duration,
      steps: [...data.steps],
      response: data.response as OperationTrace["response"],
      meta: data.meta,
      finalHeaders: data.finalHeaders,
      temp: new Map(),
      stateManager: null as unknown as OperationTrace["stateManager"],
      eventEmitter: null as unknown as OperationTrace["eventEmitter"],
      plugins: stubPluginAccessor,
      addStep: (event, timestamp) => {
        trace.steps.push({
          traceId: trace.id,
          plugin: event.plugin,
          stage: event.stage,
          timestamp,
          reason: event.reason,
          color: event.color,
          diff: event.diff,
          info: event.info,
        });
        this.notify();
      },
    };

    return trace;
  }

  private deserializeSubscriptionTrace(
    data: SerializedSubscriptionTrace
  ): SubscriptionTrace {
    return {
      type: "subscription",
      id: data.id,
      channel: data.channel,
      transport: data.transport,
      queryKey: data.queryKey,
      connectionUrl: data.connectionUrl,
      status: data.status,
      connectedAt: data.connectedAt,
      disconnectedAt: data.disconnectedAt,
      error: data.error ? new Error(data.error.message) : undefined,
      retryCount: data.retryCount,
      messageCount: data.messageCount,
      lastMessageAt: data.lastMessageAt,
      accumulatedData: data.accumulatedData,
      messages: data.messages,
      steps: data.steps,
      timestamp: data.timestamp,
      listenedEvents: data.listenedEvents,
    };
  }

  private notify(): void {
    this.subscribers.forEach((cb) => cb());
  }

  subscribe(callback: SubscriberCallback): () => void {
    this.subscribers.add(callback);
    return () => this.subscribers.delete(callback);
  }

  startTrace(): OperationTrace {
    throw new Error("startTrace not supported in remote store");
  }

  endTrace(): void {
    throw new Error("endTrace not supported in remote store");
  }

  discardTrace(): void {
    throw new Error("discardTrace not supported in remote store");
  }

  discardTracesByQueryKeys(): void {
    throw new Error("discardTracesByQueryKeys not supported in remote store");
  }

  setTraceMeta(): void {
    throw new Error("setTraceMeta not supported in remote store");
  }

  setTraceHeaders(): void {
    throw new Error("setTraceHeaders not supported in remote store");
  }

  setSensitiveHeaders(): void {}

  getCurrentTrace(): OperationTrace | undefined {
    return undefined;
  }

  getTrace(traceId: string): OperationTrace | undefined {
    return this.traces.find((t) => t.id === traceId);
  }

  getTraces(): OperationTrace[] {
    return this.traces;
  }

  exportTraces(): ExportedItem[] {
    this.sendCommand({ type: "EXPORT_TRACES" });
    return [];
  }

  getFilteredTraces(searchQuery?: string): OperationTrace[] {
    let traces = this.traces;

    if (this.filters.operationTypes.size > 0) {
      traces = traces.filter((t) =>
        this.filters.operationTypes.has(t.operationType)
      );
    }

    if (searchQuery?.trim()) {
      const query = searchQuery.toLowerCase().trim();
      traces = traces.filter(
        (t) =>
          t.path.toLowerCase().includes(query) ||
          t.queryKey.toLowerCase().includes(query) ||
          t.method.toLowerCase().includes(query)
      );
    }

    return traces;
  }

  getActiveCount(): number {
    return this.activeCount;
  }

  getTotalTraceCount(): number {
    return this.totalTraceCount;
  }

  getFilters(): DevToolFilters {
    return this.filters;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  getKnownPlugins(_operationType?: string): string[] {
    return this.knownPlugins;
  }

  setRegisteredPlugins(): void {}

  setFilter<K extends keyof DevToolFilters>(
    key: K,
    value: DevToolFilters[K]
  ): void {
    this.filters[key] = value;

    const serializedValue =
      key === "operationTypes" && value instanceof Set
        ? Array.from(value)
        : value;

    this.sendCommand({
      type: "SET_FILTER",
      payload: { key, value: serializedValue },
    });
    this.notify();
  }

  recordInvalidation(): void {}

  addEvent(): void {}

  getEvents(): StandaloneEvent[] {
    return this.events;
  }

  getResolvedPath(): string | undefined {
    return undefined;
  }

  clear(): void {
    this.sendCommand({ type: "CLEAR_TRACES" });
    this.traces = [];
    this.subscriptions = [];
    this.events = [];
    this.totalTraceCount = 0;
    this.activeCount = 0;
    this.notify();
  }

  setStateManager(): void {}

  getCacheEntries(searchQuery?: string): CacheEntryDisplay[] {
    if (!searchQuery?.trim()) {
      return this.cacheEntries;
    }

    const query = searchQuery.toLowerCase().trim();

    return this.cacheEntries.filter((e) =>
      e.queryKey.toLowerCase().includes(query)
    );
  }

  refetchStateEntry(key: string): void {
    this.sendCommand({ type: "REFETCH_STATE_ENTRY", payload: { key } });
  }

  deleteCacheEntry(key: string): void {
    this.sendCommand({ type: "DELETE_CACHE_ENTRY", payload: { key } });
    this.cacheEntries = this.cacheEntries.filter((e) => e.queryKey !== key);
    this.notify();
  }

  clearAllCache(): void {
    this.sendCommand({ type: "CLEAR_ALL_CACHE" });
    this.cacheEntries = [];
    this.notify();
  }

  importTraces(data: ExportedItem[], filename: string): void {
    this.importedSession = {
      filename,
      items: data,
      importedAt: Date.now(),
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

  isStepUpdateOnly(): boolean {
    return this.stepUpdateOnly;
  }

  startSubscription(): SubscriptionTrace {
    throw new Error("startSubscription not supported in remote store");
  }

  updateSubscriptionStatus(): void {
    throw new Error("updateSubscriptionStatus not supported in remote store");
  }

  recordSubscriptionMessage(): void {
    throw new Error("recordSubscriptionMessage not supported in remote store");
  }

  updateSubscriptionAccumulatedData(): void {
    throw new Error(
      "updateSubscriptionAccumulatedData not supported in remote store"
    );
  }

  endSubscription(): void {
    throw new Error("endSubscription not supported in remote store");
  }

  getSubscription(subscriptionId: string): SubscriptionTrace | undefined {
    return this.subscriptions.find((s) => s.id === subscriptionId);
  }

  getSubscriptions(): SubscriptionTrace[] {
    return this.subscriptions;
  }

  getFilteredSubscriptions(searchQuery?: string): SubscriptionTrace[] {
    let subs = this.subscriptions;

    if (searchQuery?.trim()) {
      const query = searchQuery.toLowerCase().trim();
      subs = subs.filter(
        (s) =>
          s.channel.toLowerCase().includes(query) ||
          s.queryKey.toLowerCase().includes(query) ||
          s.connectionUrl.toLowerCase().includes(query)
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
    }

    return allTraces.sort((a, b) => a.timestamp - b.timestamp);
  }
}
