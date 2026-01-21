import type { SpooshPlugin } from "@spoosh/core";

import type {
  ThrottleReadOptions,
  ThrottleInfiniteReadOptions,
  ThrottleReadResult,
  ThrottleWriteOptions,
  ThrottleWriteResult,
} from "./types";

/**
 * Enables throttling for read operations.
 *
 * Limits how frequently a query can be executed, returning cached data
 * if the throttle window hasn't elapsed.
 *
 * @see {@link https://spoosh.dev/docs/plugins/throttle | Throttle Plugin Documentation}
 *
 * @example
 * ```ts
 * import { Spoosh } from "@spoosh/core";
 *
 * const client = new Spoosh<ApiSchema, Error>("/api")
 *   .use([
 *     // ... other plugins
 *     throttlePlugin(),
 *   ]);
 *
 * // Throttle to max once per second
 * useRead((api) => api.posts.$get(), {
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
    name: "spoosh:throttle",
    operations: ["read", "infiniteRead"],

    middleware: async (context, next) => {
      const pluginOptions = context.pluginOptions as
        | ThrottleReadOptions
        | undefined;
      const throttleMs = pluginOptions?.throttle;

      if (!throttleMs || throttleMs <= 0) {
        return next();
      }

      const { path, method } = context;
      const stableKey = `${path.join("/")}:${method}`;
      const now = Date.now();
      const lastTime = lastFetchTime.get(stableKey) ?? 0;
      const elapsed = now - lastTime;

      if (elapsed < throttleMs) {
        return { data: undefined, status: 0 };
      }

      lastFetchTime.set(stableKey, now);

      return next();
    },
  };
}
