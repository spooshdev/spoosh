import type { StandaloneEvent } from "@spoosh/core";

import type { DevToolStore } from "./store";
import type {
  OperationTrace,
  SubscriptionTrace,
  DevToolFilters,
  CacheEntryDisplay,
  ExportedItem,
  PluginStepEvent,
} from "./types";

const PAGE_MESSAGE_SOURCE = "spoosh-devtools-page";
const EXTENSION_MESSAGE_SOURCE = "spoosh-devtools-extension";

interface SerializedOperationTrace {
  type: "request";
  id: string;
  queryKey: string;
  operationType: string;
  method: string;
  path: string;
  tags: string[];
  request: unknown;
  startTime: number;
  timestamp: number;
  requestTimestamp: number;
  endTime?: number;
  duration?: number;
  steps: PluginStepEvent[];
  response?: unknown;
  meta?: Record<string, unknown>;
  finalHeaders?: Record<string, string>;
}

interface SerializedSubscriptionTrace {
  type: "subscription";
  id: string;
  channel: string;
  transport: string;
  queryKey: string;
  connectionUrl: string;
  status: "connecting" | "connected" | "disconnected" | "error";
  connectedAt?: number;
  disconnectedAt?: number;
  error?: { message: string; name: string };
  retryCount: number;
  messageCount: number;
  lastMessageAt?: number;
  accumulatedData: Record<string, unknown>;
  messages: Array<{
    id: string;
    eventType: string;
    timestamp: number;
    rawData: unknown;
    accumulatedSnapshot: unknown;
    previousSnapshot?: unknown;
  }>;
  steps: PluginStepEvent[];
  timestamp: number;
  listenedEvents?: string[];
}

type SerializedTrace = SerializedOperationTrace | SerializedSubscriptionTrace;

interface FullSyncPayload {
  traces: SerializedTrace[];
  events: StandaloneEvent[];
  subscriptions: SerializedSubscriptionTrace[];
  filters: {
    operationTypes: string[];
    traceTypeFilter: string;
    showSkipped: boolean;
    showOnlyWithChanges: boolean;
  };
  knownPlugins: string[];
  cacheEntries: CacheEntryDisplay[];
  importedSession: ReturnType<DevToolStore["getImportedSession"]>;
  totalTraceCount: number;
  activeCount: number;
}

interface ExtensionCommand {
  source: typeof EXTENSION_MESSAGE_SOURCE;
  type: string;
  payload?: unknown;
}

export class ExtensionBridge {
  private store: DevToolStore;
  private unsubscribe: (() => void) | null = null;
  private isEnabled = false;
  private pendingTraceIds = new Set<string>();
  private pendingSubscriptionIds = new Set<string>();
  private lastTraceStepCounts = new Map<string, number>();
  private lastSubscriptionStates = new Map<
    string,
    {
      status: SubscriptionTrace["status"];
      messageCount: number;
      accumulatedData: Record<string, unknown>;
    }
  >();
  private lastCacheEntriesHash = "";

  constructor(store: DevToolStore) {
    this.store = store;
  }

  init(): void {
    if (typeof window === "undefined") return;

    window.__SPOOSH_DEVTOOLS_HOOK__ = {
      version: "1.0.0",
      sendCommand: (command: unknown) =>
        this.handleCommand(command as ExtensionCommand),
    };

    window.addEventListener("message", (event) => {
      if (event.source !== window) return;

      const data = event.data as ExtensionCommand;

      if (data?.source !== EXTENSION_MESSAGE_SOURCE) return;

      this.handleCommand(data);
    });

    this.isEnabled = true;
    this.setupStoreSubscription();
  }

  private setupStoreSubscription(): void {
    this.unsubscribe = this.store.subscribe(() => {
      this.syncIncrementalChanges();
    });
  }

