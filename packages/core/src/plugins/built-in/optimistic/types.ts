import type {
  CacheConfig,
  ResolvedCacheConfig,
  OptimisticSchemaHelper,
} from "../../../types/optimistic.types";

export type { CacheConfig, ResolvedCacheConfig, OptimisticSchemaHelper };

export type OptimisticPluginConfig = object;

export type OptimisticCallbackFn<TSchema = unknown, TResponse = unknown> = (
  cache: <TData>(config: CacheConfig<TData, TResponse>) => ResolvedCacheConfig,
  api: OptimisticSchemaHelper<TSchema>
) => ResolvedCacheConfig | ResolvedCacheConfig[];

export interface OptimisticWriteOptions<TSchema = unknown> {
  optimistic?: OptimisticCallbackFn<TSchema>;
}

export type OptimisticReadOptions = object;

export type OptimisticInfiniteReadOptions = object;

export interface OptimisticReadResult {
  isOptimistic: boolean;
}

export type OptimisticWriteResult = object;
