import type {
  OperationTrace,
  SubscriptionTrace,
  InvalidationEvent,
  DevToolFilters,
  CacheEntryDisplay,
  ExportedItem,
  ImportedSession,
  PluginStepEvent,
} from "@devtool/types";
import type { StandaloneEvent } from "@spoosh/core";

export const EXTENSION_ID = "spoosh-devtools";
export const PAGE_MESSAGE_SOURCE = "spoosh-devtools-page";
export const EXTENSION_MESSAGE_SOURCE = "spoosh-devtools-extension";

export interface SerializedOperationTrace {
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

export interface SerializedSubscriptionTrace {
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

export type SerializedTrace =
  | SerializedOperationTrace
  | SerializedSubscriptionTrace;

export interface FullSyncPayload {
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
  importedSession: ImportedSession | null;
  totalTraceCount: number;
  activeCount: number;
}

export type PageMessageType =
  | "SPOOSH_DETECTED"
  | "SPOOSH_NOT_DETECTED"
  | "FULL_SYNC"
  | "TRACE_STARTED"
  | "TRACE_ENDED"
  | "TRACE_STEP"
  | "SUBSCRIPTION_STARTED"
  | "SUBSCRIPTION_UPDATED"
  | "SUBSCRIPTION_MESSAGE"
  | "SUBSCRIPTION_ENDED"
  | "EVENT_ADDED"
  | "INVALIDATION"
  | "CACHE_UPDATED"
  | "FILTERS_CHANGED"
  | "TRACES_CLEARED"
  | "TRACES_IMPORTED";

export interface PageMessage {
  source: typeof PAGE_MESSAGE_SOURCE;
  type: PageMessageType;
  payload?: unknown;
}

export interface SpooshDetectedPayload {
  version?: string;
}

export interface TraceStartedPayload {
  trace: SerializedOperationTrace;
}

export interface TraceEndedPayload {
  traceId: string;
  response?: unknown;
  duration?: number;
  endTime?: number;
  meta?: Record<string, unknown>;
  finalHeaders?: Record<string, string>;
}

export interface TraceStepPayload {
  traceId: string;
  step: PluginStepEvent;
}

export interface SubscriptionStartedPayload {
  subscription: SerializedSubscriptionTrace;
}

export interface SubscriptionUpdatedPayload {
  subscriptionId: string;
  status: SerializedSubscriptionTrace["status"];
  error?: { message: string; name: string };
  connectedAt?: number;
  disconnectedAt?: number;
}

export interface SubscriptionMessagePayload {
  subscriptionId: string;
  message: SerializedSubscriptionTrace["messages"][number];
}

export interface SubscriptionEndedPayload {
  subscriptionId: string;
}

export interface EventAddedPayload {
  event: StandaloneEvent;
}

export interface InvalidationPayload {
  event: InvalidationEvent;
}

export interface CacheUpdatedPayload {
  entries: CacheEntryDisplay[];
}

export interface FiltersChangedPayload {
  filters: {
    operationTypes: string[];
    traceTypeFilter: string;
    showSkipped: boolean;
    showOnlyWithChanges: boolean;
  };
}

export interface TracesImportedPayload {
  session: ImportedSession;
}

export type ExtensionCommandType =
  | "REQUEST_FULL_SYNC"
  | "REQUEST_DETECTION"
  | "CLEAR_TRACES"
  | "EXPORT_TRACES"
  | "REFETCH_STATE_ENTRY"
  | "DELETE_CACHE_ENTRY"
  | "CLEAR_ALL_CACHE"
  | "IMPORT_TRACES"
  | "SET_MAX_HISTORY"
  | "SET_FILTER";

export interface ExtensionCommand {
  source: typeof EXTENSION_MESSAGE_SOURCE;
  type: ExtensionCommandType;
  payload?: unknown;
}

export interface RefetchStateEntryPayload {
  key: string;
}

export interface DeleteCacheEntryPayload {
  key: string;
}

export interface ImportTracesPayload {
  data: ExportedItem[];
  filename: string;
}

export interface SetMaxHistoryPayload {
  value: number;
}

export interface SetFilterPayload {
  key: string;
  value: unknown;
}

export function serializeTrace(
  trace: OperationTrace
): SerializedOperationTrace {
  return {
    type: "request",
    id: trace.id,
    queryKey: trace.queryKey,
    operationType: trace.operationType,
    method: trace.method,
    path: trace.path,
    tags: trace.tags,
    request: trace.request,
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

export function serializeSubscription(
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

export function serializeFilters(
  filters: DevToolFilters
): FiltersChangedPayload["filters"] {
  return {
    operationTypes: Array.from(filters.operationTypes),
    traceTypeFilter: filters.traceTypeFilter,
    showSkipped: filters.showSkipped,
    showOnlyWithChanges: filters.showOnlyWithChanges,
  };
}
