import type { EnlacePlugin, PluginContext } from "../../types";
import type { ResolvedCacheConfig } from "./types";
import type { StateManager } from "../../../state/manager";
import {
  createApiProxy,
  extractPathFromTracked,
  pathToTags,
} from "../../../utils/api-proxy";
import type {
  OptimisticWriteOptions,
  OptimisticReadOptions,
  OptimisticInfiniteReadOptions,
  OptimisticReadResult,
  OptimisticWriteResult,
  CacheConfig,
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
  return pathToTags(extractPathFromTracked(forFn));
}

function getExactMatchPath(tags: string[]): string | undefined {
  return tags.length > 0 ? tags[tags.length - 1] : undefined;
}

function parseRequestFromKey(key: string): ParsedRequest | undefined {
  try {
    const parsed = JSON.parse(key) as {
      options?: { query?: unknown; params?: unknown; body?: unknown };
    };

    return {
      query: parsed.options?.query as Record<string, unknown> | undefined,
      params: parsed.options?.params as Record<string, unknown> | undefined,
      body: parsed.options?.body,
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

  const apiProxy = createApiProxy();
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
        isOptimistic: true,
      },
    });
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
        state: {
          ...entry.state,
          isOptimistic: false,
        },
      });
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
          isOptimistic: false,
        },
      });
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
export function optimisticPlugin(): EnlacePlugin<{
  readOptions: OptimisticReadOptions;
  writeOptions: OptimisticWriteOptions;
  infiniteReadOptions: OptimisticInfiniteReadOptions;
  readResult: OptimisticReadResult;
  writeResult: OptimisticWriteResult;
}> {
  return {
    name: "enlace:optimistic",
    operations: ["write"],

    handlers: {
      beforeFetch(context: PluginContext) {
        const { stateManager } = context;
        const configs = resolveOptimisticConfigs(context);

        if (configs.length > 0) {
          context.plugins
            .get("enlace:invalidation")
            ?.setAutoInvalidateDefault("none");
        }

        const immediateConfigs = configs.filter(
          (c) => c.timing !== "onSuccess"
        );

        if (immediateConfigs.length === 0) return context;

        const allSnapshots: OptimisticSnapshot[] = [];

        for (const config of immediateConfigs) {
          const snapshots = applyOptimisticUpdate(stateManager, config);
          allSnapshots.push(...snapshots);
        }

        if (allSnapshots.length > 0) {
          context.metadata.set(OPTIMISTIC_SNAPSHOTS_KEY, allSnapshots);
        }

        return context;
      },

      onSuccess(context: PluginContext) {
        const { stateManager } = context;
        const configs = resolveOptimisticConfigs(context);
        const snapshots =
          (context.metadata.get(
            OPTIMISTIC_SNAPSHOTS_KEY
          ) as OptimisticSnapshot[]) ?? [];

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
            if (config.match) {
              const request = parseRequestFromKey(key);
              if (!request || !config.match(request)) continue;
            }

            stateManager.setCache(key, {
              state: {
                ...entry.state,
                data: config.updater(entry.state.data, context.response?.data),
              },
            });
          }
        }

        return context;
      },

      onError(context: PluginContext) {
        const { stateManager } = context;
        const configs = resolveOptimisticConfigs(context);
        const snapshots =
          (context.metadata.get(
            OPTIMISTIC_SNAPSHOTS_KEY
          ) as OptimisticSnapshot[]) ?? [];

        const shouldRollback = configs.some(
          (c) => c.rollbackOnError !== false && c.timing !== "onSuccess"
        );

        if (shouldRollback && snapshots.length > 0) {
          rollbackOptimistic(stateManager, snapshots);
        }

        for (const config of configs) {
          if (config.onError) {
            config.onError(context.response?.error);
          }
        }

        return context;
      },
    },
  };
}
