import type { SpooshPlugin } from "@spoosh/core";
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
 * @see {@link https://spoosh.dev/docs/react/plugins/initial-data | Initial Data Plugin Documentation}
 *
 * @returns Initial data plugin instance
 *
 * @example
 * ```ts
 * import { Spoosh } from "@spoosh/core";
 *
 * const client = new Spoosh<ApiSchema, Error>("/api")
 *   .use([
 *     initialDataPlugin(),
 *     cachePlugin({ staleTime: 5000 }),
 *   ]);
 *
 * // Basic usage - shows initialData, refetches in background
 * const { data, isInitialData } = useRead(
 *   (api) => api("posts").GET(),
 *   { initialData: prefetchedPosts }
 * );
 *
 * // Disable background refetch
 * const { data } = useRead(
 *   (api) => api("posts").GET(),
 *   { initialData: prefetchedPosts, refetchOnInitialData: false }
 * );
 * ```
 */
export function initialDataPlugin(): SpooshPlugin<{
  readOptions: InitialDataReadOptions;
  writeOptions: InitialDataWriteOptions;
  infiniteReadOptions: InitialDataInfiniteReadOptions;
  readResult: InitialDataReadResult;
  writeResult: InitialDataWriteResult;
}> {
  const initialDataAppliedFor = new Set<string>();

  return {
    name: "spoosh:initialData",
    operations: ["read", "infiniteRead"],

    middleware: async (context, next) => {
      const pluginOptions = context.pluginOptions as
        | InitialDataReadOptions
        | undefined;

      if (pluginOptions?.initialData === undefined) {
        const response = await next();

        if (!response.error) {
          context.stateManager.setMeta(context.queryKey, {
            isInitialData: false,
          });
        }

        return response;
      }

      if (!context.instanceId) {
        const response = await next();

        if (!response.error) {
          context.stateManager.setMeta(context.queryKey, {
            isInitialData: false,
          });
        }

        return response;
      }

      if (initialDataAppliedFor.has(context.instanceId)) {
        const response = await next();

        if (!response.error) {
          context.stateManager.setMeta(context.queryKey, {
            isInitialData: false,
          });
        }

        return response;
      }

      const cached = context.stateManager.getCache(context.queryKey);

      if (cached?.state?.data !== undefined) {
        initialDataAppliedFor.add(context.instanceId);

        const response = await next();

        if (!response.error) {
          context.stateManager.setMeta(context.queryKey, {
            isInitialData: false,
          });
        }

        return response;
      }

      initialDataAppliedFor.add(context.instanceId);

      context.stateManager.setCache(context.queryKey, {
        state: {
          data: pluginOptions.initialData,
          error: undefined,
          timestamp: Date.now(),
        },
        tags: context.tags,
      });

      context.stateManager.setMeta(context.queryKey, {
        isInitialData: true,
      });

      if (pluginOptions.refetchOnInitialData === false) {
        return { data: pluginOptions.initialData, status: 200 };
      }

      const response = await next();

      if (!response.error) {
        context.stateManager.setMeta(context.queryKey, {
          isInitialData: false,
        });
      }

      return response;
    },

    lifecycle: {
      onUnmount(context) {
        if (context.instanceId) {
          initialDataAppliedFor.delete(context.instanceId);
        }
      },
    },
  };
}
