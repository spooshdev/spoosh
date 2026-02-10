import type {
  Trace,
  TraceStage,
  TraceOptions,
  RequestTracer,
} from "../plugins/types";

/**
 * Creates a request-bound tracer for a plugin.
 * Use for middleware, afterResponse, and lifecycle hooks.
 *
 * @example
 * ```ts
 * const t = createTracer("spoosh:cache", context.trace);
 * t.return("Cache hit", { color: "success" });
 * t.log("Cached response", { color: "info", diff: { before, after } });
 * t.skip("No query params", { color: "muted" });
 * ```
 */
export function createTracer(
  plugin: string,
  trace: Trace | undefined
): RequestTracer {
  const step = (stage: TraceStage, reason: string, options?: TraceOptions) => {
    trace?.step(() => ({
      plugin,
      stage,
      reason,
      color: options?.color,
      diff: options?.diff,
    }));
  };

  return {
    return: (msg, options) => step("return", msg, options),
    log: (msg, options) => step("log", msg, options),
    skip: (msg, options) => step("skip", msg, options),
  };
}
