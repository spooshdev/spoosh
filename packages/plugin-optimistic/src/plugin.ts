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

type OptimisticSnapshot = {
  key: string;
  previousData: unknown;
  afterData: unknown;
};

/**
 * Creates a chainable builder for optimistic updates.
 * All methods are available in any order.
 * Runtime object includes both data properties and builder methods.
 */
function createBuilder(state: OptimisticTarget): unknown {
  return {
    ...state,

    WHERE(predicate: (options: unknown) => boolean) {
      return createBuilder({ ...state, where: predicate });
    },

    UPDATE_CACHE(updater: (data: unknown, response?: unknown) => unknown) {
      return createBuilder({ ...state, updater });
    },

    ON_SUCCESS() {
      return createBuilder({ ...state, timing: "onSuccess" });
    },

    NO_ROLLBACK() {
      return createBuilder({ ...state, rollbackOnError: false });
    },

    ON_ERROR(callback: (error: unknown) => void) {
      return createBuilder({ ...state, onError: callback });
    },
  };
}

/**
 * Creates a proxy for selecting cache entries with the fluent optimistic API.
 *
 * @returns A proxy that supports: api("path").GET().UPDATE_CACHE(...).WHERE(...)...
 */
function createOptimisticProxy<TSchema>(): TSchema {
  const createMethodsProxy = (path: string): unknown => ({
    GET: () =>
      createBuilder({
        path,
        method: "GET",
        timing: "immediate",
        rollbackOnError: true,
      }),
  });

  return ((path: string) => createMethodsProxy(path)) as TSchema;
}

function resolveOptimisticTargets(context: PluginContext): OptimisticTarget[] {
  const pluginOptions = context.pluginOptions as
    | OptimisticWriteTriggerOptions
    | undefined;

  if (!pluginOptions?.optimistic) return [];

  const apiProxy = createOptimisticProxy();
  const result = pluginOptions.optimistic(apiProxy as never);

  const targets = Array.isArray(result) ? result : [result];

  return targets as unknown as OptimisticTarget[];
}

