/* eslint-disable @typescript-eslint/no-empty-object-type */
import type { SpooshResponse } from "./response.types";
import type {
  HttpMethod,
  ExtractData,
  ExtractError,
  FindMatchingKey,
  ExtractParamNames,
  HasParams,
} from "./schema.types";
import type { HeadersInitOrGetter } from "./request.types";

type Simplify<T> = { [K in keyof T]: T[K] } & {};

/**
 * Base request options available on all methods.
 */
type BaseRequestOptions = {
  headers?: HeadersInitOrGetter;
  cache?: RequestCache;
  signal?: AbortSignal;
};

/**
 * Extract body type from method config.
 */
type ExtractBody<T> = T extends { body?: infer B } ? B : never;

/**
 * Extract query type from method config.
 */
type ExtractQuery<T> = T extends { query?: infer Q } ? Q : never;

/**
 * Check if body is required (not optional).
 */
type IsBodyRequired<T> = T extends { body: infer B }
  ? undefined extends B
    ? false
    : true
  : false;

/**
 * Check if query is required (not optional).
 */
type IsQueryRequired<T> = T extends { query: infer Q }
  ? undefined extends Q
    ? false
    : true
  : false;

/**
 * Build the options type for a method.
 */
type BodyOption<T> = [ExtractBody<T>] extends [never]
  ? {}
  : IsBodyRequired<T> extends true
    ? { body: ExtractBody<T> }
    : { body?: ExtractBody<T> };

type QueryOption<T> = [ExtractQuery<T>] extends [never]
  ? {}
  : IsQueryRequired<T> extends true
    ? { query: ExtractQuery<T> }
    : { query?: ExtractQuery<T> };

type ParamsOption<TUserPath extends string> =
  HasParams<TUserPath> extends true
    ? { params: Record<ExtractParamNames<TUserPath>, string | number> }
    : {};

type RequestOptions<TMethodConfig, TUserPath extends string> = Simplify<
  BaseRequestOptions &
    BodyOption<TMethodConfig> &
    QueryOption<TMethodConfig> &
    ParamsOption<TUserPath>
>;

/**
 * Check if options argument is required.
 */
type IsOptionsRequired<TMethodConfig, TUserPath extends string> =
  IsBodyRequired<TMethodConfig> extends true
    ? true
    : IsQueryRequired<TMethodConfig> extends true
      ? true
      : HasParams<TUserPath> extends true
        ? true
        : false;

/**
 * Build response type for a method call.
 */
type MethodResponse<
  TMethodConfig,
  TDefaultError,
  TUserPath extends string,
> = SpooshResponse<
  ExtractData<TMethodConfig>,
  ExtractError<TMethodConfig, TDefaultError>,
  RequestOptions<TMethodConfig, TUserPath>,
  ExtractQuery<TMethodConfig>,
  ExtractBody<TMethodConfig>,
  never,
  never,
  ExtractParamNames<TUserPath>
>;

/**
 * Create a method function type.
 * Direct lookup: Schema[Path][Method] → method config → build function type
 */
type MethodFn<TMethodConfig, TDefaultError, TUserPath extends string> =
  IsOptionsRequired<TMethodConfig, TUserPath> extends true
    ? (
        options: RequestOptions<TMethodConfig, TUserPath>
      ) => Promise<MethodResponse<TMethodConfig, TDefaultError, TUserPath>>
    : (
        options?: RequestOptions<TMethodConfig, TUserPath>
      ) => Promise<MethodResponse<TMethodConfig, TDefaultError, TUserPath>>;

/**
 * HTTP methods available on a path.
 * Direct lookup: Schema[Path] → route config → map methods
 */
type HttpMethods<TRoute, TDefaultError, TUserPath extends string> = {
  [M in HttpMethod as M extends keyof TRoute
    ? M
    : never]: M extends keyof TRoute
    ? MethodFn<TRoute[M], TDefaultError, TUserPath>
    : never;
};

/**
 * Build the return type when calling a client with a path.
 * Uses FindMatchingKey for pattern matching (e.g., "posts/123" → "posts/:id")
 */
type PathMethods<TSchema, TPath extends string, TDefaultError> =
  FindMatchingKey<TSchema, TPath> extends infer TKey
    ? TKey extends keyof TSchema
      ? Simplify<HttpMethods<TSchema[TKey], TDefaultError, TPath>>
      : never
    : never;

/**
 * Extract all valid paths from a schema (for autocomplete).
 */
