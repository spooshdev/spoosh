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

  /**
   * Whether to run GC immediately on plugin initialization.
   * @default false
   */
  runOnInit?: boolean;
};

export type GcPluginExports = {
  /** Manually trigger garbage collection. Returns number of entries removed. */
  runGc: () => number;

  /** Stop the GC interval */
  stop: () => void;

  /** Start the GC interval (if stopped) */
  start: () => void;

  /** Check if GC interval is running */
  isRunning: () => boolean;
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

export function gcPlugin(
  options: GcPluginOptions = {}
): SpooshPlugin<{ instanceApi: GcPluginExports }> {
  const { interval = 60000, runOnInit = false } = options;

  return {
    name: "spoosh:gc",
    operations: [],

    instanceApi(context: InstanceApiContext) {
      const { stateManager } = context;
      let intervalId: ReturnType<typeof setInterval> | undefined;

      const runGc = () => {
        return runGarbageCollection(stateManager, options);
      };

      const stop = () => {
        if (intervalId) {
          clearInterval(intervalId);
          intervalId = undefined;
        }
      };

      const start = () => {
        if (intervalId) return;

        intervalId = setInterval(() => {
          runGc();
        }, interval);
      };

      const isRunning = () => {
        return intervalId !== undefined;
      };

      if (runOnInit) {
        runGc();
      }

      start();

      return {
        runGc,
        stop,
        start,
        isRunning,
      };
    },
  };
}
