import type { SpooshPlugin, PluginContext, StateManager } from "@spoosh/core";
import { generateTags } from "@spoosh/core";
import "@spoosh/plugin-invalidation";
import type {
  OptimisticWriteOptions,
  OptimisticReadOptions,
  OptimisticInfiniteReadOptions,
  OptimisticReadResult,
  OptimisticWriteResult,
  OptimisticTarget,
} from "./types";

export const OPTIMISTIC_SNAPSHOTS_KEY = "optimistic:snapshots";

type OptimisticSnapshot = {
  key: string;
  previousData: unknown;
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

function extractTagsFromPath(path: string): string[] {
  const pathSegments = path.split("/").filter(Boolean);
  return generateTags(pathSegments);
}

function getExactMatchPath(tags: string[]): string | undefined {
  return tags.length > 0 ? tags[tags.length - 1] : undefined;
}

/**
 * Extract options (query, params) from cache key for WHERE predicate.
 * Supports multiple cache key structures:
 * - Regular read: { path, method, options: { query?, params? } }
 * - Infinite read: { path, method, pageRequest: { query?, params? } }
 */
function extractOptionsFromKey(
  key: string
): { query?: unknown; params?: unknown } | null {
  try {
    const parsed = JSON.parse(key);
    const result: { query?: unknown; params?: unknown } = {};

    const opts = parsed.options ?? parsed.pageRequest;

    if (!opts) return null;

    if (opts.query) {
      result.query = opts.query;
    }

    if (opts.params) {
      result.params = opts.params;
    }

    return Object.keys(result).length > 0 ? result : null;
  } catch {
    return null;
  }
}

function resolveOptimisticTargets(context: PluginContext): OptimisticTarget[] {
  const pluginOptions = context.pluginOptions as
    | OptimisticWriteOptions
    | undefined;

  if (!pluginOptions?.optimistic) return [];

  const apiProxy = createOptimisticProxy();
  const result = pluginOptions.optimistic(apiProxy as never);

  const targets = Array.isArray(result) ? result : [result];

  return targets as unknown as OptimisticTarget[];
}

function applyOptimisticUpdate(
  stateManager: StateManager,
  target: OptimisticTarget
): OptimisticSnapshot[] {
  if (!target.updater) return [];

  const tags = extractTagsFromPath(target.path);
  const targetSelfTag = getExactMatchPath(tags);

  if (!targetSelfTag) return [];

  const snapshots: OptimisticSnapshot[] = [];
  const entries = stateManager.getCacheEntriesBySelfTag(targetSelfTag);

  for (const { key, entry } of entries) {
    if (key.includes('"type":"infinite-tracker"')) {
      continue;
    }

    if (!key.includes(`"method":"${target.method}"`)) {
      continue;
    }

    if (target.where) {
      const options = extractOptionsFromKey(key);

      if (!options || !target.where(options)) {
        continue;
      }
    }

    if (entry.state.data === undefined) {
      continue;
    }

    snapshots.push({ key, previousData: entry.state.data });

    stateManager.setCache(key, {
      previousData: entry.state.data,
      state: {
        ...entry.state,
        data: target.updater(entry.state.data, undefined),
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

/**
 * Enables optimistic updates for mutations.
 *
 * Immediately updates cached data before the mutation completes,
 * with automatic rollback on error.
 *
 * When using optimistic updates, `autoInvalidate` defaults to `"none"` to prevent
 * unnecessary refetches that would override the optimistic data. You can override
 * this by explicitly setting `autoInvalidate` or using the `invalidate` option.
 *
 * @see {@link https://spoosh.dev/docs/plugins/optimistic | Optimistic Plugin Documentation}
 *
 * @returns Optimistic plugin instance
 *
 * @example
 * ```ts
 * import { Spoosh } from "@spoosh/core";
 *
 * const client = new Spoosh<ApiSchema, Error>("/api")
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
export function optimisticPlugin(): SpooshPlugin<{
  readOptions: OptimisticReadOptions;
  writeOptions: OptimisticWriteOptions;
  infiniteReadOptions: OptimisticInfiniteReadOptions;
  readResult: OptimisticReadResult;
  writeResult: OptimisticWriteResult;
}> {
  return {
    name: "spoosh:optimistic",
    operations: ["write"],
    dependencies: ["spoosh:invalidation"],

    middleware: async (context, next) => {
      const { stateManager } = context;
      const targets = resolveOptimisticTargets(context);

      if (targets.length > 0) {
        context.plugins
          .get("spoosh:invalidation")
          ?.setAutoInvalidateDefault("none");
      }

      const immediateTargets = targets.filter((t) => t.timing !== "onSuccess");
      const allSnapshots: OptimisticSnapshot[] = [];

      for (const target of immediateTargets) {
        const snapshots = applyOptimisticUpdate(stateManager, target);
        allSnapshots.push(...snapshots);
      }

      if (allSnapshots.length > 0) {
        context.metadata.set(OPTIMISTIC_SNAPSHOTS_KEY, allSnapshots);
      }

      const response = await next();

      const snapshots =
        (context.metadata.get(
          OPTIMISTIC_SNAPSHOTS_KEY
        ) as OptimisticSnapshot[]) ?? [];

      if (response.error) {
        const shouldRollback = targets.some(
          (t) => t.rollbackOnError && t.timing !== "onSuccess"
        );

        if (shouldRollback && snapshots.length > 0) {
          rollbackOptimistic(stateManager, snapshots);
        }

        for (const target of targets) {
          if (target.onError) {
            target.onError(response.error);
          }
        }
      } else {
        if (snapshots.length > 0) {
          confirmOptimistic(stateManager, snapshots);
        }

        const onSuccessTargets = targets.filter(
          (t) => t.timing === "onSuccess"
        );

        for (const target of onSuccessTargets) {
          if (!target.updater) continue;

          const tags = extractTagsFromPath(target.path);
          const targetSelfTag = getExactMatchPath(tags);

          if (!targetSelfTag) continue;

          const entries = stateManager.getCacheEntriesBySelfTag(targetSelfTag);

          for (const { key, entry } of entries) {
            if (key.includes('"type":"infinite-tracker"')) {
              continue;
            }

            if (!key.includes(`"method":"${target.method}"`)) {
              continue;
            }

            if (target.where) {
              const options = extractOptionsFromKey(key);

              if (!options || !target.where(options)) {
                continue;
              }
            }

            if (entry.state.data === undefined) {
              continue;
            }

            stateManager.setCache(key, {
              state: {
                ...entry.state,
                data: target.updater(entry.state.data, response.data),
              },
            });
          }
        }
      }

      return response;
    },
  };
}