  private syncIncrementalChanges(): void {
    if (!this.isEnabled) return;

    const traces = this.store.getTraces();
    const subscriptions = this.store.getSubscriptions();
    const currentTraceIds = new Set(traces.map((t) => t.id));

    for (const pendingId of this.pendingTraceIds) {
      if (!currentTraceIds.has(pendingId)) {
        this.sendMessage("TRACE_DISCARDED", { traceId: pendingId });
        this.pendingTraceIds.delete(pendingId);
        this.lastTraceStepCounts.delete(pendingId);
      }
    }

    for (const trace of traces) {
      const isNew = !this.pendingTraceIds.has(trace.id);

      if (isNew) {
        this.pendingTraceIds.add(trace.id);
        this.lastTraceStepCounts.set(trace.id, trace.steps.length);
        this.sendMessage("TRACE_STARTED", {
          trace: this.serializeOperationTrace(trace),
        });
      } else {
        const lastStepCount = this.lastTraceStepCounts.get(trace.id) ?? 0;

        if (trace.steps.length > lastStepCount) {
          for (let i = lastStepCount; i < trace.steps.length; i++) {
            this.sendMessage("TRACE_STEP", {
              traceId: trace.id,
              step: trace.steps[i],
            });
          }

          this.lastTraceStepCounts.set(trace.id, trace.steps.length);
        }
      }

      if (trace.duration !== undefined) {
        this.sendMessage("TRACE_ENDED", {
          traceId: trace.id,
          response: trace.response,
          duration: trace.duration,
          endTime: trace.endTime,
          meta: trace.meta,
          finalHeaders: trace.finalHeaders,
        });
      }
    }

    for (const sub of subscriptions) {
      const isNew = !this.pendingSubscriptionIds.has(sub.id);

      if (isNew) {
        this.pendingSubscriptionIds.add(sub.id);
        this.lastSubscriptionStates.set(sub.id, {
          status: sub.status,
          messageCount: sub.messageCount,
          accumulatedData: { ...sub.accumulatedData },
        });
        this.sendMessage("SUBSCRIPTION_STARTED", {
          subscription: this.serializeSubscriptionTrace(sub),
        });
      } else {
        const lastState = this.lastSubscriptionStates.get(sub.id);

        if (lastState) {
          if (lastState.status !== sub.status) {
            this.sendMessage("SUBSCRIPTION_UPDATED", {
              subscriptionId: sub.id,
              status: sub.status,
              error: sub.error
                ? { message: sub.error.message, name: sub.error.name }
                : undefined,
              connectedAt: sub.connectedAt,
              disconnectedAt: sub.disconnectedAt,
            });
            lastState.status = sub.status;
          }

          if (sub.messageCount > lastState.messageCount) {
            for (let i = lastState.messageCount; i < sub.messageCount; i++) {
              const msg = sub.messages[i];

              if (msg) {
                this.sendMessage("SUBSCRIPTION_MESSAGE", {
                  subscriptionId: sub.id,
                  message: {
                    id: msg.id,
                    eventType: msg.eventType,
                    timestamp: msg.timestamp,
                    rawData: msg.rawData,
                    accumulatedSnapshot: msg.accumulatedSnapshot,
                    previousSnapshot: msg.previousSnapshot,
                  },
                });
              }
            }

            lastState.messageCount = sub.messageCount;
            lastState.accumulatedData = { ...sub.accumulatedData };
          }
        }
      }
    }

    this.syncCacheEntries();

    this.sendMessage("COUNT_UPDATED", {
      totalTraceCount: this.store.getTotalTraceCount(),
    });
  }

  private syncCacheEntries(): void {
    const entries = this.store.getCacheEntries();
    const hash = this.computeCacheHash(entries);

    if (hash !== this.lastCacheEntriesHash) {
      this.lastCacheEntriesHash = hash;
      this.sendMessage("CACHE_UPDATED", { entries });
    }
  }

