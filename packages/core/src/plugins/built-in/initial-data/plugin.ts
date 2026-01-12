import type { EnlacePlugin } from "../../types";
import type {
  InitialDataReadOptions,
  InitialDataInfiniteReadOptions,
  InitialDataReadResult,
  InitialDataWriteOptions,
  InitialDataWriteResult,
} from "./types";

/**
 * Enables providing initial data for queries.
 *
 * Initial data is shown immediately on first mount, before any fetch completes.
 * By default, a background refetch is triggered to get fresh data.
 *
 * @returns Initial data plugin instance
 *
 * @example
 * ```ts
 * const plugins = [
 *   initialDataPlugin(),
 *   cachePlugin({ staleTime: 5000 }),
 * ];
 *
 * // Basic usage - shows initialData, refetches in background
 * const { data, isInitialData } = useRead(
 *   (api) => api.posts.$get(),
 *   { initialData: prefetchedPosts }
 * );
 *
 * // Disable background refetch
 * const { data } = useRead(
 *   (api) => api.posts.$get(),
 *   { initialData: prefetchedPosts, refetchOnInitialData: false }
 * );
 * ```
 */
export function initialDataPlugin(): EnlacePlugin<{
  readOptions: InitialDataReadOptions;
  writeOptions: InitialDataWriteOptions;
  infiniteReadOptions: InitialDataInfiniteReadOptions;
  readResult: InitialDataReadResult;
  writeResult: InitialDataWriteResult;
}> {
  const initialDataAppliedFor = new Set<string>();

  return {
    name: "enlace:initialData",
    operations: ["read", "infiniteRead"],

    middleware: async (context, next) => {
      const pluginOptions = context.pluginOptions as
        | InitialDataReadOptions
        | undefined;

      if (pluginOptions?.initialData === undefined) {
        const response = await next();

        if (!response.error) {
          context.stateManager.setPluginResult(context.queryKey, {
            isInitialData: false,
          });
        }

        return response;
      }

      if (!context.hookId) {
        const response = await next();

        if (!response.error) {
          context.stateManager.setPluginResult(context.queryKey, {
            isInitialData: false,
          });
        }

        return response;
      }

      if (initialDataAppliedFor.has(context.hookId)) {
        const response = await next();

        if (!response.error) {
          context.stateManager.setPluginResult(context.queryKey, {
            isInitialData: false,
          });
        }

        return response;
      }

      const cached = context.stateManager.getCache(context.queryKey);

      if (cached?.state?.data !== undefined) {
        initialDataAppliedFor.add(context.hookId);

        const response = await next();

        if (!response.error) {
          context.stateManager.setPluginResult(context.queryKey, {
            isInitialData: false,
          });
        }

        return response;
      }

      initialDataAppliedFor.add(context.hookId);

      context.stateManager.setCache(context.queryKey, {
        state: {
          loading: false,
          fetching: false,
          data: pluginOptions.initialData,
          error: undefined,
          timestamp: Date.now(),
        },
        tags: context.tags,
      });

      context.stateManager.setPluginResult(context.queryKey, {
        isInitialData: true,
      });

      if (pluginOptions.refetchOnInitialData) {
        const response = await next();

        if (!response.error) {
          context.stateManager.setPluginResult(context.queryKey, {
            isInitialData: false,
          });
        }

        return response;
      }

      return { data: pluginOptions.initialData, status: 200 };
    },

    lifecycle: {
      onUnmount(context) {
        if (context.hookId) {
          initialDataAppliedFor.delete(context.hookId);
        }
      },
    },
  };
}
