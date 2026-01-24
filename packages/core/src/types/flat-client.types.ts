import type { SpooshResponse } from "./response.types";
import type {
  FindMatchingKey,
  ExtractParamNames,
  HasParams,
} from "./path-matching.types";
import type {
  FlatHttpMethod,
  ExtractFlatData,
  ExtractFlatBody,
  ExtractFlatQuery,
  ExtractFlatError,
  FlatHasRequiredBody,
} from "./flat-schema.types";

type Simplify<T> = { [K in keyof T]: T[K] } & {};

type IsNever<T> = [T] extends [never] ? true : false;

/**
 * Build request options for a flat method call.
 * TUserPath is the path the user passed (may have :params or embedded values)
 */
type FlatRequestOptions<
  TBody,
  TQuery,
  TUserPath extends string,
> = (IsNever<TBody> extends true ? object : { body: TBody }) &
  (IsNever<TQuery> extends true ? object : { query: TQuery }) &
  (HasParams<TUserPath> extends true
    ? { params: Record<ExtractParamNames<TUserPath>, string | number> }
    : object);

/**
 * Check if options are required.
 * - Required if endpoint has body
 * - Required if USER's path has :params (like "posts/:id")
 * - NOT required if user embedded values (like "posts/123")
 */
type IsOptionsRequired<
  TEndpoint,
  TUserPath extends string,
> = FlatHasRequiredBody<TEndpoint> extends true
  ? true
  : HasParams<TUserPath> extends true
    ? true
    : false;

/**
 * Build response type for a flat method call.
 */
type FlatResponse<TEndpoint, TDefaultError, TUserPath extends string> =
  SpooshResponse<
    ExtractFlatData<TEndpoint>,
    ExtractFlatError<TEndpoint, TDefaultError>,
    FlatRequestOptions<
      ExtractFlatBody<TEndpoint>,
      ExtractFlatQuery<TEndpoint>,
      TUserPath
    >,
    ExtractFlatQuery<TEndpoint>,
    ExtractFlatBody<TEndpoint>,
    never,
    never,
    ExtractParamNames<TUserPath>
  >;

/**
 * Create a method function type for a flat endpoint.
 * Uses TUserPath to determine if params are required (based on user's :param syntax)
 */
type FlatMethodFn<
  TEndpoint,
  TDefaultError,
  TUserPath extends string,
> = IsOptionsRequired<TEndpoint, TUserPath> extends true
  ? (
      options: Simplify<
        FlatRequestOptions<
          ExtractFlatBody<TEndpoint>,
          ExtractFlatQuery<TEndpoint>,
          TUserPath
        >
      >
    ) => Promise<FlatResponse<TEndpoint, TDefaultError, TUserPath>>
  : (
      options?: Simplify<
        FlatRequestOptions<
          ExtractFlatBody<TEndpoint>,
          ExtractFlatQuery<TEndpoint>,
          TUserPath
        >
      >
    ) => Promise<FlatResponse<TEndpoint, TDefaultError, TUserPath>>;

/**
 * HTTP methods available on a flat path.
 * Uses GET, POST, PUT, PATCH, DELETE directly (not $get, $post, etc.)
 * TUserPath is passed through to determine param requirements from user's input
 */
type FlatHttpMethods<
  TRoute,
  TDefaultError,
  TUserPath extends string,
> = {
  [M in FlatHttpMethod as M extends keyof TRoute ? M : never]: M extends keyof TRoute
    ? FlatMethodFn<TRoute[M], TDefaultError, TUserPath>
    : never;
};

/**
 * Build the return type when calling a flat client with a path.
 * TPath is the user's input path - used for determining param requirements
 */
type FlatPathMethods<TSchema, TPath extends string, TDefaultError> =
  FindMatchingKey<TSchema, TPath> extends infer TKey
    ? TKey extends keyof TSchema
      ? Simplify<FlatHttpMethods<TSchema[TKey], TDefaultError, TPath>>
      : never
    : never;

/**
 * Extract all valid paths from a flat schema (for autocomplete).
 */
export type FlatSchemaPaths<TSchema> = keyof TSchema & string;

/**
 * A flat API client that uses path strings instead of chained property access.
 * Methods use HTTP names directly: GET, POST, PUT, PATCH, DELETE.
 *
 * @example
 * ```ts
 * type ApiSchema = {
 *   "posts": { GET: { data: Post[] } };
 *   "posts/:id": { GET: { data: Post } };
 * };
 *
 * const api = createFlatClient<ApiSchema>({ baseUrl: "/api" });
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
export type FlatSpooshClient<TSchema, TDefaultError = unknown> = <
  TPath extends FlatSchemaPaths<TSchema> | (string & {}),
>(
  path: TPath
) => FlatPathMethods<TSchema, TPath, TDefaultError>;