  private computeCacheHash(entries: CacheEntryDisplay[]): string {
    return entries
      .map(
        (e) =>
          `${e.queryKey}:${e.entry.state.timestamp ?? 0}:${e.entry.stale}:${e.subscriberCount}`
      )
      .join("|");
  }

  private handleCommand(command: ExtensionCommand): void {
    if (command?.source !== EXTENSION_MESSAGE_SOURCE) return;

    switch (command.type) {
      case "REQUEST_FULL_SYNC":
        this.sendFullSync();
        break;

      case "CLEAR_TRACES":
        this.store.clear();
        this.pendingTraceIds.clear();
        this.pendingSubscriptionIds.clear();
        this.lastTraceStepCounts.clear();
        this.lastSubscriptionStates.clear();
        this.lastCacheEntriesHash = "";
        this.sendMessage("TRACES_CLEARED", undefined);
        break;

      case "EXPORT_TRACES":
        this.handleExportTraces();
        break;

      case "REFETCH_STATE_ENTRY": {
        const refetchPayload = command.payload as { key: string };
        this.store.refetchStateEntry(refetchPayload.key);
        this.sendCacheUpdate();
        break;
      }

      case "DELETE_CACHE_ENTRY": {
        const deletePayload = command.payload as { key: string };
        this.store.deleteCacheEntry(deletePayload.key);
        this.sendCacheUpdate();
        break;
      }

      case "CLEAR_ALL_CACHE":
        this.store.clearAllCache();
        this.sendCacheUpdate();
        break;

      case "IMPORT_TRACES": {
        const importPayload = command.payload as {
          data: ExportedItem[];
          filename: string;
        };
        this.store.importTraces(importPayload.data, importPayload.filename);
        this.sendMessage("TRACES_IMPORTED", {
          session: this.store.getImportedSession(),
        });
        break;
      }

      case "SET_MAX_HISTORY": {
        const historyPayload = command.payload as { value: number };
        this.store.setMaxHistory(historyPayload.value);
        break;
      }

      case "SET_FILTER": {
        const filterPayload = command.payload as {
          key: keyof DevToolFilters;
          value: unknown;
        };
        this.store.setFilter(
          filterPayload.key,
          filterPayload.value as DevToolFilters[keyof DevToolFilters]
        );
        this.sendMessage("FILTERS_CHANGED", {
          filters: this.serializeFilters(this.store.getFilters()),
        });
        break;
      }
    }
  }

  private sendFullSync(): void {
    const traces = this.store.getTraces();
    const subscriptions = this.store.getSubscriptions();
    const events = this.store.getEvents();
    const filters = this.store.getFilters();
    const cacheEntries = this.store.getCacheEntries();

    this.pendingTraceIds.clear();
    this.pendingSubscriptionIds.clear();
    this.lastTraceStepCounts.clear();
    this.lastSubscriptionStates.clear();
    this.lastCacheEntriesHash = this.computeCacheHash(cacheEntries);

    for (const trace of traces) {
      this.pendingTraceIds.add(trace.id);
      this.lastTraceStepCounts.set(trace.id, trace.steps.length);
    }

    for (const sub of subscriptions) {
      this.pendingSubscriptionIds.add(sub.id);
      this.lastSubscriptionStates.set(sub.id, {
        status: sub.status,
        messageCount: sub.messageCount,
        accumulatedData: { ...sub.accumulatedData },
      });
    }

    const payload: FullSyncPayload = {
      traces: traces.map((t) => this.serializeOperationTrace(t)),
      events,
      subscriptions: subscriptions.map((s) =>
        this.serializeSubscriptionTrace(s)
      ),
      filters: this.serializeFilters(filters),
      knownPlugins: this.store.getKnownPlugins(),
      cacheEntries,
      importedSession: this.store.getImportedSession(),
      totalTraceCount: this.store.getTotalTraceCount(),
      activeCount: this.store.getActiveCount(),
    };

    this.sendMessage("FULL_SYNC", payload);
  }

