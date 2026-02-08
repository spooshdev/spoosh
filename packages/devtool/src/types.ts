import type {
  OperationType,
  SpooshResponse,
  StateManager,
  EventEmitter,
  TraceEvent,
  TraceStage,
  TraceColor,
} from "@spoosh/core";

export interface DevToolConfig {
  /** Enable or disable the devtool. Defaults to true. */
  enabled?: boolean;

  /** Theme for the devtool panel. Defaults to 'dark'. */
  theme?: "light" | "dark" | DevToolTheme;

  /** Position of the floating icon. Defaults to 'bottom-right'. */
  position?: "bottom-right" | "bottom-left" | "top-right" | "top-left";

  /** Maximum number of traces to keep in history. Defaults to 50. */
  maxHistory?: number;
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

export interface LazyDiff {
  hasChanges: boolean;
  getDiff(): DiffLine[];
}

export interface CacheChange {
  key: string;
  type: "added" | "removed" | "modified";
  diff: unknown | LazyDiff;
}

export interface CacheDiff {
  hasChanges: boolean;
  getChanges(): CacheChange[];
}

export interface PluginDiff {
  request: LazyDiff | null;
  cache: CacheDiff | null;
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
  diff?: { before: unknown; after: unknown };
  meta?: Record<string, unknown>;
}

export interface OperationTrace {
  id: string;
  operationType: OperationType;
  method: string;
  path: string;
  queryKey: string;
  tags: string[];
  startTime: number;
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

export interface DevToolInstanceApi {
  getHistory(): OperationTrace[];
  clearHistory(): void;
  setEnabled(value: boolean): void;
  setTheme(theme: "light" | "dark" | DevToolTheme): void;
  open(): void;
  close(): void;
  toggle(): void;
}

export interface DevToolPanelOptions {
  store: DevToolStoreInterface;
  theme: "light" | "dark" | DevToolTheme;
  position: "bottom-right" | "bottom-left" | "top-right" | "top-left";
  stateManager: StateManager;
  eventEmitter: EventEmitter;
}

export interface DevToolStoreInterface {
  startTrace(context: TraceContext): OperationTrace;
  endTrace(queryKey: string, response?: SpooshResponse<unknown, unknown>): void;
  getCurrentTrace(queryKey: string): OperationTrace | undefined;
  getTrace(traceId: string): OperationTrace | undefined;
  getTraces(): OperationTrace[];
  getFilteredTraces(): OperationTrace[];
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
    context: TraceContext,
    prevContext?: TraceContext
  ): void;
  subscribe(callback: () => void): () => void;
  clear(): void;
}

export interface TraceContext {
  operationType: OperationType;
  method: string;
  path: string;
  queryKey: string;
  tags: string[];
}
