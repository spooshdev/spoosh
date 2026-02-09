import type {
  SpooshResponse,
  TraceEvent,
  PluginContext,
  StandaloneEvent,
} from "@spoosh/core";

import type {
  OperationTrace,
  InvalidationEvent,
  DevToolFilters,
  DevToolStoreInterface,
} from "../types";
import { createRingBuffer } from "./history";

export interface DevToolStoreConfig {
  maxHistory: number;
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

  constructor(config: DevToolStoreConfig) {
    this.traces = createRingBuffer<OperationTrace>(config.maxHistory);
    this.events = createRingBuffer<StandaloneEvent>(config.maxHistory * 2);
  }

  setRegisteredPlugins(
    plugins: Array<{ name: string; operations: string[] }>
  ): void {
    this.registeredPlugins = plugins.filter(
      (p) => !p.name.startsWith("spoosh:devtool")
    );
  }

  startTrace(context: PluginContext, resolvedPath: string): OperationTrace {
    const notifyFn = () => this.notify();

    const trace: OperationTrace = {
      ...context,
      id: crypto.randomUUID(),
      path: resolvedPath,
      startTime: performance.now(),
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
