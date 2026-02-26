import type {
  FindMatchingKey,
  ExtractData,
  ExtractParamNames,
  HasParams,
  ReadPaths,
  Simplify,
} from "@spoosh/core";

/**
 * Check if query exists in the method config.
 */
type HasQuery<T> = "query" extends keyof T ? true : false;

/**
 * Extract query type from method config.
 */
type ExtractQuery<T> = T extends { query: infer Q }
  ? Q
  : T extends { query?: infer Q }
    ? Q
    : never;

/**
 * Internal optimistic target data.
 * @internal
 */
export type OptimisticTarget = {
  path: string;
  filter?: (options: unknown) => boolean;
  immediateUpdater?: (data: unknown) => unknown;
  confirmedUpdater?: (data: unknown, response: unknown) => unknown;
  rollbackOnError: boolean;
  onError?: (error: unknown) => void;
};

/**
 * Filter options for filtering cache entries.
 */
type FilterOptions<TMethodConfig, TUserPath extends string> =
  HasParams<TUserPath> extends true
    ? HasQuery<TMethodConfig> extends true
      ? {
          params: Record<ExtractParamNames<TUserPath>, string | number>;
          query: ExtractQuery<TMethodConfig>;
        }
      : {
          params: Record<ExtractParamNames<TUserPath>, string | number>;
        }
    : HasQuery<TMethodConfig> extends true
      ? {
          query: ExtractQuery<TMethodConfig>;
        }
      : never;

/**
 * Brand for completed builders (at least one set() was called).
 * @internal
 */
declare const COMPLETED_BRAND: unique symbol;

/**
 * Chainable builder for cache operations.
 *
 * @typeParam TData - The data type of the cache entry
 * @typeParam TMethodConfig - The method configuration from schema
 * @typeParam TUserPath - The user's path string
 * @typeParam TResponse - The mutation response type
 * @typeParam TError - The error type
 * @typeParam TConfirmed - Whether we're in confirmed mode
 * @typeParam THasImmediate - Whether immediate set() was called
 * @typeParam THasConfirmed - Whether confirmed set() was called
 * @typeParam THasFilter - Whether filter() was called
 */
export type CacheBuilder<
  TData = unknown,
  TMethodConfig = unknown,
  TUserPath extends string = string,
  TResponse = unknown,
  TError = unknown,
  TConfirmed extends boolean = false,
  THasImmediate extends boolean = false,
  THasConfirmed extends boolean = false,
  THasFilter extends boolean = false,
> = (THasImmediate extends true
  ? { readonly [COMPLETED_BRAND]: true }
  : THasConfirmed extends true
    ? { readonly [COMPLETED_BRAND]: true }
    : unknown) & {
  /**
   * Filter which cache entries to update based on query/params.
   * Must be called before any `set()`.
   *
   * @param predicate - Function that receives cache entry info and returns true to match
   *
   * @example
   * ```ts
   * .filter(entry => entry.params.id === 1)
   * ```
   */
  filter: THasFilter extends true
    ? never
    : THasImmediate extends true
      ? never
      : THasConfirmed extends true
        ? never
        : FilterOptions<TMethodConfig, TUserPath> extends never
          ? never
          : (
              predicate: (
                entry: Simplify<FilterOptions<TMethodConfig, TUserPath>>
              ) => boolean
            ) => CacheBuilder<
              TData,
              TMethodConfig,
              TUserPath,
              TResponse,
              TError,
              TConfirmed,
              THasImmediate,
              THasConfirmed,
              true
            >;

  /**
   * Set the cache data.
   *
   * In immediate mode (default): receives only the current data.
   * In confirmed mode: receives current data and the mutation response.
   *
   * @param updater - Function that receives current data (and response if confirmed), returns updated data
   *
   * @example
   * ```ts
   * // Immediate (optimistic)
   * .set(data => ({ ...data, pending: true }))
   *
   * // Confirmed (post-success)
   * .confirmed().set((data, response) => response)
   * ```
   */
  set: TConfirmed extends true
    ? THasConfirmed extends true
      ? never
      : (
          updater: (data: TData, response: TResponse) => TData
        ) => CacheBuilder<
          TData,
          TMethodConfig,
          TUserPath,
          TResponse,
          TError,
          TConfirmed,
          THasImmediate,
          true,
          THasFilter
        >
    : THasImmediate extends true
      ? never
      : (
          updater: (data: TData) => TData
        ) => CacheBuilder<
          TData,
          TMethodConfig,
          TUserPath,
          TResponse,
          TError,
          TConfirmed,
          true,
          THasConfirmed,
          THasFilter
        >;

  /**
   * Switch to confirmed mode. The next set() will be applied after mutation succeeds.
   *
   * @example
   * ```ts
   * .set(data => ({ ...data, pending: true }))  // immediate
   * .confirmed()
   * .set((data, response) => response)          // after success
   * ```
   */
  confirmed: TConfirmed extends true
    ? never
    : () => CacheBuilder<
        TData,
        TMethodConfig,
        TUserPath,
        TResponse,
        TError,
        true,
        THasImmediate,
        THasConfirmed,
        THasFilter
      >;

  /**
   * Disable automatic rollback when mutation fails.
   * By default, optimistic updates are rolled back on error.
   * Only available after calling `set()` in immediate mode.
   */
  disableRollback: THasImmediate extends true
    ? () => CacheBuilder<
        TData,
        TMethodConfig,
        TUserPath,
        TResponse,
        TError,
        TConfirmed,
        THasImmediate,
        THasConfirmed,
        THasFilter
      >
    : never;

  /**
   * Callback when mutation fails.
   * Only available after calling `set()` in immediate mode.
   */
  onError: THasImmediate extends true
    ? (
        callback: (error: TError) => void
      ) => CacheBuilder<
        TData,
        TMethodConfig,
        TUserPath,
        TResponse,
        TError,
        TConfirmed,
        THasImmediate,
        THasConfirmed,
        THasFilter
      >
    : never;
};

