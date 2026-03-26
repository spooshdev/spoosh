import type {
  CacheEntry,
  OperationType,
  SpooshResponse,
  StateManager,
  TraceEvent,
  TraceStage,
  TraceColor,
  PluginContext,
  StandaloneEvent,
  DevtoolEvents,
  SubscriptionConnectEvent,
  SubscriptionMessageEvent,
} from "@spoosh/core";

export type {
  DevtoolEvents,
  SubscriptionConnectEvent,
  SubscriptionMessageEvent,
};

export interface DevToolConfig {
  /** Enable or disable the devtool. Defaults to true. */
  enabled?: boolean;

  /** Header names to redact in devtool UI and exports. Case-insensitive. Defaults to common auth headers. */
  sensitiveHeaders?: string[];
}

export interface DevToolTheme {
  colors: {
    background: string;
    surface: string;
    text: string;
    textMuted: string;
    border: string;
    primary: string;
    success: string;
    warning: string;
    error: string;
  };

  fonts: {
    mono: string;
  };
}

export interface DiffLine {
  type: "unchanged" | "added" | "removed";
  content: string;
}

/**
 * Plugin step event stored in trace history.
 * Derived from TraceEvent emitted by plugins.
 */
export interface TraceInfo {
  label?: string;

  value: unknown;
}

export interface PluginStepEvent {
  traceId: string;
  plugin: string;
  stage: TraceStage;
  timestamp: number;
  duration?: number;
  reason?: string;
  color?: TraceColor;
  diff?: { before: unknown; after: unknown; label?: string };
  info?: TraceInfo[];
}

export interface OperationTrace extends PluginContext {
  type: "request";
  id: string;
  path: string;
  startTime: number;
  timestamp: number;
  endTime?: number;
  duration?: number;
  steps: PluginStepEvent[];
  response?: SpooshResponse<unknown, unknown>;
  meta?: Record<string, unknown>;
  finalHeaders?: Record<string, string>;

  addStep(event: TraceEvent, timestamp: number): void;
}

/** Individual message received in a subscription */
export interface SubscriptionMessage {
  id: string;
  eventType: string;
  timestamp: number;
  rawData: unknown;
  accumulatedSnapshot: unknown;
  previousSnapshot?: unknown;
}

/** Subscription lifecycle trace */
export interface SubscriptionTrace {
  type: "subscription";
  id: string;
  channel: string;
  transport: string;
  queryKey: string;
  connectionUrl: string;
  status: "connecting" | "connected" | "disconnected" | "error";
  connectedAt?: number;
  disconnectedAt?: number;
  error?: Error;
  retryCount: number;
  messageCount: number;
  lastMessageAt?: number;
  accumulatedData: Record<string, unknown>;
  messages: SubscriptionMessage[];
  steps: PluginStepEvent[];
  timestamp: number;

  /** Event types being listened to. Empty or ["*"] means all events. */
  listenedEvents?: string[];
}

/** Unified trace type - either a request or subscription */
export type Trace = OperationTrace | SubscriptionTrace;

/** Type filter for traces */
// TODO: Add "ws" back when WebSocket transport is implemented
export type TraceTypeFilter = "all" | "http" | "sse";

export interface InvalidationEvent {
  tags: string[];
  affectedKeys: Array<{ key: string; count: number }>;
  totalListeners: number;
  timestamp: number;
}

export interface DevToolFilters {
  operationTypes: Set<OperationType>;
  traceTypeFilter: TraceTypeFilter;
  showSkipped: boolean;
  showOnlyWithChanges: boolean;
}

export interface DevToolApi {
  exportTraces(): ExportedItem[];
  clearTraces(): void;
}

export interface DevToolInstanceApi {
  devtools: DevToolApi;
}

