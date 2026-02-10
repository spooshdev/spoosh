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
  InvalidationEvent,
  DevToolFilters,
  DevToolStoreInterface,
} from "../types";
import { createRingBuffer } from "./history";

export interface DevToolStoreConfig {
  maxHistory: number;
  stateManager?: StateManager;
}

interface RegisteredPlugin {
  name: string;
  operations: string[];
}

export class DevToolStore implements DevToolStoreInterface {
  private traces = createRingBuffer<OperationTrace>(50);
  private events = createRingBuffer<StandaloneEvent>(100);
  private activeTraces = new Map<string, OperationTrace>();
  private invalidations: InvalidationEvent[] = [];
  private subscribers = new Set<() => void>();
  private registeredPlugins: RegisteredPlugin[] = [];
  private filters: DevToolFilters = {
    operationTypes: new Set(),
    showSkipped: true,
    showOnlyWithChanges: false,
  };

  private stateManager: StateManager | undefined;
  private eventEmitter: EventEmitter | undefined;

  constructor(config: DevToolStoreConfig) {
    this.traces = createRingBuffer<OperationTrace>(config.maxHistory);
    this.events = createRingBuffer<StandaloneEvent>(config.maxHistory * 2);
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
      }));
  }

  invalidateCacheEntry(key: string): void {
    if (!this.stateManager) return;

    const entry = this.stateManager.getCache(key);

    if (entry) {
      this.stateManager.setCache(key, { stale: true });

      if (this.eventEmitter) {
        const tags = entry.selfTag
          ? [...new Set([entry.selfTag, ...entry.tags])]
          : entry.tags;

        if (tags.length > 0) {
          this.eventEmitter.emit("invalidate", tags);
        }
      }
    }

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

    const notifyFn = () => this.notify();

    const trace: OperationTrace = {
      ...context,
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
    this.notify();
  }

  discardTrace(traceId: string): void {
    this.activeTraces.delete(traceId);
    this.notify();
  }

  setTraceMeta(traceId: string, meta: Record<string, unknown>): void {
    const trace = this.getTrace(traceId);

    if (trace) {
      trace.meta = meta;
      this.notify();
    }
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

  getFilters(): DevToolFilters {
    return this.filters;
  }

  recordInvalidation(event: InvalidationEvent): void {
    this.invalidations.push(event);
    this.notify();
  }

  addEvent(event: StandaloneEvent): void {
    this.events.push(event);
    this.notify();
  }

  getEvents(): StandaloneEvent[] {
    return this.events.toArray();
  }

  recordLifecycle(
    phase: "onMount" | "onUpdate" | "onUnmount",
    context: PluginContext,
    prevContext?: PluginContext
  ): void {
    const trace = this.getCurrentTrace(context.queryKey);

    if (trace) {
      const reason =
        phase === "onUpdate" && prevContext
          ? `Lifecycle: ${phase} (from ${prevContext.queryKey})`
          : `Lifecycle: ${phase}`;

      trace.addStep(
        {
          plugin: "lifecycle",
          stage: "log",
          reason,
        },
        performance.now()
      );
    }
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

  clear(): void {
    this.traces.clear();
    this.events.clear();
    this.activeTraces.clear();
    this.invalidations = [];
    this.notify();
  }
}
