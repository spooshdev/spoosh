/**
 * HTTP method keys for flat schema definitions.
 */
export type FlatHttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

/**
 * A flat endpoint definition without the Endpoint wrapper.
 * Simply define data, body, query, and error directly.
 *
 * @example
 * ```ts
 * type PostsRoute = {
 *   GET: { data: Post[] };
 *   POST: { data: Post; body: CreatePostBody };
 * };
 * ```
 */
export type FlatEndpoint<
  TData = unknown,
  TBody = never,
  TQuery = never,
  TError = never,
> = {
  data: TData;
  body?: TBody;
  query?: TQuery;
  error?: TError;
};

/**
 * A flat API schema where routes are defined as string keys with path patterns.
 * No Endpoint wrapper needed - just define data, body, query, error directly.
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
export type FlatApiSchema = {
  [path: string]: {
    [method in FlatHttpMethod]?: {
      data: unknown;
      body?: unknown;
      query?: unknown;
      error?: unknown;
    };
  };
};

/**
 * Extract data type from a flat endpoint.
 */
export type ExtractFlatData<T> = T extends { data: infer D } ? D : never;

/**
 * Extract body type from a flat endpoint.
 */
export type ExtractFlatBody<T> = T extends { body: infer B } ? B : never;

/**
 * Extract query type from a flat endpoint.
 */
export type ExtractFlatQuery<T> = T extends { query: infer Q } ? Q : never;

/**
 * Extract error type from a flat endpoint.
 */
export type ExtractFlatError<T, TDefault = unknown> = T extends {
  error: infer E;
}
  ? E
  : TDefault;

/**
 * Check if a flat endpoint has required body.
 */
export type FlatHasRequiredBody<T> = T extends { body: infer B }
  ? [B] extends [never]
    ? false
    : undefined extends B
      ? false
      : true
  : false;

/**
 * Helper type to define a type-safe flat API schema.
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
 * const api = createFlatClient<ApiSchema>({ baseUrl: "/api" });
 * ```
 */
export type SpooshSchema<
  T extends {
    [path: string]: {
      [M in FlatHttpMethod]?: {
        data: unknown;
        body?: unknown;
        query?: unknown;
        error?: unknown;
      };
    };
  },
> = T;
