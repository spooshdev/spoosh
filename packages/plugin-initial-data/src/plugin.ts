import type { SpooshPlugin } from "@spoosh/core";

import type {
  InitialDataReadOptions,
  InitialDataInfiniteReadOptions,
  InitialDataReadResult,
  InitialDataWriteOptions,
  InitialDataWriteResult,
} from "./types";

const PLUGIN_NAME = "spoosh:initialData";

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
 * const spoosh = new Spoosh<ApiSchema, Error>("/api")
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
    name: PLUGIN_NAME,
    operations: ["read", "infiniteRead"],

    middleware: async (context, next) => {
      const t = context.tracer?.(PLUGIN_NAME);

      const pluginOptions = context.pluginOptions as
        | InitialDataReadOptions
        | undefined;

      if (pluginOptions?.initialData === undefined) {
        t?.skip("No initial data", { color: "muted" });
        return next();
      }

      if (!context.instanceId) {
        return next();
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
        t?.skip("Cache exists", { color: "muted" });
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

      t?.log("Applied initial data", {
        color: "success",
        diff: {
          before: undefined,
          after: pluginOptions.initialData,
          label: "Set initial data to cache",
        },
      });

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
        t?.return("Skip refetch", { color: "muted" });
        return { data: pluginOptions.initialData, status: 200 };
      }

      t?.log("Background refetch", { color: "info" });

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
