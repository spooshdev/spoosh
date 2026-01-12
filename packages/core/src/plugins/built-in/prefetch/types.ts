import type { EnlaceResponse } from "../../../types/response.types";
import type { QuerySchemaHelper } from "../../schema-helper";
import type { TagOptions } from "../../../utils/path-utils";

export interface PrefetchPluginConfig {
  /** Default stale time for prefetched data in milliseconds */
  staleTime?: number;
}

export interface PrefetchOptions extends TagOptions {
  /** Additional plugin options (staleTime, retries, dedupe, etc.) */
  [key: string]: unknown;
}

type PrefetchCallbackFn<TSchema> = (
  api: QuerySchemaHelper<TSchema>
) => Promise<EnlaceResponse<unknown, unknown>>;

export type PrefetchFn<TSchema, TPluginOptions = object> = <
  TData = unknown,
  TError = unknown,
>(
  selector: PrefetchCallbackFn<TSchema>,
  options?: PrefetchOptions & TPluginOptions
) => Promise<EnlaceResponse<TData, TError>>;

export interface PrefetchInstanceApi {
  /**
   * Prefetch data for a given endpoint.
   * Runs through the full plugin middleware chain (cache, retry, etc).
   *
   * @example
   * ```ts
   * await prefetch((api) => api.posts.$get());
   * await prefetch((api) => api.users[userId].posts.$get());
   * ```
   */
  prefetch: PrefetchFn<unknown>;
}