export type SchemaPaths<TSchema> = keyof TSchema & string;

/**
 * An API client that uses path strings instead of chained property access.
 * Methods use HTTP names directly: GET, POST, PUT, PATCH, DELETE.
 *
 * @example
 * ```ts
 * type ApiSchema = {
 *   "posts": { GET: { data: Post[] } };
 *   "posts/:id": { GET: { data: Post } };
 * };
 *
 * const api = createClient<ApiSchema>({ baseUrl: "/api" });
 *
 * // Call with exact path (autocomplete available)
 * await api("posts").GET();
 *
 * // Call with embedded params (matches "posts/:id")
 * await api("posts/123").GET();
 *
 * // Call with explicit params
 * await api("posts/:id").GET({ params: { id: 123 } });
 * ```
 */
export type SpooshClient<TSchema, TDefaultError = unknown> = <
  TPath extends SchemaPaths<TSchema> | (string & {}),
>(
  path: TPath
) => PathMethods<TSchema, TPath, TDefaultError>;

/**
 * Read-only client type that only exposes GET methods.
 * Used by useRead/injectRead hooks to ensure only query operations are selected.
 */
type ReadPathMethods<TSchema, TPath extends string, TDefaultError> =
  FindMatchingKey<TSchema, TPath> extends infer TKey
    ? TKey extends keyof TSchema
      ? "GET" extends keyof TSchema[TKey]
        ? Simplify<{
            GET: MethodFn<TSchema[TKey]["GET"], TDefaultError, TPath>;
          }>
        : never
      : never
    : never;

/**
 * Check if a schema path has a GET method.
 */
type HasGetMethod<TSchema, TPath extends string> =
  FindMatchingKey<TSchema, TPath> extends infer TKey
    ? TKey extends keyof TSchema
      ? "GET" extends keyof TSchema[TKey]
        ? true
        : false
      : false
    : false;

/**
 * Extract paths that have GET methods.
 */
type ReadPaths<TSchema> = {
  [K in keyof TSchema & string]: "GET" extends keyof TSchema[K] ? K : never;
}[keyof TSchema & string];

/**
 * A read-only API client that only exposes GET methods.
 * Used by useRead and injectRead hooks.
 */
export type ReadClient<TSchema, TDefaultError = unknown> = <
  TPath extends ReadPaths<TSchema> | (string & {}),
>(
  path: TPath
) => HasGetMethod<TSchema, TPath> extends true
  ? ReadPathMethods<TSchema, TPath, TDefaultError>
  : never;

/**
 * Mutation methods (non-GET).
 */
type MutationMethod = "POST" | "PUT" | "PATCH" | "DELETE";

/**
 * Write-only client type that only exposes mutation methods (POST, PUT, PATCH, DELETE).
 * Used by useWrite/injectWrite hooks to ensure only mutation operations are selected.
 */
type WritePathMethods<TSchema, TPath extends string, TDefaultError> =
  FindMatchingKey<TSchema, TPath> extends infer TKey
    ? TKey extends keyof TSchema
      ? Simplify<{
          [M in MutationMethod as M extends keyof TSchema[TKey]
            ? M
            : never]: M extends keyof TSchema[TKey]
            ? MethodFn<TSchema[TKey][M], TDefaultError, TPath>
            : never;
        }>
      : never
    : never;

/**
 * Check if a schema path has any mutation methods.
 */
type HasMutationMethod<TSchema, TPath extends string> =
  FindMatchingKey<TSchema, TPath> extends infer TKey
    ? TKey extends keyof TSchema
      ? MutationMethod extends never
        ? false
        : Extract<keyof TSchema[TKey], MutationMethod> extends never
          ? false
          : true
      : false
    : false;

/**
 * Extract paths that have mutation methods.
 */
type WritePaths<TSchema> = {
  [K in keyof TSchema & string]: Extract<
    keyof TSchema[K],
    MutationMethod
  > extends never
    ? never
    : K;
}[keyof TSchema & string];

/**
 * A write-only API client that only exposes mutation methods (POST, PUT, PATCH, DELETE).
 * Used by useWrite and injectWrite hooks.
 */
export type WriteClient<TSchema, TDefaultError = unknown> = <
  TPath extends WritePaths<TSchema> | (string & {}),
>(
  path: TPath
) => HasMutationMethod<TSchema, TPath> extends true
  ? WritePathMethods<TSchema, TPath, TDefaultError>
  : never;
