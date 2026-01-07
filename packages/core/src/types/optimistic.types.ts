import type { EnlaceResponse } from "./response.types";
import type { SchemaMethod } from "./common.types";
import type { ExtractData } from "./endpoint.types";
import type { HasQueryMethods } from "./filtered-client.types";

type ExtractOptimisticData<T> = T extends { data: infer D }
  ? D
  : T extends void
    ? void
    : T;

type ExtractOptimisticRequestOptions<T> = {
  [K in Extract<keyof T, "query" | "body" | "params">]?: T[K];
};

type EndpointToOptimisticMethod<T> = () => Promise<
  EnlaceResponse<
    ExtractOptimisticData<T>,
    unknown,
    ExtractOptimisticRequestOptions<T>
  >
>;

export type OptimisticSchemaHelper<TSchema> = {
  [K in keyof TSchema as K extends SchemaMethod | "_"
    ? never
    : HasQueryMethods<TSchema[K]> extends true
      ? K
      : never]: K extends keyof TSchema
    ? OptimisticSchemaHelper<TSchema[K]>
    : never;
} & {
  [K in "$get" as K extends keyof TSchema ? K : never]: K extends keyof TSchema
    ? EndpointToOptimisticMethod<TSchema[K]>
    : never;
} & (TSchema extends { _: infer D }
    ? HasQueryMethods<D> extends true
      ? {
          [key: string]: OptimisticSchemaHelper<D>;
          [key: number]: OptimisticSchemaHelper<D>;
        }
      : object
    : object);

export type MatchRequest = {
  query?: Record<string, unknown>;
  params?: Record<string, unknown>;
  body?: unknown;
};

type PickRequestFields<T> = [T] extends [unknown]
  ? unknown extends T
    ? MatchRequest
    : Pick<T, Extract<keyof T, "query" | "params" | "body">>
  : Pick<T, Extract<keyof T, "query" | "params" | "body">>;

/** Base config options shared by both timing modes */
type CacheConfigBase<TData, TRequest> = {
  for: () => Promise<EnlaceResponse<TData, unknown, TRequest>>;
  match?: (request: PickRequestFields<TRequest>) => boolean;
  rollbackOnError?: boolean;
  refetch?: boolean;
  onError?: (error: unknown) => void;
};

/** Config for immediate timing (default) - no response available */
type ImmediateCacheConfig<TData, TRequest> = CacheConfigBase<
  TData,
  TRequest
> & {
  timing?: "immediate";
  updater: (data: TData) => TData;
};

/** Config for onSuccess timing - response is available */
type OnSuccessCacheConfig<TData, TResponse, TRequest> = CacheConfigBase<
  TData,
  TRequest
> & {
  timing: "onSuccess";
  updater: (data: TData, response: TResponse) => TData;
};

/** Combined cache config - discriminated by timing */
export type CacheConfig<TData, TResponse = unknown, TRequest = MatchRequest> =
  | ImmediateCacheConfig<TData, TRequest>
  | OnSuccessCacheConfig<TData, TResponse, TRequest>;

export type ResolvedCacheConfig = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for: (...args: any[]) => Promise<EnlaceResponse<unknown, unknown>>;
  match?: (request: MatchRequest) => boolean;
  timing?: "immediate" | "onSuccess";
  updater: (data: unknown, response?: unknown) => unknown;
  rollbackOnError?: boolean;
  refetch?: boolean;
  onError?: (error: unknown) => void;
};

type OptimisticCallbackFn<TSchema, TResponse = unknown> = (
  cache: <TData, TRequest = unknown>(
    config: CacheConfig<TData, TResponse, TRequest>
  ) => ResolvedCacheConfig,
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
