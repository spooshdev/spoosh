import type {
  SpooshResponse,
  QuerySchemaHelper,
  TagOptions,
} from "@spoosh/core";

export interface PrefetchPluginConfig {
  /** Default stale time for prefetched data in milliseconds */
  staleTime?: number;

  /**
   * Timeout in milliseconds after which stale promises are automatically cleared.
   * Prevents memory leaks from requests that never settle.
   * @default 30000 (30 seconds)
   */
  timeout?: number;
}

export interface PrefetchOptions extends TagOptions {
  /** Additional plugin options (staleTime, retries, dedupe, etc.) */
  [key: string]: unknown;
}

type PrefetchCallbackFn<TSchema> = (
  api: QuerySchemaHelper<TSchema>
) => Promise<SpooshResponse<unknown, unknown>>;

export type PrefetchFn<TSchema, TPluginOptions = object> = <
  TData = unknown,
  TError = unknown,
>(
  selector: PrefetchCallbackFn<TSchema>,
  options?: PrefetchOptions & TPluginOptions
) => Promise<SpooshResponse<TData, TError>>;

export interface PrefetchInstanceApi {
  prefetch: PrefetchFn<unknown>;
}

declare module "@spoosh/core" {
  interface InstanceApiResolvers<TSchema> {
    prefetch: PrefetchFn<TSchema>;
  }
}