function getMatchingEntries(
  stateManager: StateManager,
  targetPath: string,
  targetMethod: string
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

  if (hasPatternParams(targetPath)) {
    const allEntries = stateManager.getAllCacheEntries();

    for (const { key, entry } of allEntries) {
      if (!key.includes(`"method":"${targetMethod}"`)) continue;

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
    const allEntries = stateManager.getAllCacheEntries();

    for (const { key, entry } of allEntries) {
      if (!key.includes(`"method":"${targetMethod}"`)) continue;

      const actualPath = extractPathFromKey(key);

      if (!actualPath) continue;

      if (actualPath === targetPath) {
        results.push({ key, entry, extractedParams: {}, paramMapping: {} });
      }
    }
  }

  return results;
}

function applyOptimisticUpdate(
  stateManager: StateManager,
  target: OptimisticTarget,
  t?: RequestTracer
): OptimisticSnapshot[] {
  if (!target.updater) return [];

  const snapshots: OptimisticSnapshot[] = [];
  const matchingEntries = getMatchingEntries(
    stateManager,
    target.path,
    target.method
  );

  if (matchingEntries.length === 0) {
    t?.skip(`Skipped ${target.path} (no cache entry)`);
    return [];
  }

  for (const { key, entry, extractedParams, paramMapping } of matchingEntries) {
    if (target.where) {
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
        if (!target.where(mergedOptions)) {
          t?.skip(`Skipped ${formatCacheKeyForTrace(key)} (WHERE not matched)`);
          continue;
        }
      } catch {
        t?.skip(`Skipped ${formatCacheKeyForTrace(key)} (WHERE error)`);
        continue;
      }
    }

    if (entry?.state.data === undefined) {
      t?.skip(`Skipped ${formatCacheKeyForTrace(key)} (no cached data)`);
      continue;
    }

    const afterData = target.updater(entry.state.data, undefined);

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
  mode: "apply" | "rollback" | "onSuccess" = "apply"
): { before: unknown; after: unknown; label: string } {
  const label =
    mode === "apply"
      ? "Optimistic update"
      : mode === "rollback"
        ? "Rollback optimistic"
        : "onSuccess update";

  return mode === "apply" || mode === "onSuccess"
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
 * // Methods can be chained in any order
 * trigger({
 *   optimistic: (api) => api("posts")
 *     .GET()
 *     .UPDATE_CACHE(posts => posts.filter(p => p.id !== deletedId)),
 * });
 * ```
 *
 * @example
 * ```ts
 * // With WHERE filter and disable rollback
 * trigger({
 *   optimistic: (api) => api("posts")
 *     .GET()
 *     .NO_ROLLBACK()
 *     .WHERE(entry => entry.query.page === 1)
 *     .UPDATE_CACHE(posts => [newPost, ...posts]),
 * });
 * ```
 *
 * @example
 * ```ts
 * // Apply after success with typed response
 * trigger({
 *   optimistic: (api) => api("posts")
 *     .GET()
 *     .ON_SUCCESS()
 *     .UPDATE_CACHE((posts, newPost) => [...posts, newPost]),
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

      const immediateTargets = targets.filter((t) => t.timing !== "onSuccess");
      const allSnapshots: OptimisticSnapshot[] = [];

      for (const target of immediateTargets) {
        const snapshots = applyOptimisticUpdate(stateManager, target, t);

        for (const snapshot of snapshots) {
          t?.log(
            `Applied optimistic update to ${formatCacheKeyForTrace(snapshot.key)}`,
            {
              diff: buildSingleDiff(snapshot),
            }
          );
        }

        allSnapshots.push(...snapshots);
      }

      const response = await next();

      if (response.error) {
        const shouldRollback = targets.some(
          (t) => t.rollbackOnError && t.timing !== "onSuccess"
        );

        if (shouldRollback && allSnapshots.length > 0) {
          rollbackOptimistic(stateManager, allSnapshots);

          for (const snapshot of allSnapshots) {
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
        if (allSnapshots.length > 0) {
          confirmOptimistic(stateManager, allSnapshots);
        }

        const onSuccessTargets = targets.filter(
          (target) => target.timing === "onSuccess"
        );

        const onSuccessSnapshots: OptimisticSnapshot[] = [];

        for (const target of onSuccessTargets) {
          if (!target.updater) continue;

          const matchingEntries = getMatchingEntries(
            stateManager,
            target.path,
            target.method
          );

          if (matchingEntries.length === 0) {
            t?.skip(`Skipped ${target.path} (no cache entry)`);
            continue;
          }

          for (const {
            key,
            entry,
            extractedParams,
            paramMapping,
          } of matchingEntries) {
            if (target.where) {
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
                if (!target.where(mergedOptions)) {
                  t?.skip(
                    `Skipped ${formatCacheKeyForTrace(key)} (WHERE not matched)`
                  );
                  continue;
                }
              } catch {
                t?.skip(`Skipped ${formatCacheKeyForTrace(key)} (WHERE error)`);
                continue;
              }
            }

            if (entry?.state.data === undefined) {
              t?.skip(
                `Skipped ${formatCacheKeyForTrace(key)} (no cached data)`
              );
              continue;
            }

            const afterData = target.updater(entry.state.data, response.data);

            const snapshot = {
              key,
              previousData: entry.state.data,
              afterData,
            };

            onSuccessSnapshots.push(snapshot);

            stateManager.setCache(key, {
              state: {
                ...entry.state,
                data: afterData,
              },
            });

            t?.log(
              `Applied onSuccess update to ${formatCacheKeyForTrace(key)}`,
              {
                color: "success",
                diff: buildSingleDiff(snapshot, "onSuccess"),
              }
            );
          }
        }
      }

      return response;
    },
  });
}
