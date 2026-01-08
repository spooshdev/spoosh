import type { EnlacePlugin, PluginContext } from "../../types";
import type {
  CacheReadOptions,
  CacheWriteOptions,
  CacheInfiniteReadOptions,
} from "./types";

export type { CacheReadOptions, CacheWriteOptions, CacheInfiniteReadOptions };

export interface CachePluginConfig {
  staleTime?: number;
}

export function cachePlugin(
  config: CachePluginConfig = {}
): EnlacePlugin<CacheReadOptions, CacheWriteOptions, CacheInfiniteReadOptions> {
  const { staleTime: defaultStaleTime = 0 } = config;

  return {
    name: "enlace:cache",
    operations: ["read", "infiniteRead"],

    handlers: {
      beforeFetch(context: PluginContext) {
        const cached = context.getCache();

        if (!cached) {
          return context;
        }

        const metadataStaleTime = context.metadata.get("staleTime") as
          | number
          | undefined;
        const optionsStaleTime = (context.requestOptions as CacheReadOptions)
          .staleTime;
        const staleTime =
          metadataStaleTime ?? optionsStaleTime ?? defaultStaleTime;
        const isStale = Date.now() - cached.state.timestamp > staleTime;

        if (cached.state.data !== undefined && !isStale) {
          context.state = { ...cached.state, isStale: false };
          context.skipFetch = true;
        }

        return context;
      },

      onSuccess(context: PluginContext) {
        if (!context.response?.data) return context;

        context.setCache({
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
        context.setCache({
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
