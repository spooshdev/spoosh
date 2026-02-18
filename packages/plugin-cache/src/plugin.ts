import type { SpooshPlugin } from "@spoosh/core";

import type {
  CachePluginConfig,
  CacheReadOptions,
  CacheWriteOptions,
  CacheWriteTriggerOptions,
  CacheInfiniteReadOptions,
  CacheReadResult,
  CacheWriteResult,
  CacheInstanceApi,
  ClearCacheOptions,
} from "./types";

const PLUGIN_NAME = "spoosh:cache";

/**
 * Enables caching for read operations with configurable stale time.
 *
 * Returns cached data immediately if available and not stale,
 * avoiding unnecessary network requests.
 *
 * This plugin runs with priority -10, meaning it executes early in the middleware chain
 * to check the cache before other plugins (like retry, debug) run.
 *
 * @param config - Plugin configuration
 *
 * @see {@link https://spoosh.dev/docs/react/plugins/cache | Cache Plugin Documentation}
 *
 * @example
 * ```ts
 * import { Spoosh } from "@spoosh/core";
 *
 * const spoosh = new Spoosh<ApiSchema, Error>("/api")
 *   .use([
 *     cachePlugin({ staleTime: 5000 }),
 *     // ... other plugins
 *   ]);
 *
 * // Per-query override
 * useRead((api) => api("posts").GET(), {
 *   staleTime: 10000,
 * });
 * ```
 */
export function cachePlugin(config: CachePluginConfig = {}): SpooshPlugin<{
  readOptions: CacheReadOptions;
  writeOptions: CacheWriteOptions;
  writeTriggerOptions: CacheWriteTriggerOptions;
  infiniteReadOptions: CacheInfiniteReadOptions;
  readResult: CacheReadResult;
  writeResult: CacheWriteResult;
  instanceApi: CacheInstanceApi;
}> {
  const { staleTime: defaultStaleTime = 0 } = config;

  return {
    name: PLUGIN_NAME,
    operations: ["read", "infiniteRead", "write"],
    priority: -10,

    middleware: async (context, next) => {
      const t = context.tracer?.(PLUGIN_NAME);

      if (!context.forceRefetch) {
        const cached = context.stateManager.getCache(context.queryKey);

        if (cached?.state.data && !cached.stale) {
          const pluginOptions = context.pluginOptions as
            | CacheReadOptions
            | undefined;
          const staleTime = pluginOptions?.staleTime ?? defaultStaleTime;
          const age = Date.now() - cached.state.timestamp;
          const isTimeStale = age > staleTime;

          if (!isTimeStale) {
            t?.return("Cache hit", { color: "success" });
            return { data: cached.state.data, status: 200 };
          }

          t?.log("Cache stale", { color: "warning" });
          return next();
        }

        if (cached?.stale) {
          t?.log("Cache Stale", { color: "warning" });
          return next();
        }

        t?.skip("Cache miss", { color: "muted" });
        return next();
      }

      if (context.method === "GET") {
        t?.log("Force refetch", { color: "info" });
      }

      return next();
    },

    afterResponse(context, response) {
      if (!response.error) {
        const pluginOptions = context.pluginOptions as
          | CacheWriteTriggerOptions
          | undefined;

        if (pluginOptions?.clearCache) {
          context
            .tracer?.(PLUGIN_NAME)
            ?.log("Cleared cache", { color: "muted" });

          context.stateManager.clear();
        }
      }
    },

    instanceApi(context) {
      const { stateManager, eventEmitter } = context;

      const clearCache = (options?: ClearCacheOptions): void => {
        stateManager.clear();

        if (options?.refetchAll) {
          eventEmitter.emit("refetchAll", undefined);
        }
      };

      return { clearCache };
    },
  };
}
