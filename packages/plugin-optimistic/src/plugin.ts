import {
  createSpooshPlugin,
  type PluginContext,
  type StateManager,
  type RequestTracer,
} from "@spoosh/core";
import "@spoosh/plugin-invalidation";
import type {
  OptimisticWriteOptions,
  OptimisticWriteTriggerOptions,
  OptimisticReadOptions,
  OptimisticPagesOptions,
  OptimisticReadResult,
  OptimisticWriteResult,
  OptimisticTarget,
} from "./types";
import {
  hasPatternParams,
  pathMatchesPattern,
  extractPathFromKey,
  formatCacheKeyForTrace,
  extractOptionsFromKey,
  mapParamsToTargetNames,
} from "./utils";
import { createCacheProxy } from "./builder";

type OptimisticSnapshot = {
  key: string;
  previousData: unknown;
  afterData: unknown;
};

function resolveOptimisticTargets(context: PluginContext): OptimisticTarget[] {
  const pluginOptions = context.pluginOptions as
    | OptimisticWriteTriggerOptions
    | undefined;

  if (!pluginOptions?.optimistic) return [];

  const cacheProxy = createCacheProxy();
  const result = pluginOptions.optimistic(cacheProxy as never);

  const targets = Array.isArray(result) ? result : [result];

  return targets as unknown as OptimisticTarget[];
}

function getMatchingEntries(
  stateManager: StateManager,
  targetPath: string
): Array<{
  key: string;
  entry: ReturnType<StateManager["getCache"]>;
  extractedParams: Record<string, string>;
  paramMapping: Record<string, string>;
}> {
  const results: Array<{
    key: string;
    entry: ReturnType<StateManager["getCache"]>;
    extractedParams: Record<string, string>;
    paramMapping: Record<string, string>;
  }> = [];

  const allEntries = stateManager.getAllCacheEntries();

  if (hasPatternParams(targetPath)) {
    for (const { key, entry } of allEntries) {
      if (!key.includes(`"method":"GET"`)) continue;

      const actualPath = extractPathFromKey(key);
      if (!actualPath) continue;

      const { matches, params, paramMapping } = pathMatchesPattern(
        actualPath,
        targetPath
      );

      if (matches) {
        results.push({ key, entry, extractedParams: params, paramMapping });
      }
    }
  } else {
    for (const { key, entry } of allEntries) {
      if (!key.includes(`"method":"GET"`)) continue;

      const actualPath = extractPathFromKey(key);
      if (!actualPath) continue;

      if (actualPath === targetPath) {
        results.push({ key, entry, extractedParams: {}, paramMapping: {} });
      }
    }
  }

  return results;
}

function applyUpdate(
  stateManager: StateManager,
  target: OptimisticTarget,
  updater: (data: unknown, response?: unknown) => unknown,
  response: unknown | undefined,
  t?: RequestTracer
): OptimisticSnapshot[] {
  const snapshots: OptimisticSnapshot[] = [];
  const matchingEntries = getMatchingEntries(stateManager, target.path);

  if (matchingEntries.length === 0) {
    t?.skip(`Skipped ${target.path} (no cache entry)`);
    return [];
  }

  for (const { key, entry, extractedParams, paramMapping } of matchingEntries) {
    if (target.filter) {
      const options = extractOptionsFromKey(key) ?? {};
      const mappedParams = mapParamsToTargetNames(
        options.params as Record<string, unknown> | undefined,
        paramMapping
      );
      const mergedOptions = {
        ...options,
        params: {
          ...extractedParams,
          ...mappedParams,
        },
      };

      try {
        if (!target.filter(mergedOptions)) {
          t?.skip(
            `Skipped ${formatCacheKeyForTrace(key)} (filter not matched)`
          );
          continue;
        }
      } catch {
        t?.skip(`Skipped ${formatCacheKeyForTrace(key)} (filter error)`);
        continue;
      }
    }

    if (entry?.state.data === undefined) {
      t?.skip(`Skipped ${formatCacheKeyForTrace(key)} (no cached data)`);
      continue;
    }

    const afterData = updater(entry.state.data, response);
    snapshots.push({ key, previousData: entry.state.data, afterData });

    stateManager.setCache(key, {
      previousData: entry.state.data,
      state: {
        ...entry.state,
        data: afterData,
      },
    });

    stateManager.setMeta(key, { isOptimistic: true });
  }

  return snapshots;
}

function confirmOptimistic(
  stateManager: StateManager,
  snapshots: OptimisticSnapshot[]
): void {
  for (const { key } of snapshots) {
    const entry = stateManager.getCache(key);

    if (entry) {
      stateManager.setCache(key, {
        previousData: undefined,
      });

      stateManager.setMeta(key, { isOptimistic: false });
    }
  }
}

function rollbackOptimistic(
  stateManager: StateManager,
  snapshots: OptimisticSnapshot[]
): void {
  for (const { key, previousData } of snapshots) {
    const entry = stateManager.getCache(key);

    if (entry) {
      stateManager.setCache(key, {
        previousData: undefined,
        state: {
          ...entry.state,
          data: previousData,
        },
      });

      stateManager.setMeta(key, { isOptimistic: false });
    }
  }
}

