import type {
  SpooshPlugin,
  InstanceApiContext,
  StateManager,
} from "@spoosh/core";

export type GcPluginOptions = {
  /**
   * Maximum age in milliseconds for cache entries.
   * Entries older than this will be removed.
   * @default undefined (no time-based cleanup)
   */
  maxAge?: number;

  /**
   * Maximum number of cache entries to keep.
   * When exceeded, oldest entries are removed first.
   * @default undefined (no size limit)
   */
  maxEntries?: number;

  /**
   * Interval in milliseconds between GC runs.
   * @default 60000 (1 minute)
   */
  interval?: number;
};

export type GcPluginExports = {
  /** Manually trigger garbage collection. Returns number of entries removed. */
  runGc: () => number;
};

function runGarbageCollection(
  stateManager: StateManager,
  options: GcPluginOptions
): number {
  const { maxAge, maxEntries } = options;
  const now = Date.now();
  let removedCount = 0;

  const entries = stateManager.getAllCacheEntries();

  if (maxAge !== undefined) {
    for (const { key, entry } of entries) {
      const age = now - entry.state.timestamp;

      if (age > maxAge) {
        stateManager.deleteCache(key);
        removedCount++;
      }
    }
  }

  if (maxEntries !== undefined) {
    const currentEntries = stateManager.getAllCacheEntries();
    const excess = currentEntries.length - maxEntries;

    if (excess > 0) {
      const sorted = currentEntries.sort(
        (a, b) => a.entry.state.timestamp - b.entry.state.timestamp
      );

      for (let i = 0; i < excess; i++) {
        const entry = sorted[i];

        if (entry) {
          stateManager.deleteCache(entry.key);
          removedCount++;
        }
      }
    }
  }

  return removedCount;
}

/**
 * Garbage collection plugin for automatic cache cleanup.
 *
 * Removes stale cache entries based on age or total count
 * to prevent memory bloat in long-running applications.
 *
 * @param options - Plugin options
 *
 * @see {@link https://spoosh.dev/docs/plugins/gc | GC Plugin Documentation}
 *
 * @example
 * ```ts
 * import { Spoosh } from "@spoosh/core";
 *
 * const client = new Spoosh<ApiSchema, Error>("/api")
 *   .use([
 *     gcPlugin({
 *       maxAge: 60000,     // Remove entries older than 1 minute
 *       maxEntries: 100,   // Keep max 100 entries
 *       interval: 30000,   // Run GC every 30 seconds
 *     }),
 *   ]);
 *
 * // Manual GC trigger
 * const { runGc } = createReactSpoosh(client);
 * const removedCount = runGc();
 * ```
 */
export function gcPlugin(
  options: GcPluginOptions = {}
): SpooshPlugin<{ instanceApi: GcPluginExports }> {
  const { interval = 60000 } = options;

  return {
    name: "spoosh:gc",
    operations: [],

    instanceApi(context: InstanceApiContext) {
      const { stateManager } = context;

      const runGc = () => {
        return runGarbageCollection(stateManager, options);
      };

      setInterval(() => {
        runGc();
      }, interval);

      return {
        runGc,
      };
    },
  };
}
