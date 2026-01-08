import type { EnlacePlugin, PluginContext } from "../../types";
import type { ResolvedCacheConfig } from "../../../types/optimistic.types";
import type { StateManager } from "../../../state/manager";
import type {
  OptimisticWriteOptions,
  OptimisticReadOptions,
  OptimisticInfiniteReadOptions,
  OptimisticReadResult,
  OptimisticWriteResult,
  CacheConfig,
} from "./types";

export type {
  OptimisticWriteOptions,
  OptimisticReadOptions,
  OptimisticInfiniteReadOptions,
  OptimisticReadResult,
  OptimisticWriteResult,
  CacheConfig,
};
export type {
  OptimisticCallbackFn,
  ResolvedCacheConfig,
  OptimisticSchemaHelper,
} from "./types";

export type OptimisticPluginConfig = object;

type TrackedFunction = (() => Promise<{ data: undefined }>) & {
  __trackedPath?: string[];
  __trackedMethod?: string;
};

type ParsedRequest = {
  query?: Record<string, unknown>;
  params?: Record<string, unknown>;
  body?: unknown;
};

type OptimisticSnapshot = {
  key: string;
  previousData: unknown;
};

function createApiProxy(): unknown {
  const createTrackingProxy = (path: string[]): unknown => {
    const handler: ProxyHandler<object> = {
      get(_, prop) {
        const propStr = String(prop);

        if (
          propStr === "$get" ||
          propStr === "$post" ||
          propStr === "$put" ||
          propStr === "$patch" ||
          propStr === "$delete"
        ) {
          const fn: TrackedFunction = () =>
            Promise.resolve({ data: undefined });
          fn.__trackedPath = path;
          fn.__trackedMethod = propStr;
          return fn;
        }

        return createTrackingProxy([...path, propStr]);
      },
    };

    return new Proxy({}, handler);
  };

  return createTrackingProxy([]);
}

function extractTagsFromFor(forFn: ResolvedCacheConfig["for"]): string[] {
  const fn = forFn as TrackedFunction;
  const path = fn.__trackedPath ?? [];

  const tags: string[] = [];
  let currentPath = "";

  for (const segment of path) {
    currentPath = currentPath ? `${currentPath}/${segment}` : segment;
    tags.push(currentPath);
  }

  return tags;
}

function getExactPath(tags: string[]): string | undefined {
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
  const pluginOptions = context.metadata.get("pluginOptions") as
    | OptimisticWriteOptions
    | undefined;

  if (!pluginOptions?.optimistic) return [];

  const cache = <TData, TRequest = unknown>(
    config: CacheConfig<TData, unknown, TRequest>
  ): ResolvedCacheConfig => ({
    for: config.for as ResolvedCacheConfig["for"],
    match: config.match as ResolvedCacheConfig["match"],
    timing: config.timing,
    updater: config.updater as ResolvedCacheConfig["updater"],
    rollbackOnError: config.rollbackOnError,
    refetch: config.refetch,
    onError: config.onError,
  });

  const apiProxy = createApiProxy();
  const result = pluginOptions.optimistic(cache, apiProxy as never);

  return Array.isArray(result) ? result : [result];
}

function applyOptimisticUpdate(
  stateManager: StateManager,
  config: ResolvedCacheConfig
): OptimisticSnapshot[] {
  const tags = extractTagsFromFor(config.for);
  const targetExactPath = getExactPath(tags);

  if (!targetExactPath) return [];

  const snapshots: OptimisticSnapshot[] = [];
  const entries = stateManager.getCacheEntriesByTags(tags);

  for (const { key, entry } of entries) {
    if (key.includes('"type":"infinite-tracker"')) continue;

    if (config.match) {
      const request = parseRequestFromKey(key);
      if (!request || !config.match(request)) continue;
    }

    const entryExactPath = getExactPath(entry.tags);

    if (entryExactPath !== targetExactPath) continue;
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

export function optimisticPlugin(): EnlacePlugin<
  OptimisticReadOptions,
  OptimisticWriteOptions,
  OptimisticInfiniteReadOptions,
  OptimisticReadResult,
  OptimisticWriteResult
> {
  return {
    name: "enlace:optimistic",
    operations: ["write"],

    handlers: {
      beforeFetch(context: PluginContext) {
        const { stateManager } = context;
        const configs = resolveOptimisticConfigs(context);
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
          context.metadata.set("optimisticSnapshots", allSnapshots);
        }

        return context;
      },

      onSuccess(context: PluginContext) {
        const { stateManager } = context;
        const configs = resolveOptimisticConfigs(context);
        const snapshots =
          (context.metadata.get(
            "optimisticSnapshots"
          ) as OptimisticSnapshot[]) ?? [];

        if (snapshots.length > 0) {
          confirmOptimistic(stateManager, snapshots);
        }

        const onSuccessConfigs = configs.filter(
          (c) => c.timing === "onSuccess"
        );

        for (const config of onSuccessConfigs) {
          const tags = extractTagsFromFor(config.for);
          const targetExactPath = getExactPath(tags);

          if (!targetExactPath) continue;

          const entries = stateManager.getCacheEntriesByTags(tags);

          for (const { key, entry } of entries) {
            if (config.match) {
              const request = parseRequestFromKey(key);
              if (!request || !config.match(request)) continue;
            }

            const entryExactPath = getExactPath(entry.tags);

            if (entryExactPath !== targetExactPath) continue;

            stateManager.setCache(key, {
              state: {
                ...entry.state,
                data: config.updater(entry.state.data, context.response?.data),
              },
            });
          }

          if (config.refetch) {
            context.eventEmitter.emit("invalidate", tags);
          }
        }

        for (const config of configs) {
          if (config.timing !== "onSuccess" && config.refetch) {
            const tags = extractTagsFromFor(config.for);
            context.eventEmitter.emit("invalidate", tags);
          }
        }

        return context;
      },

      onError(context: PluginContext) {
        const { stateManager } = context;
        const configs = resolveOptimisticConfigs(context);
        const snapshots =
          (context.metadata.get(
            "optimisticSnapshots"
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
