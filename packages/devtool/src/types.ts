import type {
  CacheEntry,
  OperationType,
  SpooshResponse,
  StateManager,
  EventEmitter,
  TraceEvent,
  TraceStage,
  TraceColor,
  PluginContext,
  StandaloneEvent,
} from "@spoosh/core";

export interface DevToolConfig {
  /** Enable or disable the devtool. Defaults to true. */
  enabled?: boolean;

  /** Show floating icon. If false, use devtools.toggle() manually. Defaults to true. */
  showFloatingIcon?: boolean;

  /** Header names to redact in devtool UI and exports. Case-insensitive. Defaults to common auth headers. */
  sensitiveHeaders?: string[];

  /** ID of a container element to render the devtool inside. Falls back to floating mode if not found. */
  containerId?: string;
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

export interface InvalidationEvent {
  tags: string[];
  affectedKeys: Array<{ key: string; count: number }>;
  totalListeners: number;
  timestamp: number;
}

export interface DevToolFilters {
  operationTypes: Set<OperationType>;
  showSkipped: boolean;
  showOnlyWithChanges: boolean;
}

export interface DevToolApi {
  exportTraces(): ExportedTrace[];
  clearTraces(): void;
  toggle(): void;
  toggleFloatingIcon(): void;
}

export interface DevToolInstanceApi {
  devtools: DevToolApi;
}

export interface DevToolPanelOptions {
  store: DevToolStoreInterface;
  theme: "light" | "dark" | DevToolTheme;
  position: "bottom-right" | "bottom-left" | "top-right" | "top-left";
  stateManager: StateManager;
  eventEmitter: EventEmitter;
  showFloatingIcon: boolean;

  /** ID of a container element to render the devtool inside. Falls back to floating mode if not found. */
  containerId?: string;
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
  exportTraces(): ExportedTrace[];
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
  recordLifecycle(
    phase: "onMount" | "onUpdate" | "onUnmount",
    context: PluginContext,
    prevContext?: PluginContext
  ): void;
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
  importTraces(data: ExportedTrace[], filename: string): void;
  getImportedSession(): ImportedSession | null;
  getFilteredImportedTraces(searchQuery?: string): ExportedTrace[];
  clearImportedTraces(): void;
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

export interface ImportedSession {
  filename: string;
  importedAt: number;
  traces: ExportedTrace[];
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