function buildSingleDiff(
  snapshot: OptimisticSnapshot,
  mode: "apply" | "rollback" | "confirmed" = "apply"
): { before: unknown; after: unknown; label: string } {
  const label =
    mode === "apply"
      ? "Optimistic update"
      : mode === "rollback"
        ? "Rollback optimistic"
        : "Confirmed update";

  return mode === "apply" || mode === "confirmed"
    ? { before: snapshot.previousData, after: snapshot.afterData, label }
    : { before: snapshot.afterData, after: snapshot.previousData, label };
}

/**
 * Enables optimistic updates for mutations.
 *
 * Immediately updates cached data before the mutation completes,
 * with automatic rollback on error.
 *
 * When using optimistic updates, invalidation mode defaults to `"none"` to prevent
 * unnecessary refetches that would override the optimistic data. You can override
 * this by explicitly setting the `invalidate` option with a mode string or array.
 *
 * @see {@link https://spoosh.dev/docs/react/plugins/optimistic | Optimistic Plugin Documentation}
 *
 * @returns Optimistic plugin instance
 *
 * @example
 * ```ts
 * import { Spoosh } from "@spoosh/core";
 *
 * const spoosh = new Spoosh<ApiSchema, Error>("/api")
 *   .use([
 *     // ... other plugins
 *     optimisticPlugin(),
 *   ]);
 *
 * // Optimistic update
 * trigger({
 *   optimistic: (cache) => cache("posts")
 *     .set(posts => posts.filter(p => p.id !== deletedId)),
 * });
 * ```
 *
 * @example
 * ```ts
 * // With filter and confirmed update
 * trigger({
 *   optimistic: (cache) => cache("posts/:id")
 *     .filter(e => e.params.id === 1)
 *     .set(post => ({ ...post, pending: true }))
 *     .confirmed()
 *     .set((post, response) => response),
 * });
 * ```
 *
 * @example
 * ```ts
 * // Confirmed only (post-success)
 * trigger({
 *   optimistic: (cache) => cache("posts")
 *     .confirmed()
 *     .set((posts, newPost) => [...posts, newPost]),
 * });
 * ```
 */
const PLUGIN_NAME = "spoosh:optimistic";

export function optimisticPlugin() {
  return createSpooshPlugin<{
    readOptions: OptimisticReadOptions;
    writeOptions: OptimisticWriteOptions;
    writeTriggerOptions: OptimisticWriteTriggerOptions;
    pagesOptions: OptimisticPagesOptions;
    readResult: OptimisticReadResult;
    writeResult: OptimisticWriteResult;
  }>({
    name: PLUGIN_NAME,
    operations: ["write"],
    dependencies: ["spoosh:invalidation"],

    middleware: async (context, next) => {
      const t = context.tracer?.(PLUGIN_NAME);
      const { stateManager } = context;
      const targets = resolveOptimisticTargets(context);

      if (targets.length === 0) {
        t?.skip("No optimistic targets");
        return next();
      }

      context.plugins.get("spoosh:invalidation")?.setDefaultMode("none");

      const allImmediateSnapshots: OptimisticSnapshot[] = [];

      for (const target of targets) {
        if (!target.immediateUpdater) continue;

        const snapshots = applyUpdate(
          stateManager,
          target,
          target.immediateUpdater,
          undefined,
          t
        );

        for (const snapshot of snapshots) {
          t?.log(
            `Applied optimistic update to ${formatCacheKeyForTrace(snapshot.key)}`,
            { diff: buildSingleDiff(snapshot) }
          );
        }

        allImmediateSnapshots.push(...snapshots);
      }

      const response = await next();

      if (response.error) {
        const shouldRollback = targets.some(
          (target) => target.rollbackOnError && target.immediateUpdater
        );

        if (shouldRollback && allImmediateSnapshots.length > 0) {
          rollbackOptimistic(stateManager, allImmediateSnapshots);

          for (const snapshot of allImmediateSnapshots) {
            t?.log(`Rolled back ${formatCacheKeyForTrace(snapshot.key)}`, {
              color: "warning",
              diff: buildSingleDiff(snapshot, "rollback"),
            });
          }
        }

        for (const target of targets) {
          if (target.onError) {
            target.onError(response.error);
          }
        }
      } else {
        if (allImmediateSnapshots.length > 0) {
          confirmOptimistic(stateManager, allImmediateSnapshots);
        }

        for (const target of targets) {
          if (!target.confirmedUpdater) continue;

          const snapshots = applyUpdate(
            stateManager,
            target,
            target.confirmedUpdater,
            response.data,
            t
          );

          for (const snapshot of snapshots) {
            t?.log(
              `Applied confirmed update to ${formatCacheKeyForTrace(snapshot.key)}`,
              {
                color: "success",
                diff: buildSingleDiff(snapshot, "confirmed"),
              }
            );
          }
        }
      }

      return response;
    },
  });
}
