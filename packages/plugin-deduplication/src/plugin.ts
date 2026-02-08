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

const PLUGIN_NAME = "spoosh:deduplication";

/**
 * Prevents duplicate in-flight requests for the same query.
 *
 * When multiple components request the same data simultaneously,
 * only one network request is made and all callers share the result.
 *
 * @param config - Plugin configuration
 *
 * @see {@link https://spoosh.dev/docs/react/plugins/deduplication | Deduplication Plugin Documentation}
 *
 * @example
 * ```ts
 * import { Spoosh } from "@spoosh/core";
 *
 * const spoosh = new Spoosh<ApiSchema, Error>("/api")
 *   .use([
 *     // ... other plugins
 *     deduplicationPlugin({ read: "in-flight" }),
 *   ]);
 *
 * // Per-query override
 * useRead((api) => api("posts").GET(), {
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
    name: PLUGIN_NAME,
    operations: ["read", "infiniteRead", "write"],

    middleware: async (context, next) => {
      const t = context.tracer?.(PLUGIN_NAME);

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
          t?.return("Deduplicated (in-flight)", { color: "success" });

          return existingPromise as Promise<
            SpooshResponse<unknown, unknown>
          > as ReturnType<typeof next>;
        }
      }

      if (dedupeMode === false) {
        t?.skip("Disabled", { color: "muted" });
      }

      return next();
    },

    exports: () => ({
      getConfig: () => resolvedConfig,
    }),
  };
}
