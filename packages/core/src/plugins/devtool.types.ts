/**
 * Devtool-related types for tracing and debugging.
 * These types are used by the devtool plugin and plugins that emit trace events.
 */

/**
 * Stage of plugin execution for tracing.
 */
export type TraceStage = "return" | "log" | "skip" | "fetch";

/**
 * Color hint for devtools visualization.
 */
export type TraceColor = "success" | "warning" | "error" | "info" | "muted";

/**
 * Structured trace event emitted by plugins.
 * Plugins self-report what they did and why.
 */
export type TraceEvent = {
  /** Plugin name */
  plugin: string;

  /** Execution stage */
  stage: TraceStage;

  /** Human-readable explanation of what happened */
  reason?: string;

  /** Color hint for devtools (success=green, warning=yellow, error=red, info=blue) */
  color?: TraceColor;

  /** Before/after diff with optional label */
  diff?: { before: unknown; after: unknown; label?: string };
};

/**
 * Trace API available to plugins via ctx.trace.
 * Plugins emit structured events; devtools renders them.
 *
 * @example
 * ```ts
 * middleware: async (ctx, next) => {
 *   const cached = getCache(ctx.queryKey);
 *   if (cached) {
 *     ctx.trace?.step({
 *       plugin: "cache",
 *       stage: "skip",
 *       meta: { reason: "Cache hit (TTL valid)" }
 *     });
 *     return cached;
 *   }
 *
 *   ctx.trace?.step({
 *     plugin: "cache",
 *     stage: "before",
 *     intent: "read",
 *   });
 *
 *   const result = await next();
 *
 *   ctx.trace?.step({
 *     plugin: "cache",
 *     stage: "after",
 *     meta: {
 *       reason: "Stored in cache",
 *       diff: { before: null, after: result.data }
 *     }
 *   });
 *
 *   return result;
 * }
 * ```
 */
export type Trace = {
  /**
   * Emit a trace event. Lazy evaluation - only computed when devtools is active.
   *
   * @param event - Trace event or function that returns trace event (for lazy evaluation)
   */
  step: (event: TraceEvent | (() => TraceEvent)) => void;
};

/**
 * Listener for trace events emitted by plugins.
 */
export type TraceListener = (
  event: TraceEvent & { queryKey: string; timestamp: number }
) => void;

/**
 * Standalone event not tied to a request lifecycle.
 * Used for polling, debounce, gc, and other background activities.
 */
export type StandaloneEvent = {
  /** Plugin name */
  plugin: string;

  /** Human-readable message */
  message: string;

  /** Color hint for devtools */
  color?: TraceColor;

  /** Related query key (for filtering) */
  queryKey?: string;

  /** Additional metadata */
  meta?: Record<string, unknown>;

  /** Timestamp when event occurred */
  timestamp: number;
};

export type EventListener = (event: StandaloneEvent) => void;

export type TraceOptions = {
  color?: TraceColor;
  diff?: { before: unknown; after: unknown; label?: string };
};

export type EventOptions = {
  color?: TraceColor;

  /** Query key this event relates to (for filtering) */
  queryKey?: string;

  /** Additional metadata to display */
  meta?: Record<string, unknown>;
};

/**
 * Request-bound tracer API for plugins.
 * Created via `context.tracer?.(pluginName)`.
 * Automatically bound to the request's queryKey for accurate devtool tracing.
 *
 * @example
 * ```ts
 * const t = context.tracer?.("my-plugin");
 * t?.return("Cache hit", { color: "success" });
 * t?.log("Transformed", { color: "info", diff: { before, after } });
 * t?.skip("Nothing to do", { color: "muted" });
 * ```
 */
export interface RequestTracer {
  /** Returned early without calling next() */
  return(msg: string, options?: TraceOptions): void;

  /** Did something (any activity worth noting) */
  log(msg: string, options?: TraceOptions): void;

  /** Nothing to do, passed through */
  skip(msg: string, options?: TraceOptions): void;
}

/**
 * Event tracer API for standalone events not tied to a request lifecycle.
 * Created via `context.eventTracer?.(pluginName)`.
 * Use for async callbacks like polling, debounce completion, gc, etc.
 *
 * @example
 * ```ts
 * const et = context.eventTracer?.("my-plugin");
 * et?.emit("Poll triggered", { queryKey, color: "success" });
 * et?.emit("GC cleaned 5 entries", { color: "info", meta: { count: 5 } });
 * ```
 */
export interface EventTracer {
  /** Emit a standalone event not tied to a request */
  emit(msg: string, options?: EventOptions): void;
}

/** @deprecated Use RequestTracer instead */
export type PluginTracer = RequestTracer;