/**
 * Cache selector that resolves paths to their schema definitions.
 */
type CacheSelector<TSchema, TPath extends string, TResponse, TError> =
  FindMatchingKey<TSchema, TPath> extends infer TKey
    ? TKey extends keyof TSchema
      ? TSchema[TKey] extends infer TRoute
        ? "GET" extends keyof TRoute
          ? TRoute["GET"] extends infer TGetConfig
            ? CacheBuilder<
                ExtractData<TGetConfig>,
                TGetConfig,
                TPath,
                TResponse,
                TError,
                false,
                false,
                false,
                false
              >
            : never
          : never
        : never
      : never
    : never;

/**
 * Helper type for creating the cache selector.
 * Accepts both schema-defined paths (e.g., "posts/:id") and literal paths (e.g., "posts/1").
 */
export type CacheHelper<TSchema, TResponse = unknown, TError = unknown> = <
  TPath extends ReadPaths<TSchema> | (string & {}),
>(
  path: TPath
) => CacheSelector<TSchema, TPath, TResponse, TError>;

/**
 * A completed builder that has at least one set() called.
 * @internal
 */
type CompletedCacheBuilder = {
  readonly [COMPLETED_BRAND]: true;
};

/**
 * Callback function type for the optimistic option.
 *
 * @example
 * ```ts
 * // Optimistic only
 * optimistic: (cache) => cache("posts")
 *   .set(posts => posts.filter(p => p.id !== deletedId))
 * ```
 *
 * @example
 * ```ts
 * // Confirmed only (post-success)
 * optimistic: (cache) => cache("posts")
 *   .confirmed()
 *   .set((posts, newPost) => [...posts, newPost])
 * ```
 *
 * @example
 * ```ts
 * // Both optimistic and confirmed
 * optimistic: (cache) => cache("posts/:id")
 *   .filter(e => e.params.id === 1)
 *   .set(post => ({ ...post, pending: true }))
 *   .confirmed()
 *   .set((post, response) => response)
 * ```
 *
 * @example
 * ```ts
 * // Multiple targets
 * optimistic: (cache) => [
 *   cache("posts").set(posts => posts.filter(p => p.id !== id)),
 *   cache("stats").set(stats => ({ ...stats, count: stats.count - 1 })),
 * ]
 * ```
 */
export type OptimisticCallbackFn<
  TSchema = unknown,
  TResponse = unknown,
  TError = unknown,
> = (
  cache: CacheHelper<TSchema, TResponse, TError>
) => CompletedCacheBuilder | CompletedCacheBuilder[];

export type OptimisticPluginConfig = object;

export type OptimisticWriteOptions = object;

export interface OptimisticWriteTriggerOptions<
  TSchema = unknown,
  TResponse = unknown,
  TError = unknown,
> {
  /**
   * Configure optimistic updates for this mutation.
   *
   * @example
   * ```ts
   * // Optimistic update
   * trigger({
   *   optimistic: (cache) => cache("posts")
   *     .set(posts => posts.filter(p => p.id !== deletedId)),
   * });
   * ```
   *
   * @example
   * ```ts
   * // With filter and confirmed update
   * trigger({
   *   optimistic: (cache) => cache("posts/:id")
   *     .filter(e => e.params.id === 1)
   *     .set(post => ({ ...post, pending: true }))
   *     .confirmed()
   *     .set((post, response) => response),
   * });
   * ```
   */
  optimistic?: OptimisticCallbackFn<TSchema, TResponse, TError>;
}

export type OptimisticReadOptions = object;

export type OptimisticPagesOptions = object;

export interface OptimisticReadResult {
  isOptimistic: boolean;
}

export type OptimisticWriteResult = object;

declare module "@spoosh/core" {
  interface PluginResolvers<TContext> {
    optimistic:
      | OptimisticCallbackFn<
          TContext["schema"],
          TContext["data"],
          TContext["error"]
        >
      | undefined;
  }
}
