import type {
  FindMatchingKey,
  ExtractData,
  ExtractParamNames,
  HasParams,
} from "@spoosh/core";

type Simplify<T> = { [K in keyof T]: T[K] } & {};

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
  method: string;
  where?: (options: unknown) => boolean;
  updater?: (data: unknown, response?: unknown) => unknown;
  timing: "immediate" | "onSuccess";
  rollbackOnError: boolean;
  onError?: (error: unknown) => void;
};

/**
 * WHERE options for filtering cache entries.
 */
type WhereOptions<TMethodConfig, TUserPath extends string> =
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
 * Conditionally include a method if it hasn't been used yet.
 */
type IfNotUsed<
  TMethod extends string,
  TUsed extends string,
  TType,
> = TMethod extends TUsed ? never : TType;

/**
 * Brand for completed builders (UPDATE_CACHE was called).
 * @internal
 */
declare const COMPLETED_BRAND: unique symbol;

/**
 * Chainable builder after GET().
 * Methods can be chained in any order, but each method can only be called once.
 * Internal properties are hidden from autocomplete.
 *
 * @typeParam TTiming - Tracks whether ON_SUCCESS was called to determine UPDATE_CACHE signature
 * @typeParam TUsed - Tracks which methods have been called to prevent duplicate calls
 * @typeParam TCompleted - Tracks whether UPDATE_CACHE was called (required for valid builder)
 */
export type OptimisticBuilder<
  TData = unknown,
  TMethodConfig = unknown,
  TUserPath extends string = string,
  TResponse = unknown,
  TTiming extends "immediate" | "onSuccess" = "immediate",
  TUsed extends string = never,
  TCompleted extends boolean = false,
> = (TCompleted extends true
  ? { readonly [COMPLETED_BRAND]: true }
  : unknown) & {
  /**
   * Filter which cache entries to update based on query/params.
   *
   * @param predicate - Function that receives cache entry info and returns true to match
   *
   * @example
   * ```ts
   * .WHERE(entry => entry.query.page === 1)
   * ```
   */
  WHERE: IfNotUsed<
    "WHERE",
    TUsed,
    WhereOptions<TMethodConfig, TUserPath> extends never
      ? never
      : (
          predicate: (
            entry: Simplify<WhereOptions<TMethodConfig, TUserPath>>
          ) => boolean
        ) => OptimisticBuilder<
          TData,
          TMethodConfig,
          TUserPath,
          TResponse,
          TTiming,
          TUsed | "WHERE",
          TCompleted
        >
  >;

  /**
   * Specify how to update the cached data optimistically.
   * This method is required - an optimistic update must have an updater function.
   *
   * For immediate updates (default): receives only the current data.
   * For ON_SUCCESS: receives current data and the mutation response.
   *
   * @param updater - Function that receives current data (and response if ON_SUCCESS), returns updated data
   */
  UPDATE_CACHE: IfNotUsed<
    "UPDATE_CACHE",
    TUsed,
    TTiming extends "onSuccess"
      ? (
          updater: (data: TData, response: TResponse) => TData
        ) => OptimisticBuilder<
          TData,
          TMethodConfig,
          TUserPath,
          TResponse,
          TTiming,
          TUsed | "UPDATE_CACHE",
          true
        >
      : (
          updater: (data: TData) => TData
        ) => OptimisticBuilder<
          TData,
          TMethodConfig,
          TUserPath,
          TResponse,
          TTiming,
          TUsed | "UPDATE_CACHE",
          true
        >
  >;

  /**
   * Apply optimistic update only after mutation succeeds.
   * By default, updates are applied immediately before mutation completes.
   * When using ON_SUCCESS, UPDATE_CACHE receives the mutation response as second argument.
   */
  ON_SUCCESS: IfNotUsed<
    "ON_SUCCESS",
    TUsed,
    () => OptimisticBuilder<
      TData,
      TMethodConfig,
      TUserPath,
      TResponse,
      "onSuccess",
      TUsed | "ON_SUCCESS",
      TCompleted
    >
  >;

  /**
   * Disable automatic rollback when mutation fails.
   * By default, optimistic updates are rolled back on error.
   */
  NO_ROLLBACK: IfNotUsed<
    "NO_ROLLBACK",
    TUsed,
    () => OptimisticBuilder<
      TData,
      TMethodConfig,
      TUserPath,
      TResponse,
      TTiming,
      TUsed | "NO_ROLLBACK",
      TCompleted
    >
  >;

  /**
   * Callback when mutation fails.
   */
  ON_ERROR: IfNotUsed<
    "ON_ERROR",
    TUsed,
    (
      callback: (error: unknown) => void
    ) => OptimisticBuilder<
      TData,
      TMethodConfig,
      TUserPath,
      TResponse,
      TTiming,
      TUsed | "ON_ERROR",
      TCompleted
    >
  >;
};

