import type { SpooshPlugin, StateManager, EventTracer } from "@spoosh/core";

const PLUGIN_NAME = "spoosh:gc";

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
  eventTracer: EventTracer | undefined,
  options: GcPluginOptions
): number {
  const { maxAge, maxEntries } = options;
  const now = Date.now();
  let removedCount = 0;

  const entries = stateManager.getAllCacheEntries();

  if (maxAge !== undefined) {
    for (const { key, entry } of entries) {
      if (stateManager.getSubscribersCount(key) > 0) {
        continue;
      }

      const age = now - entry.state.timestamp;

      if (age > maxAge) {
        stateManager.deleteCache(key);
        removedCount++;
      }
    }
  }

  if (maxEntries !== undefined) {
    const currentEntries = stateManager.getAllCacheEntries();
    const gcCandidates = currentEntries.filter(
      ({ key }) => stateManager.getSubscribersCount(key) === 0
    );
    const excess = currentEntries.length - maxEntries;

    if (excess > 0) {
      const sorted = gcCandidates.sort(
        (a, b) => a.entry.state.timestamp - b.entry.state.timestamp
      );

      for (let i = 0; i < Math.min(excess, sorted.length); i++) {
        const entry = sorted[i];

        if (entry) {
          stateManager.deleteCache(entry.key);
          removedCount++;
        }
      }
    }
  }

  if (removedCount > 0) {
    eventTracer?.emit(`Cleaned ${removedCount} cache entries`, {
      color: "success",
      meta: { removed: removedCount, total: entries.length },
    });
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
 * @see {@link https://spoosh.dev/docs/react/plugins/gc | GC Plugin Documentation}
 *
 * @example
 * ```ts
 * import { Spoosh } from "@spoosh/core";
 *
 * const spoosh = new Spoosh<ApiSchema, Error>("/api")
 *   .use([
 *     gcPlugin({
 *       maxAge: 60000,     // Remove entries older than 1 minute
 *       maxEntries: 100,   // Keep max 100 entries
 *       interval: 30000,   // Run GC every 30 seconds
 *     }),
 *   ]);
 *
 * // Manual GC trigger
 * const { runGc } = create(client);
 * const removedCount = runGc();
 * ```
 */
export function gcPlugin(
  options: GcPluginOptions = {}
): SpooshPlugin<{ instanceApi: GcPluginExports }> {
  const { interval = 60000 } = options;

  let runGcFn: (() => number) | undefined;

  return {
    name: PLUGIN_NAME,
    operations: [],

    setup(context) {
      const { stateManager } = context;
      const et = context.eventTracer?.(PLUGIN_NAME);

      runGcFn = () => {
        return runGarbageCollection(stateManager, et, options);
      };

      if (typeof window === "undefined") {
        return;
      }

      et?.emit(`GC scheduled every ${interval}ms`, {
        color: "info",
        meta: {
          interval,
          maxAge: options.maxAge,
          maxEntries: options.maxEntries,
        },
      });

      setInterval(() => {
        runGcFn?.();
      }, interval);
    },

    instanceApi() {
      return {
        runGc: () => runGcFn?.() ?? 0,
      };
    },
  };
}
