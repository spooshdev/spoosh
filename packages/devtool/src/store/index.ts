import type { SpooshResponse, TraceEvent } from "@spoosh/core";

import type {
  OperationTrace,
  InvalidationEvent,
  DevToolFilters,
  DevToolStoreInterface,
  TraceContext,
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
  private activeTraces = new Map<string, OperationTrace>();
  private invalidations: InvalidationEvent[] = [];
  private subscribers = new Set<() => void>();
  private registeredPlugins: RegisteredPlugin[] = [];
  private filters: DevToolFilters = {
    operationTypes: new Set(["read", "write", "infiniteRead"]),
    showSkipped: true,
    showOnlyWithChanges: false,
  };

  constructor(config: DevToolStoreConfig) {
    this.traces = createRingBuffer<OperationTrace>(config.maxHistory);
  }

  setRegisteredPlugins(
    plugins: Array<{ name: string; operations: string[] }>
  ): void {
    this.registeredPlugins = plugins.filter(
      (p) => !p.name.startsWith("spoosh:devtool")
    );
  }

  startTrace(context: TraceContext): OperationTrace {
    const notifyFn = () => this.notify();

    const trace: OperationTrace = {
      id: crypto.randomUUID(),
      operationType: context.operationType,
      method: context.method,
      path: context.path,
      queryKey: context.queryKey,
      tags: context.tags,
      startTime: performance.now(),
      steps: [],
      response: undefined,

      addStep(event: TraceEvent, timestamp: number) {
        this.steps.push({
          traceId: this.id,
          plugin: event.plugin,
          stage: event.stage,
          timestamp,
          reason: event.meta?.reason,
          color: event.meta?.color,
          diff: event.meta?.diff,
          meta: event.meta,
        });
        notifyFn();
      },
    };

    this.activeTraces.set(context.queryKey, trace);
    this.notify();

    return trace;
  }

  endTrace(
    queryKey: string,
    response?: SpooshResponse<unknown, unknown>
  ): void {
    const trace = this.activeTraces.get(queryKey);

    if (!trace) return;

    trace.endTime = performance.now();
    trace.duration = trace.endTime - trace.startTime;
    trace.response = response;

    this.traces.push(trace);
    this.activeTraces.delete(queryKey);
    this.notify();
  }

  getCurrentTrace(queryKey: string): OperationTrace | undefined {
    return this.activeTraces.get(queryKey);
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

  getFilteredTraces(): OperationTrace[] {
    return this.getTraces().filter((trace) =>
      this.filters.operationTypes.has(trace.operationType)
    );
  }

  getFilters(): DevToolFilters {
    return this.filters;
  }

  recordInvalidation(event: InvalidationEvent): void {
    this.invalidations.push(event);
    this.notify();
  }

  recordLifecycle(
    phase: "onMount" | "onUpdate" | "onUnmount",
    context: TraceContext,
    prevContext?: TraceContext
  ): void {
    const trace = this.getCurrentTrace(context.queryKey);

    if (trace) {
      trace.addStep(
        {
          plugin: "lifecycle",
          stage: phase === "onUnmount" ? "after" : "before",
          meta: {
            reason: `Lifecycle: ${phase}`,
            ...(prevContext ? { prevQueryKey: prevContext.queryKey } : {}),
          },
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
    this.activeTraces.clear();
    this.invalidations = [];
    this.notify();
  }
}