/**
 * Extract paths that have GET methods.
 */
type ReadPaths<TSchema> = {
  [K in keyof TSchema & string]: "GET" extends keyof TSchema[K] ? K : never;
}[keyof TSchema & string];

/**
 * Path methods proxy for optimistic API - only GET.
 */
type OptimisticPathMethods<TSchema, TPath extends string, TResponse> =
  FindMatchingKey<TSchema, TPath> extends infer TKey
    ? TKey extends keyof TSchema
      ? TSchema[TKey] extends infer TRoute
        ? "GET" extends keyof TRoute
          ? TRoute["GET"] extends infer TGetConfig
            ? {
                GET: () => OptimisticBuilder<
                  ExtractData<TGetConfig>,
                  TGetConfig,
                  TPath,
                  TResponse,
                  "immediate",
                  never,
                  false
                >;
              }
            : never
          : never
        : never
      : never
    : never;

/**
 * Helper type for creating the optimistic API proxy.
 */
export type OptimisticApiHelper<TSchema, TResponse = unknown> = <
  TPath extends ReadPaths<TSchema>,
>(
  path: TPath
) => OptimisticPathMethods<TSchema, TPath, TResponse>;

/**
 * A generic OptimisticTarget that accepts any data/response types.
 * Used for the return type of the callback.
 */
export type AnyOptimisticTarget = OptimisticTarget;

/**
 * A completed builder that has UPDATE_CACHE called.
 * Uses the brand to ensure UPDATE_CACHE was called.
 * @internal
 */
type CompletedOptimisticBuilder = {
  readonly [COMPLETED_BRAND]: true;
};

/**
 * Callback function type for the optimistic option.
 *
 * @example
 * ```ts
 * // Single target - immediate update (no response)
 * optimistic: (api) => api("posts")
 *   .GET()
 *   .UPDATE_CACHE(posts => posts.filter(p => p.id !== deletedId))
 * ```
 *
 * @example
 * ```ts
 * // With WHERE filter and options
 * optimistic: (api) => api("posts")
 *   .GET()
 *   .WHERE(entry => entry.query.page === 1)
 *   .NO_ROLLBACK()
 *   .UPDATE_CACHE(posts => [...posts, newPost])
 * ```
 *
 * @example
 * ```ts
 * // Apply update after mutation succeeds (with typed response)
 * optimistic: (api) => api("posts")
 *   .GET()
 *   .ON_SUCCESS()
 *   .UPDATE_CACHE((posts, response) => [...posts, response])
 * ```
 *
 * @example
 * ```ts
 * // Multiple targets
 * optimistic: (api) => [
 *   api("posts").GET().UPDATE_CACHE(posts => posts.filter(p => p.id !== id)),
 *   api("stats").GET().UPDATE_CACHE(stats => ({ ...stats, count: stats.count - 1 })),
 * ]
 * ```
 */
export type OptimisticCallbackFn<TSchema = unknown, TResponse = unknown> = (
  api: OptimisticApiHelper<TSchema, TResponse>
) => CompletedOptimisticBuilder | CompletedOptimisticBuilder[];

export type OptimisticPluginConfig = object;

export interface OptimisticWriteOptions<
  TSchema = unknown,
  TResponse = unknown,
> {
  /**
   * Configure optimistic updates for this mutation.
   *
   * @example
   * ```ts
   * // Immediate update (default) - no response available
   * trigger({
   *   optimistic: (api) => api("posts")
   *     .GET()
   *     .UPDATE_CACHE(posts => posts.filter(p => p.id !== deletedId)),
   * });
   * ```
   *
   * @example
   * ```ts
   * // With WHERE filter and disable rollback
   * trigger({
   *   optimistic: (api) => api("posts")
   *     .GET()
   *     .NO_ROLLBACK()
   *     .WHERE(entry => entry.query.page === 1)
   *     .UPDATE_CACHE(posts => [newPost, ...posts]),
   * });
   * ```
   *
   * @example
   * ```ts
   * // Apply after success - response is available
   * trigger({
   *   optimistic: (api) => api("posts")
   *     .GET()
   *     .ON_SUCCESS()
   *     .UPDATE_CACHE((posts, newPost) => [...posts, newPost]),
   * });
   * ```
   */
  optimistic?: OptimisticCallbackFn<TSchema, TResponse>;
}

export type OptimisticReadOptions = object;

export type OptimisticInfiniteReadOptions = object;

export interface OptimisticReadResult {
  isOptimistic: boolean;
}

export type OptimisticWriteResult = object;

declare module "@spoosh/core" {
  interface PluginResolvers<TContext> {
    optimistic:
      | OptimisticCallbackFn<TContext["schema"], TContext["data"]>
      | undefined;
  }
}
