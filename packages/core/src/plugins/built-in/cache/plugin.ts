import type { EnlacePlugin, PluginContext } from "../../types";
import type {
  CachePluginConfig,
  CacheReadOptions,
  CacheWriteOptions,
  CacheInfiniteReadOptions,
  CacheReadResult,
  CacheWriteResult,
} from "./types";

export const CACHE_FORCE_REFETCH_KEY = "cache:forceRefetch";

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

    handlers: {
      beforeFetch(context: PluginContext) {
        const forceRefetch = context.metadata.get(CACHE_FORCE_REFETCH_KEY);

        if (forceRefetch) {
          context.metadata.delete(CACHE_FORCE_REFETCH_KEY);
          return context;
        }

        const cached = context.stateManager.getCache(context.queryKey);

        if (!cached) {
          return context;
        }

        const pluginOptions = context.pluginOptions as
          | CacheReadOptions
          | undefined;
        const staleTime = pluginOptions?.staleTime ?? defaultStaleTime;
        const isStale = Date.now() - cached.state.timestamp > staleTime;

        if (cached.state.data !== undefined && !isStale) {
          context.state = { ...cached.state, isStale: false };
          context.skipFetch = true;
        }

        return context;
      },

      onSuccess(context: PluginContext) {
        if (!context.response?.data) return context;

        context.stateManager.setCache(context.queryKey, {
          state: {
            ...context.state,
            data: context.response.data,
            error: undefined,
            isStale: false,
            isOptimistic: false,
            timestamp: Date.now(),
            loading: false,
            fetching: false,
          },
          tags: context.tags,
        });

        return context;
      },

      onError(context: PluginContext) {
        context.stateManager.setCache(context.queryKey, {
          state: {
            ...context.state,
            error: context.response?.error,
            isStale: true,
            loading: false,
            fetching: false,
          },
          tags: context.tags,
        });

        return context;
      },
    },
  };
}
