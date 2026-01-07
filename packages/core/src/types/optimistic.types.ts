import type { EnlaceResponse } from "./response.types";
import type { SchemaMethod } from "./common.types";
import type { ExtractData } from "./endpoint.types";

type ExtractOptimisticData<T> = T extends { data: infer D }
  ? D
  : T extends void
    ? void
    : T;

type EndpointToOptimisticMethod<T> = () => Promise<
  EnlaceResponse<ExtractOptimisticData<T>, unknown>
>;

export type OptimisticSchemaHelper<TSchema> = {
  [K in keyof TSchema as K extends SchemaMethod | "_"
    ? never
    : K extends keyof TSchema
      ? K
      : never]: K extends keyof TSchema
    ? OptimisticSchemaHelper<TSchema[K]>
    : never;
} & {
  [K in SchemaMethod as K extends keyof TSchema
    ? K
    : never]: K extends keyof TSchema
    ? EndpointToOptimisticMethod<TSchema[K]>
    : never;
} & (TSchema extends { _: infer D }
    ? {
        [key: string]: OptimisticSchemaHelper<D>;
        [key: number]: OptimisticSchemaHelper<D>;
      }
    : object);

/** Base config options shared by both timing modes */
type CacheConfigBase<TData> = {
  for: () => Promise<EnlaceResponse<TData, unknown>>;
  rollbackOnError?: boolean;
  refetch?: boolean;
  onError?: (error: unknown) => void;
};

/** Config for immediate timing (default) - no response available */
type ImmediateCacheConfig<TData> = CacheConfigBase<TData> & {
  timing?: "immediate";
  updater: (data: TData) => TData;
};

/** Config for onSuccess timing - response is available */
type OnSuccessCacheConfig<TData, TResponse> = CacheConfigBase<TData> & {
  timing: "onSuccess";
  updater: (data: TData, response: TResponse) => TData;
};

/** Combined cache config - discriminated by timing */
export type CacheConfig<TData, TResponse = unknown> =
  | ImmediateCacheConfig<TData>
  | OnSuccessCacheConfig<TData, TResponse>;

export type ResolvedCacheConfig = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for: (...args: any[]) => Promise<EnlaceResponse<unknown, unknown>>;
  timing?: "immediate" | "onSuccess";
  updater: (data: unknown, response?: unknown) => unknown;
  rollbackOnError?: boolean;
  refetch?: boolean;
  onError?: (error: unknown) => void;
};

type OptimisticCallbackFn<TSchema, TResponse = unknown> = (
  cache: <TData>(config: CacheConfig<TData, TResponse>) => ResolvedCacheConfig,
  api: OptimisticSchemaHelper<TSchema>
) => ResolvedCacheConfig | ResolvedCacheConfig[];

type MutationOptimisticOption<TRootSchema, TResponse = unknown> = {
  optimistic?: OptimisticCallbackFn<TRootSchema, TResponse>;
};

export type WithOptimistic<
  TSchema,
  TMethod extends SchemaMethod,
  TDefaultError,
  TRootSchema,
> = TMethod extends "$get"
  ? object
  : MutationOptimisticOption<
      TRootSchema,
      ExtractData<TSchema, TMethod, TDefaultError>
    >;
