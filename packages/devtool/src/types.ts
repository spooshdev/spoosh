import type {
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

  /** Maximum number of traces to keep in history. Defaults to 50. */
  maxHistory?: number;

  /** Show floating icon. If false, use devtools.open() manually. Defaults to true. */
  showFloatingIcon?: boolean;
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
export interface PluginStepEvent {
  traceId: string;
  plugin: string;
  stage: TraceStage;
  timestamp: number;
  duration?: number;
  reason?: string;
  color?: TraceColor;
  diff?: { before: unknown; after: unknown; label?: string };
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
  getHistory(): OperationTrace[];
  clearHistory(): void;
  setEnabled(value: boolean): void;
  setTheme(theme: "light" | "dark" | DevToolTheme): void;
  open(): void;
  close(): void;
  toggle(): void;
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
}

export interface DevToolStoreInterface {
  startTrace(context: PluginContext, resolvedPath: string): OperationTrace;
  endTrace(traceId: string, response?: SpooshResponse<unknown, unknown>): void;
  discardTrace(traceId: string): void;
  getCurrentTrace(queryKey: string): OperationTrace | undefined;
  getTrace(traceId: string): OperationTrace | undefined;
  getTraces(): OperationTrace[];
  getFilteredTraces(searchQuery?: string): OperationTrace[];
  getActiveCount(): number;
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
  subscribe(callback: () => void): () => void;
  clear(): void;
}

export type DetailTab = "data" | "request" | "meta" | "plugins";

export type TimelineScope = "request" | "operation" | "global";

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
