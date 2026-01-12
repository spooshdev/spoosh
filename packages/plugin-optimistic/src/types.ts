import type { SpooshResponse, QuerySchemaHelper } from "@spoosh/core";

type ExtractResponseData<T> =
  T extends SpooshResponse<infer D, unknown, unknown> ? D : unknown;

type ExtractRequestOptions<T> =
  T extends SpooshResponse<unknown, unknown, infer R> ? R : never;

type CleanRequestOptions<T> = unknown extends T
  ? never
  : keyof T extends never
    ? never
    : T;

export type CacheConfig<
  TFor extends () => Promise<SpooshResponse<unknown, unknown, unknown>>,
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

  onError?: (error: unknown) => void;
};

export type ResolvedCacheConfig = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for: (...args: any[]) => Promise<SpooshResponse<unknown, unknown>>;

  match?: (request: Record<string, unknown>) => boolean;

  timing?: "immediate" | "onSuccess";

  updater: (data: unknown, response?: unknown) => unknown;

  rollbackOnError?: boolean;

  onError?: (error: unknown) => void;
};

export type OptimisticCallbackFn<TSchema = unknown, TResponse = unknown> = (
  $: <TFor extends () => Promise<SpooshResponse<unknown, unknown, unknown>>>(
    config: CacheConfig<TFor, TResponse>
  ) => ResolvedCacheConfig,
  api: QuerySchemaHelper<TSchema>
) => ResolvedCacheConfig | ResolvedCacheConfig[];

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

declare module "@spoosh/core" {
  interface PluginResolvers<TContext> {
    optimistic: OptimisticCallbackFn<TContext["schema"]> | undefined;
  }
}
