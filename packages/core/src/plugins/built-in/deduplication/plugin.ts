import type { EnlacePlugin } from "../../types";
import type {
  DeduplicationConfig,
  DeduplicationReadOptions,
  DeduplicationWriteOptions,
  DeduplicationInfiniteReadOptions,
  DeduplicationReadResult,
  DeduplicationWriteResult,
  DedupeMode,
} from "./types";

declare module "../../types" {
  interface PluginExportsRegistry {
    "enlace:deduplication": {
      getConfig: () => { read: DedupeMode; write: DedupeMode };
    };
  }
}

/**
 * Provides request deduplication to prevent duplicate in-flight requests.
 *
 * @param config - Configuration options
 * @param config.read - Deduplication mode for read operations (default: "in-flight")
 * @param config.write - Deduplication mode for write operations (default: false)
 *
 * @returns Deduplication plugin instance
 *
 * @example
 * ```ts
 * // Default: dedupe reads, not writes
 * const plugins = [deduplicationPlugin()];
 *
 * // Enable deduplication for writes too
 * // ** Warning: Be cautious when enabling write deduplication, as it may lead to unintended side effects. **
 * const plugins = [deduplicationPlugin({ write: "in-flight" })];
 *
 * // Disable deduplication for reads
 * const plugins = [deduplicationPlugin({ read: false })];
 *
 * // Per-request override
 * useRead((api) => api.posts.$get(), { dedupe: false });
 * useWrite((api) => api.posts.$post, { dedupe: "in-flight" });
 * ```
 */
export function deduplicationPlugin(
  config?: DeduplicationConfig
): EnlacePlugin<{
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
    name: "enlace:deduplication",
    operations: ["read", "infiniteRead", "write"],
    handlers: {},
    exports: () => ({
      getConfig: () => resolvedConfig,
    }),
  };
}