export interface DevToolStoreInterface {
  startTrace(context: PluginContext, resolvedPath: string): OperationTrace;
  endTrace(traceId: string, response?: SpooshResponse<unknown, unknown>): void;
  discardTrace(traceId: string): void;
  discardTracesByQueryKeys(queryKeys: string[]): void;
  setTraceMeta(traceId: string, meta: Record<string, unknown>): void;
  setTraceHeaders(traceId: string, headers: Record<string, string>): void;
  setSensitiveHeaders(headers: Set<string>): void;
  getCurrentTrace(queryKey: string): OperationTrace | undefined;
  getTrace(traceId: string): OperationTrace | undefined;
  getTraces(): OperationTrace[];
  exportTraces(): ExportedItem[];
  getFilteredTraces(searchQuery?: string): OperationTrace[];
  getActiveCount(): number;
  getTotalTraceCount(): number;
  getFilters(): DevToolFilters;
  getKnownPlugins(operationType?: string): string[];
  setRegisteredPlugins(
    plugins: Array<{ name: string; operations: string[] }>
  ): void;
  setFilter<K extends keyof DevToolFilters>(
    key: K,
    value: DevToolFilters[K]
  ): void;
  recordInvalidation(event: InvalidationEvent): void;
  addEvent(event: StandaloneEvent): void;
  getEvents(): StandaloneEvent[];
  getResolvedPath(queryKey: string): string | undefined;
  subscribe(callback: () => void): () => void;
  clear(): void;
  setStateManager(stateManager: StateManager): void;
  getCacheEntries(searchQuery?: string): CacheEntryDisplay[];
  refetchStateEntry(key: string): void;
  deleteCacheEntry(key: string): void;
  clearAllCache(): void;
  setMaxHistory(value: number): void;
  importTraces(data: ExportedItem[], filename: string): void;
  getImportedSession(): ImportedSession | null;
  getFilteredImportedTraces(searchQuery?: string): ExportedItem[];
  clearImportedTraces(): void;
  isStepUpdateOnly(): boolean;

  startSubscription(event: SubscriptionConnectEvent): SubscriptionTrace;
  updateSubscriptionStatus(
    subscriptionId: string,
    status: SubscriptionTrace["status"],
    error?: Error
  ): void;
  recordSubscriptionMessage(event: SubscriptionMessageEvent): void;
  updateSubscriptionAccumulatedData(
    queryKey: string,
    eventType: string,
    accumulatedData: Record<string, unknown>
  ): void;
  endSubscription(subscriptionId: string, reason?: string): void;
  getSubscription(subscriptionId: string): SubscriptionTrace | undefined;
  getSubscriptions(): SubscriptionTrace[];
  getFilteredSubscriptions(searchQuery?: string): SubscriptionTrace[];
  getAllTraces(searchQuery?: string): Trace[];
}

export type DetailTab = "data" | "request" | "meta" | "plugins";

export type PanelView = "requests" | "state" | "import";

export type InternalTab = "data" | "meta" | "raw";

export type TimelineScope = "request" | "operation" | "global";

export interface CacheEntryDisplay {
  queryKey: string;
  entry: CacheEntry<unknown, unknown>;
  subscriberCount: number;
  resolvedPath?: string;
}

export interface ExportedTrace {
  type: "request";
  id: string;
  queryKey: string;
  operationType: string;
  method: string;
  path: string;
  tags: string[];
  timestamp: number;
  duration?: number;
  request: unknown;
  response?: unknown;
  meta?: Record<string, unknown>;
  steps: Array<{
    plugin: string;
    stage: string;
    timestamp: number;
    duration?: number;
    reason?: string;
    color?: string;
    diff?: { before: unknown; after: unknown; label?: string };
    info?: Array<{ label?: string; value: unknown }>;
  }>;
}

export interface ExportedSSE {
  type: "sse";
  id: string;
  channel: string;
  queryKey: string;
  connectionUrl: string;
  status: "connecting" | "connected" | "disconnected" | "error";
  connectedAt?: number;
  disconnectedAt?: number;
  error?: { message: string };
  retryCount: number;
  messageCount: number;
  lastMessageAt?: number;
  accumulatedData: Record<string, unknown>;
  messages: Array<{
    id: string;
    eventType: string;
    timestamp: number;
    rawData: unknown;
  }>;
  steps: Array<{
    plugin: string;
    stage: string;
    timestamp: number;
    duration?: number;
    reason?: string;
    color?: string;
    diff?: { before: unknown; after: unknown; label?: string };
    info?: Array<{ label?: string; value: unknown }>;
  }>;
  timestamp: number;
  listenedEvents?: string[];
}

export type ExportedItem = ExportedTrace | ExportedSSE;

export interface ImportedSession {
  filename: string;
  importedAt: number;
  items: ExportedItem[];
}

export interface RenderContext {
  traces: OperationTrace[];
  events: StandaloneEvent[];
  filters: DevToolFilters;
  knownPlugins: string[];
  selectedTraceId: string | null;
  activeTab: DetailTab;
  showSettings: boolean;
  showPassedPlugins: boolean;
  expandedSteps: ReadonlySet<string>;
  expandedGroups: ReadonlySet<string>;
  fullDiffViews: ReadonlySet<string>;
  listPanelWidth: number;
  requestsPanelHeight: number;
}
