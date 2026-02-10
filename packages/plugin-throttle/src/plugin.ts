import type { SpooshPlugin } from "@spoosh/core";

import type {
  ThrottleReadOptions,
  ThrottleInfiniteReadOptions,
  ThrottleReadResult,
  ThrottleWriteOptions,
  ThrottleWriteResult,
} from "./types";

const PLUGIN_NAME = "spoosh:throttle";

/**
 * Enables throttling for read operations.
 *
 * Limits how frequently a query can be executed, returning cached data
 * if the throttle window hasn't elapsed.
 *
 * This plugin runs with priority 100, meaning it executes last in the middleware chain
 * to block all requests (including force fetches) that exceed the throttle limit.
 *
 * @see {@link https://spoosh.dev/docs/react/plugins/throttle | Throttle Plugin Documentation}
 *
 * @example
 * ```ts
 * import { Spoosh } from "@spoosh/core";
 *
 * const spoosh = new Spoosh<ApiSchema, Error>("/api")
 *   .use([
 *     throttlePlugin(),
 *     // ... other plugins
 *   ]);
 *
 * // Throttle to max once per second
 * useRead((api) => api("posts").GET(), {
 *   throttle: 1000,
 * });
 * ```
 */
export function throttlePlugin(): SpooshPlugin<{
  readOptions: ThrottleReadOptions;
  writeOptions: ThrottleWriteOptions;
  infiniteReadOptions: ThrottleInfiniteReadOptions;
  readResult: ThrottleReadResult;
  writeResult: ThrottleWriteResult;
}> {
  const lastFetchTime = new Map<string, number>();

  return {
    name: PLUGIN_NAME,
    operations: ["read", "infiniteRead"],
    priority: 100,

    middleware: async (context, next) => {
      const t = context.tracer?.(PLUGIN_NAME);
      const et = context.eventTracer?.(PLUGIN_NAME);

      const pluginOptions = context.pluginOptions as
        | ThrottleReadOptions
        | undefined;
      const throttleMs = pluginOptions?.throttle;

      if (!throttleMs || throttleMs <= 0) {
        t?.skip("No throttle configured");
        return next();
      }

      const { path, method, queryKey } = context;
      const stableKey = `${path}:${method}`;
      const now = Date.now();
      const lastTime = lastFetchTime.get(stableKey) ?? 0;
      const elapsed = now - lastTime;

      if (elapsed < throttleMs) {
        const remaining = throttleMs - elapsed;

        et?.emit(`Request blocked (${remaining}ms remaining)`, {
          queryKey,
          color: "warning",
          meta: { throttle: throttleMs, elapsed, remaining },
        });

        t?.return("Throttled", { color: "warning" });
        return { data: undefined, status: 0 };
      }

      lastFetchTime.set(stableKey, now);
      t?.log("Request allowed");

      return next();
    },
  };
}
