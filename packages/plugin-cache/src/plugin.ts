import type { SpooshPlugin, InstanceApiContext } from "@spoosh/core";

import type {
  CachePluginConfig,
  CacheReadOptions,
  CacheWriteOptions,
  CacheInfiniteReadOptions,
  CacheReadResult,
  CacheWriteResult,
  CacheInstanceApi,
} from "./types";

/**
 * Enables caching for read operations with configurable stale time.
 *
 * Returns cached data immediately if available and not stale,
 * avoiding unnecessary network requests.
 *
 * @param config - Plugin configuration
 *
 * @see {@link https://spoosh.dev/docs/plugins/cache | Cache Plugin Documentation}
 *
 * @example
 * ```ts
 * import { Spoosh } from "@spoosh/core";
 *
 * const client = new Spoosh<ApiSchema, Error>("/api")
 *   .use([
 *     // ... other plugins
 *     cachePlugin({ staleTime: 5000 }),
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
  infiniteReadOptions: CacheInfiniteReadOptions;
  readResult: CacheReadResult;
  writeResult: CacheWriteResult;
  instanceApi: CacheInstanceApi;
}> {
  const { staleTime: defaultStaleTime = 0 } = config;

  return {
    name: "spoosh:cache",
    operations: ["read", "infiniteRead"],

    middleware: async (context, next) => {
      if (!context.forceRefetch) {
        const cached = context.stateManager.getCache(context.queryKey);

        if (cached?.state.data && !cached.stale) {
          const pluginOptions = context.pluginOptions as
            | CacheReadOptions
            | undefined;
          const staleTime = pluginOptions?.staleTime ?? defaultStaleTime;
          const isTimeStale = Date.now() - cached.state.timestamp > staleTime;

          if (!isTimeStale) {
            return { data: cached.state.data, status: 200 };
          }
        }
      }

      return await next();
    },

    instanceApi(context: InstanceApiContext) {
      const { stateManager, eventEmitter } = context;

      const clearCache = (): void => {
        stateManager.clear();
        eventEmitter.emit("refetchAll", undefined);
      };

      return { clearCache };
    },
  };
}