  private handleExportTraces(): void {
    const exportData = this.store.exportTraces();

    if (exportData.length === 0) return;

    const json = JSON.stringify(exportData, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const filename = `spoosh-traces-${timestamp}.json`;

    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();

    URL.revokeObjectURL(url);
  }

  private sendCacheUpdate(): void {
    this.sendMessage("CACHE_UPDATED", {
      entries: this.store.getCacheEntries(),
    });
  }

  private serializeOperationTrace(
    trace: OperationTrace
  ): SerializedOperationTrace {
    let serializedRequest: unknown = trace.request;

    if (trace.request && typeof trace.request === "object") {
      const req = trace.request as Record<string, unknown>;
      serializedRequest = { ...req };

      if (req.headers instanceof Headers) {
        (serializedRequest as Record<string, unknown>).headers =
          Object.fromEntries(req.headers.entries());
      }
    }

    return {
      type: "request",
      id: trace.id,
      queryKey: trace.queryKey,
      operationType: trace.operationType,
      method: trace.method,
      path: trace.path,
      tags: trace.tags,
      request: serializedRequest,
      startTime: trace.startTime,
      timestamp: trace.timestamp,
      requestTimestamp: trace.requestTimestamp,
      endTime: trace.endTime,
      duration: trace.duration,
      steps: [...trace.steps],
      response: trace.response,
      meta: trace.meta,
      finalHeaders: trace.finalHeaders,
    };
  }

  private serializeSubscriptionTrace(
    sub: SubscriptionTrace
  ): SerializedSubscriptionTrace {
    return {
      type: "subscription",
      id: sub.id,
      channel: sub.channel,
      transport: sub.transport,
      queryKey: sub.queryKey,
      connectionUrl: sub.connectionUrl,
      status: sub.status,
      connectedAt: sub.connectedAt,
      disconnectedAt: sub.disconnectedAt,
      error: sub.error
        ? { message: sub.error.message, name: sub.error.name }
        : undefined,
      retryCount: sub.retryCount,
      messageCount: sub.messageCount,
      lastMessageAt: sub.lastMessageAt,
      accumulatedData: { ...sub.accumulatedData },
      messages: sub.messages.map((m) => ({
        id: m.id,
        eventType: m.eventType,
        timestamp: m.timestamp,
        rawData: m.rawData,
        accumulatedSnapshot: m.accumulatedSnapshot,
        previousSnapshot: m.previousSnapshot,
      })),
      steps: [...sub.steps],
      timestamp: sub.timestamp,
      listenedEvents: sub.listenedEvents,
    };
  }

  private serializeFilters(
    filters: DevToolFilters
  ): FullSyncPayload["filters"] {
    return {
      operationTypes: Array.from(filters.operationTypes),
      traceTypeFilter: filters.traceTypeFilter,
      showSkipped: filters.showSkipped,
      showOnlyWithChanges: filters.showOnlyWithChanges,
    };
  }

  private safeClone<T>(obj: T): T {
    try {
      return JSON.parse(JSON.stringify(obj));
    } catch {
      console.warn(
        "[Spoosh DevTools] Failed to serialize object for extension:",
        obj
      );
      return {} as T;
    }
  }

  private sendMessage(type: string, payload: unknown): void {
    const safePayload = this.safeClone(payload);

    window.postMessage(
      {
        source: PAGE_MESSAGE_SOURCE,
        type,
        payload: safePayload,
      },
      "*"
    );
  }

  destroy(): void {
    this.unsubscribe?.();
    this.unsubscribe = null;
    this.isEnabled = false;

    if (typeof window !== "undefined") {
      delete window.__SPOOSH_DEVTOOLS_HOOK__;
    }
  }
}

declare global {
  interface Window {
    __SPOOSH_DEVTOOLS_HOOK__?: {
      version: string;
      sendCommand: (command: unknown) => void;
    };
  }
}
