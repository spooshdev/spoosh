import type { EnlaceResponse } from "../../../types/response.types";
import type { SchemaMethod } from "../../../types/common.types";
import type { ExtractData } from "../../../types/endpoint.types";
import type { QuerySchemaHelper } from "../../schema-helper";

type ExtractResponseData<T> =
  T extends EnlaceResponse<infer D, unknown, unknown> ? D : unknown;

type ExtractRequestOptions<T> =
  T extends EnlaceResponse<unknown, unknown, infer R> ? R : never;

type CleanRequestOptions<T> = unknown extends T
  ? never
  : keyof T extends never
    ? never
    : T;

export type CacheConfig<
  TFor extends () => Promise<EnlaceResponse<unknown, unknown, unknown>>,
  TResponse = unknown,
  TData = ExtractResponseData<Awaited<ReturnType<TFor>>>,
  TRequest = CleanRequestOptions<
    ExtractRequestOptions<Awaited<ReturnType<TFor>>>
  >,
> = {
  for: TFor;
  match?: [TRequest] extends [never] ? never : (request: TRequest) => boolean;
  timing?: "immediate" | "onSuccess";
  updater: (data: TData, response?: TResponse) => TData;
  rollbackOnError?: boolean;
  refetch?: boolean;
  onError?: (error: unknown) => void;
};

export type ResolvedCacheConfig = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for: (...args: any[]) => Promise<EnlaceResponse<unknown, unknown>>;
  match?: (request: Record<string, unknown>) => boolean;
  timing?: "immediate" | "onSuccess";
  updater: (data: unknown, response?: unknown) => unknown;
  rollbackOnError?: boolean;
  refetch?: boolean;
  onError?: (error: unknown) => void;
};

export type OptimisticCallbackFn<TSchema = unknown, TResponse = unknown> = (
  $: <TFor extends () => Promise<EnlaceResponse<unknown, unknown, unknown>>>(
    config: CacheConfig<TFor, TResponse>
  ) => ResolvedCacheConfig,
  api: QuerySchemaHelper<TSchema>
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

export type OptimisticPluginConfig = object;

export interface OptimisticWriteOptions<TSchema = unknown> {
  optimistic?: OptimisticCallbackFn<TSchema>;
}

export type OptimisticReadOptions = object;

export type OptimisticInfiniteReadOptions = object;

export interface OptimisticReadResult {
  isOptimistic: boolean;
}

export type OptimisticWriteResult = object;
