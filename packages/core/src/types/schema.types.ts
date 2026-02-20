import type { HttpMethod, WriteMethod } from "./common.types";

export type { HttpMethod, WriteMethod };

/**
 * An API schema where routes are defined as string keys with path patterns.
 * Define data, body, query, and error directly on each method.
 *
 * @example
 * ```ts
 * type ApiSchema = {
 *   "posts": {
 *     GET: { data: Post[] };
 *     POST: { data: Post; body: CreatePostBody };
 *   };
 *   "posts/:id": {
 *     GET: { data: Post };
 *     PUT: { data: Post; body: UpdatePostBody };
 *     DELETE: { data: void };
 *   };
 *   "posts/:id/comments": {
 *     GET: { data: Comment[]; query: { page?: number } };
 *   };
 * };
 * ```
 */
export type ApiSchema = {
  [path: string]: {
    [method in HttpMethod]?: {
      data?: unknown;
      body?: unknown;
      query?: unknown;
      error?: unknown;
    };
  };
};

/**
 * Extract data type from an endpoint.
 */
export type ExtractData<T> = T extends { data: infer D } ? D : void;

/**
 * Extract body type from an endpoint.
 */
export type ExtractBody<T> = T extends { body: infer B } ? B : never;

/**
 * Extract query type from an endpoint.
 */
export type ExtractQuery<T> = T extends { query: infer Q } ? Q : never;

/**
 * Extract error type from an endpoint.
 */
export type ExtractError<T, TDefault = unknown> = T extends {
  error: infer E;
}
  ? E
  : TDefault;

/**
 * Helper type to define a type-safe API schema.
 * Use this to get type checking on your schema definition.
 *
 * @example
 * ```ts
 * type ApiSchema = SpooshSchema<{
 *   "posts": {
 *     GET: { data: Post[] };
 *     POST: { data: Post; body: CreatePostBody };
 *   };
 *   "posts/:id": {
 *     GET: { data: Post };
 *     PUT: { data: Post; body: UpdatePostBody };
 *     DELETE: { data: void };
 *   };
 * }>;
 *
 * const api = createClient<ApiSchema>({ baseUrl: "/api" });
 * ```
 */
export type SpooshSchema<T extends ApiSchema> = T;

/**
 * Convert a route pattern like "posts/:id" to a path matcher pattern like `posts/${string}`.
 * This enables TypeScript to match actual paths like "posts/123" to their schema definitions.
 *
 * @example
 * ```ts
 * type A = RouteToPath<"posts/:id">; // "posts/${string}"
 * type B = RouteToPath<"posts/:id/comments/:cid">; // "posts/${string}/comments/${string}"
 * type C = RouteToPath<"posts">; // "posts"
 * ```
 */
type RouteToPath<T extends string> = T extends `/${infer Rest}`
  ? `/${RouteToPath<Rest>}`
  : T extends `${infer Segment}/${infer Rest}`
    ? Segment extends `:${string}`
      ? `${string}/${RouteToPath<Rest>}`
      : `${Segment}/${RouteToPath<Rest>}`
    : T extends `:${string}`
      ? string
      : T;

/**
 * Find which schema key matches a given path.
 * First checks for exact match, then checks pattern matches.
 *
 * @example
 * ```ts
 * type Schema = { "posts": {...}; "posts/:id": {...} };
 * type A = FindMatchingKey<Schema, "posts">; // "posts" (exact match)
 * type B = FindMatchingKey<Schema, "posts/123">; // "posts/:id" (pattern match)
 * ```
 */
export type FindMatchingKey<
  TSchema,
  TPath extends string,
> = TPath extends keyof TSchema
  ? TPath
  : {
      [K in keyof TSchema]: TPath extends RouteToPath<K & string> ? K : never;
    }[keyof TSchema];

/**
 * Extract parameter names from a route pattern.
 *
 * @example
 * ```ts
 * type A = ExtractParamNames<"posts/:id">; // "id"
 * type B = ExtractParamNames<"posts/:id/comments/:cid">; // "id" | "cid"
 * type C = ExtractParamNames<"posts">; // never
 * ```
 */
export type ExtractParamNames<T extends string> =
  T extends `${string}:${infer Param}/${infer Rest}`
    ? Param | ExtractParamNames<Rest>
    : T extends `${string}:${infer Param}`
      ? Param
      : never;

/**
 * Check if a route pattern has any parameters.
 *
 * @example
 * ```ts
 * type A = HasParams<"posts/:id">; // true
 * type B = HasParams<"posts">; // false
 * ```
 */
export type HasParams<T extends string> = T extends `${string}:${string}`
  ? true
  : false;

/**
 * Extract paths that have GET methods.
 */
export type ReadPaths<TSchema> = {
  [K in keyof TSchema & string]: "GET" extends keyof TSchema[K] ? K : never;
}[keyof TSchema & string];

/**
 * Extract paths that have write methods (POST, PUT, PATCH, DELETE).
 */
export type WritePaths<TSchema> = {
  [K in keyof TSchema & string]: Extract<
    keyof TSchema[K],
    WriteMethod
  > extends never
    ? never
    : K;
}[keyof TSchema & string];

/**
 * Check if a schema path has a GET method.
 */
export type HasReadMethod<TSchema, TPath extends string> =
  FindMatchingKey<TSchema, TPath> extends infer TKey
    ? TKey extends keyof TSchema
      ? "GET" extends keyof TSchema[TKey]
        ? true
        : false
      : false
    : false;

/**
 * Check if a schema path has any write methods.
 */
export type HasWriteMethod<TSchema, TPath extends string> =
  FindMatchingKey<TSchema, TPath> extends infer TKey
    ? TKey extends keyof TSchema
      ? WriteMethod extends never
        ? false
        : Extract<keyof TSchema[TKey], WriteMethod> extends never
          ? false
          : true
      : false
    : false;

type NormalizePrefix<T extends string> = T extends `/${infer Rest}`
  ? NormalizePrefix<Rest>
  : T extends `${infer Rest}/`
    ? NormalizePrefix<Rest>
    : T;

type StripPrefixFromPath<
  TPath extends string,
  TPrefix extends string,
> = TPath extends TPrefix
  ? ""
  : TPath extends `${TPrefix}/${infer Rest}`
    ? Rest
    : TPath;

/**
 * Strips a prefix from all path keys in a schema.
 * Works with any schema (Elysia, Hono, or manual).
 *
 * @example
 * ```ts
 * type FullSchema = {
 *   "api": { GET: { data: string } };
 *   "api/users": { GET: { data: User[] } };
 *   "api/posts/:id": { GET: { data: Post } };
 *   "api/health": { GET: { data: { status: string } } };
 * };
 *
 * type ApiSchema = StripPrefix<FullSchema, "api">;
 * // {
 * //   "/": { GET: { data: string } };
 * //   "users": { GET: { data: User[] } };
 * //   "posts/:id": { GET: { data: Post } };
 * //   "health": { GET: { data: { status: string } } };
 * // }
 * ```
 */
export type StripPrefix<TSchema, TPrefix extends string> = TPrefix extends ""
  ? TSchema
  : {
      [K in keyof TSchema as K extends string
        ? StripPrefixFromPath<K, NormalizePrefix<TPrefix>>
        : K]: TSchema[K];
    };
