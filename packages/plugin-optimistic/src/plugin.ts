import type { SpooshPlugin, PluginContext, StateManager } from "@spoosh/core";
import {
  createSelectorProxy,
  extractPathFromSelector,
  generateTags,
} from "@spoosh/core";
import "@spoosh/plugin-invalidation";
import type {
  OptimisticWriteOptions,
  OptimisticReadOptions,
  OptimisticInfiniteReadOptions,
  OptimisticReadResult,
  OptimisticWriteResult,
  CacheConfig,
  ResolvedCacheConfig,
} from "./types";

export const OPTIMISTIC_SNAPSHOTS_KEY = "optimistic:snapshots";

type ParsedRequest = {
  query?: Record<string, unknown>;
  params?: Record<string, unknown>;
  body?: unknown;
};

type OptimisticSnapshot = {
  key: string;
  previousData: unknown;
};

function extractTagsFromFor(forFn: ResolvedCacheConfig["for"]): string[] {
  return generateTags(extractPathFromSelector(forFn));
}

function getExactMatchPath(tags: string[]): string | undefined {
  return tags.length > 0 ? tags[tags.length - 1] : undefined;
}

function findInObject(obj: unknown, key: string): unknown {
  if (!obj || typeof obj !== "object" || Array.isArray(obj)) {
    return undefined;
  }

  const record = obj as Record<string, unknown>;

  if (key in record) {
    return record[key];
  }

  for (const value of Object.values(record)) {
    const found = findInObject(value, key);
    if (found !== undefined) return found;
  }

  return undefined;
}

function parseRequestFromKey(key: string): ParsedRequest | undefined {
  try {
    const parsed = JSON.parse(key);

    return {
      query: findInObject(parsed, "query") as
        | Record<string, unknown>
        | undefined,
      params: findInObject(parsed, "params") as
        | Record<string, unknown>
        | undefined,
      body: findInObject(parsed, "body"),
    };
  } catch {
    return undefined;
  }
}

function resolveOptimisticConfigs(
  context: PluginContext
): ResolvedCacheConfig[] {
  const pluginOptions = context.pluginOptions as
    | OptimisticWriteOptions
    | undefined;

  if (!pluginOptions?.optimistic) return [];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const $ = (config: CacheConfig<any, unknown>): ResolvedCacheConfig => ({
    for: config.for as ResolvedCacheConfig["for"],
    match: config.match as ResolvedCacheConfig["match"],
    timing: config.timing,
    updater: config.updater as ResolvedCacheConfig["updater"],
    rollbackOnError: config.rollbackOnError,
    onError: config.onError,
  });

  const apiProxy = createSelectorProxy();
  const optimisticConfigs = pluginOptions.optimistic(
    $ as never,
    apiProxy as never
  );

  return Array.isArray(optimisticConfigs)
    ? optimisticConfigs
    : [optimisticConfigs];
}

function applyOptimisticUpdate(
  stateManager: StateManager,
  config: ResolvedCacheConfig
): OptimisticSnapshot[] {
  const tags = extractTagsFromFor(config.for);
  const targetSelfTag = getExactMatchPath(tags);

  if (!targetSelfTag) return [];

  const snapshots: OptimisticSnapshot[] = [];
  const entries = stateManager.getCacheEntriesBySelfTag(targetSelfTag);

  for (const { key, entry } of entries) {
    if (key.includes('"type":"infinite-tracker"')) continue;
    if (!key.includes('"method":"$get"')) continue;

    if (config.match) {
      const request = parseRequestFromKey(key);
      if (!request || !config.match(request)) continue;
    }

    if (entry.state.data === undefined) continue;

    snapshots.push({ key, previousData: entry.state.data });

    stateManager.setCache(key, {
      previousData: entry.state.data,
      state: {
        ...entry.state,
        data: config.updater(entry.state.data, undefined),
      },
    });

    stateManager.setPluginResult(key, { isOptimistic: true });
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

      stateManager.setPluginResult(key, { isOptimistic: false });
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

      stateManager.setPluginResult(key, { isOptimistic: false });
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
 * @returns Optimistic plugin instance
 *
 * @example
 * ```ts
 * const plugins = [optimisticPlugin()];
 *
 * // In useWrite - autoInvalidate defaults to "none" when optimistic is used
 * trigger({
 *   optimistic: ($, api) => $({
 *     for: api.posts.$get,
 *     updater: (posts) => posts.filter(p => p.id !== deletedId),
 *     rollbackOnError: true,
 *   }),
 * });
 * ```
 *
 * @example
 * ```ts
 * // Multiple targets
 * trigger({
 *   optimistic: ($, api) => [
 *     $({ for: api.posts.$get, updater: (posts) => posts.filter(p => p.id !== deletedId) }),
 *     $({ for: api.stats.$get, updater: (stats) => ({ ...stats, count: stats.count - 1 }) }),
 *   ],
 * });
 * ```
 *
 * @example
 * ```ts
 * // Optimistic update with explicit invalidation
 * trigger({
 *   optimistic: ($, api) => $({
 *     for: api.posts.$get,
 *     updater: (posts) => posts.filter(p => p.id !== deletedId),
 *   }),
 *   // By default autoInvalidate is "none" when using optimistic updates
 *   autoInvalidate: "all", // You can override to enable refetching after mutation
 * });
 * ```
 *
 * @example
 * ```ts
 * // Filtering by request
 * trigger({
 *   optimistic: ($, api) => $({
 *     for: api.items.$get,
 *     timing: "onSuccess",
 *     match: (request) => request.query?.page === 1,
 *     updater: (items, newItem) => [newItem!, ...items],
 *   }),
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
      const configs = resolveOptimisticConfigs(context);

      if (configs.length > 0) {
        context.plugins
          .get("spoosh:invalidation")
          ?.setAutoInvalidateDefault("none");
      }

      const immediateConfigs = configs.filter((c) => c.timing !== "onSuccess");
      const allSnapshots: OptimisticSnapshot[] = [];

      for (const config of immediateConfigs) {
        const snapshots = applyOptimisticUpdate(stateManager, config);
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
        const shouldRollback = configs.some(
          (c) => c.rollbackOnError !== false && c.timing !== "onSuccess"
        );

        if (shouldRollback && snapshots.length > 0) {
          rollbackOptimistic(stateManager, snapshots);
        }

        for (const config of configs) {
          if (config.onError) {
            config.onError(response.error);
          }
        }
      } else {
        if (snapshots.length > 0) {
          confirmOptimistic(stateManager, snapshots);
        }

        const onSuccessConfigs = configs.filter(
          (c) => c.timing === "onSuccess"
        );

        for (const config of onSuccessConfigs) {
          const tags = extractTagsFromFor(config.for);
          const targetSelfTag = getExactMatchPath(tags);

          if (!targetSelfTag) continue;

          const entries = stateManager.getCacheEntriesBySelfTag(targetSelfTag);

          for (const { key, entry } of entries) {
            if (!key.includes('"method":"$get"')) continue;

            if (config.match) {
              const request = parseRequestFromKey(key);
              if (!request || !config.match(request)) continue;
            }

            stateManager.setCache(key, {
              state: {
                ...entry.state,
                data: config.updater(entry.state.data, response.data),
              },
            });
          }
        }
      }

      return response;
    },
  };
}
