import type { SpooshPlugin, SpooshResponse } from "@spoosh/core";
import type {
  DeduplicationConfig,
  DeduplicationReadOptions,
  DeduplicationWriteOptions,
  DeduplicationInfiniteReadOptions,
  DeduplicationReadResult,
  DeduplicationWriteResult,
  DedupeMode,
} from "./types";

/**
 * Prevents duplicate in-flight requests for the same query.
 *
 * When multiple components request the same data simultaneously,
 * only one network request is made and all callers share the result.
 *
 * @param config - Plugin configuration
 *
 * @see {@link https://spoosh.dev/docs/plugins/deduplication | Deduplication Plugin Documentation}
 *
 * @example
 * ```ts
 * import { Spoosh } from "@spoosh/core";
 *
 * const client = new Spoosh<ApiSchema, Error>("/api")
 *   .use([
 *     // ... other plugins
 *     deduplicationPlugin({ read: "in-flight" }),
 *   ]);
 *
 * // Per-query override
 * useRead((api) => api.posts.$get(), {
 *   dedupe: false,
 * });
 * ```
 */
export function deduplicationPlugin(
  config?: DeduplicationConfig
): SpooshPlugin<{
  readOptions: DeduplicationReadOptions;
  writeOptions: DeduplicationWriteOptions;
  infiniteReadOptions: DeduplicationInfiniteReadOptions;
  readResult: DeduplicationReadResult;
  writeResult: DeduplicationWriteResult;
}> {
  const resolvedConfig = {
    read: config?.read ?? ("in-flight" as const),
    write: config?.write ?? (false as const),
  };

  return {
    name: "spoosh:deduplication",
    operations: ["read", "infiniteRead", "write"],

    middleware: async (context, next) => {
      const defaultMode =
        context.operationType === "write"
          ? resolvedConfig.write
          : resolvedConfig.read;

      const requestOverride = (
        context.pluginOptions as { dedupe?: DedupeMode } | undefined
      )?.dedupe;

      const dedupeMode = requestOverride ?? defaultMode;

      if (dedupeMode === "in-flight") {
        const existingPromise = context.stateManager.getPendingPromise(
          context.queryKey
        );

        if (existingPromise) {
          return existingPromise as Promise<
            SpooshResponse<unknown, unknown>
          > as ReturnType<typeof next>;
        }
      }

      return next();
    },

    exports: () => ({
      getConfig: () => resolvedConfig,
    }),
  };
}
