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

/**
 * Configuration for a single optimistic update target.
 *
 * @typeParam TFor - The endpoint function to update
 * @typeParam TResponse - The mutation response type
 * @typeParam TData - The cached data type (inferred from TFor)
 * @typeParam TRequest - The request options type (inferred from TFor)
 */
export type CacheConfig<
  TFor extends () => Promise<EnlaceResponse<unknown, unknown, unknown>>,
  TResponse = unknown,
  TData = ExtractResponseData<Awaited<ReturnType<TFor>>>,
  TRequest = CleanRequestOptions<
    ExtractRequestOptions<Awaited<ReturnType<TFor>>>
  >,
> = {
  /** The endpoint to apply optimistic update to. */
  for: TFor;

  /** Filter function to match specific cached entries. Only available when the endpoint has request options. */
  match?: [TRequest] extends [never] ? never : (request: TRequest) => boolean;

  /** When to apply the update. `"immediate"` (default) or `"onSuccess"`. */
  timing?: "immediate" | "onSuccess";

  /** Function to update the cached data. Receives current data and optionally the mutation response. */
  updater: (data: TData, response?: TResponse) => TData;

  /** Whether to rollback on error. Defaults to `true`. */
  rollbackOnError?: boolean;

  /** Whether to refetch after mutation completes. Defaults to `false`. */
  refetch?: boolean;

  /** Callback when an error occurs. */
  onError?: (error: unknown) => void;
};

/**
 * Resolved cache config with erased generics for internal use.
 */
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

/**
 * Callback function for defining optimistic updates.
 *
 * @typeParam TSchema - The API schema type
 * @typeParam TResponse - The mutation response type
 *
 * @param $ - Helper function to create type-safe cache configs
 * @param api - API proxy for type-safe endpoint references
 * @returns Single or array of cache configs
 */
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

/**
 * Options available in useWrite when optimistic plugin is enabled.
 */
export interface OptimisticWriteOptions<TSchema = unknown> {
  /** Callback to define optimistic updates for cached queries. */
  optimistic?: OptimisticCallbackFn<TSchema>;
}

export type OptimisticReadOptions = object;

export type OptimisticInfiniteReadOptions = object;

/**
 * Result properties added by optimistic plugin to useRead return value.
 */
export interface OptimisticReadResult {
  /** Whether the current data is from an optimistic update. */
  isOptimistic: boolean;
}

export type OptimisticWriteResult = object;
