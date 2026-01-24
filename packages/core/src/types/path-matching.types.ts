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
export type RouteToPath<T extends string> =
  T extends `${infer Start}/:${string}/${infer Rest}`
    ? `${Start}/${string}/${RouteToPath<Rest>}`
    : T extends `${infer Start}/:${string}`
      ? `${Start}/${string}`
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
export type FindMatchingKey<TSchema, TPath extends string> =
  TPath extends keyof TSchema
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
 * Check if a given path is an exact match (no params embedded).
 * Returns true if the path doesn't look like it has embedded values.
 */
export type IsExactMatch<TPath extends string, TPattern extends string> =
  TPath extends TPattern ? true : false;
