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
        const cached = context.stateManager.getCache(context.queryKey);
        const existingPromise = cached?.promise;

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
