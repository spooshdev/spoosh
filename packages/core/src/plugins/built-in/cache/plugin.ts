import type { EnlacePlugin } from "../../types";
import type {
  CachePluginConfig,
  CacheReadOptions,
  CacheWriteOptions,
  CacheInfiniteReadOptions,
  CacheReadResult,
  CacheWriteResult,
} from "./types";

/**
 * Enables response caching with configurable stale time.
 *
 * Cached data is served immediately while fresh, avoiding unnecessary network requests.
 * When data becomes stale, it may trigger a background refetch.
 *
 * @param config - Plugin configuration
 * @returns Cache plugin instance
 *
 * @example
 * ```ts
 * const plugins = [
 *   cachePlugin({ staleTime: 5000 }), // 5 second stale time
 * ];
 *
 * // Per-query override
 * useRead((api) => api.posts.$get(), { staleTime: 10000 });
 * ```
 */
export function cachePlugin(config: CachePluginConfig = {}): EnlacePlugin<{
  readOptions: CacheReadOptions;
  writeOptions: CacheWriteOptions;
  infiniteReadOptions: CacheInfiniteReadOptions;
  readResult: CacheReadResult;
  writeResult: CacheWriteResult;
}> {
  const { staleTime: defaultStaleTime = 0 } = config;

  return {
    name: "enlace:cache",
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

      const response = await next();

      if (response.error) {
        context.stateManager.setCache(context.queryKey, {
          state: {
            ...context.state,
            error: response.error,
            loading: false,
            fetching: false,
          },
          tags: context.tags,
        });
      } else if (response.data !== undefined) {
        context.stateManager.setCache(context.queryKey, {
          state: {
            ...context.state,
            data: response.data,
            error: undefined,
            timestamp: Date.now(),
            loading: false,
            fetching: false,
          },
          tags: context.tags,
          stale: false,
        });
      }

      return response;
    },
  };
}
