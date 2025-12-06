export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export type SchemaMethod = "$get" | "$post" | "$put" | "$patch" | "$delete";

export type EnlaceResponse<TData, TError> =
  | { ok: true; status: number; data: TData; error?: never }
  | { ok: false; status: number; data?: never; error: TError };

export type EnlaceOptions = Omit<RequestInit, "method" | "body">;

export type FetchExecutor<
  TOptions = EnlaceOptions,
  TRequestOptions = RequestOptions<unknown>,
> = <TData, TError>(
  baseUrl: string,
  path: string[],
  method: HttpMethod,
  defaultOptions: TOptions,
  requestOptions?: TRequestOptions
) => Promise<EnlaceResponse<TData, TError>>;

export type RequestOptions<TBody = never> = {
  body?: TBody;
  query?: Record<string, string | number | boolean | undefined>;
  headers?: HeadersInit;
  cache?: RequestCache;
};

export type MethodDefinition = {
  data: unknown;
  error: unknown;
  body?: unknown;
};

// ============================================
// Schema Definition Helpers
// ============================================

/**
 * Helper to define an endpoint with proper typing.
 * Provides cleaner syntax than writing { data, error, body } manually.
 *
 * @example
 * type MyApi = {
 *   posts: {
 *     $get: Endpoint<Post[], ApiError>;
 *     $post: Endpoint<Post, ApiError, CreatePost>;  // with body
 *     _: {
 *       $get: Endpoint<Post, NotFoundError>;
 *     };
 *   };
 * };
 */
export type Endpoint<TData, TError, TBody = never> = [TBody] extends [never]
  ? { data: TData; error: TError }
  : { data: TData; error: TError; body: TBody };

type ExtractMethodDef<TSchema, TMethod extends SchemaMethod> = TSchema extends {
  [K in TMethod]: infer M;
}
  ? M extends MethodDefinition
    ? M
    : never
  : never;

type ExtractData<TSchema, TMethod extends SchemaMethod> =
  ExtractMethodDef<TSchema, TMethod> extends { data: infer D } ? D : never;

type ExtractError<TSchema, TMethod extends SchemaMethod> =
  ExtractMethodDef<TSchema, TMethod> extends { error: infer E } ? E : never;

type ExtractBody<TSchema, TMethod extends SchemaMethod> =
  ExtractMethodDef<TSchema, TMethod> extends { body: infer B } ? B : never;

type HasMethod<TSchema, TMethod extends SchemaMethod> = TSchema extends {
  [K in TMethod]: MethodDefinition;
}
  ? true
  : false;

type MethodFn<
  TSchema,
  TMethod extends SchemaMethod,
  TRequestOptionsBase = object,
> =
  HasMethod<TSchema, TMethod> extends true
    ? ExtractBody<TSchema, TMethod> extends never
      ? (
          options?: RequestOptions<never> & TRequestOptionsBase
        ) => Promise<
          EnlaceResponse<
            ExtractData<TSchema, TMethod>,
            ExtractError<TSchema, TMethod>
          >
        >
      : (
          options: RequestOptions<ExtractBody<TSchema, TMethod>> &
            TRequestOptionsBase
        ) => Promise<
          EnlaceResponse<
            ExtractData<TSchema, TMethod>,
            ExtractError<TSchema, TMethod>
          >
        >
    : never;

type IsSpecialKey<K> = K extends SchemaMethod | "_" ? true : false;

type StaticPathKeys<TSchema> = {
  [K in keyof TSchema as IsSpecialKey<K> extends true
    ? never
    : K extends string
      ? K
      : never]: TSchema[K];
};

type ExtractDynamicSchema<TSchema> = TSchema extends { _: infer D } ? D : never;

type MethodOrPath<
  TSchema,
  TMethodName extends string,
  TSchemaMethod extends SchemaMethod,
  TRequestOptionsBase = object,
> = TMethodName extends keyof TSchema
  ? EnlaceClient<TSchema[TMethodName], TRequestOptionsBase>
  : MethodFn<TSchema, TSchemaMethod, TRequestOptionsBase>;

type HttpMethods<TSchema, TRequestOptionsBase = object> = {
  get: MethodOrPath<TSchema, "get", "$get", TRequestOptionsBase>;
  post: MethodOrPath<TSchema, "post", "$post", TRequestOptionsBase>;
  put: MethodOrPath<TSchema, "put", "$put", TRequestOptionsBase>;
  patch: MethodOrPath<TSchema, "patch", "$patch", TRequestOptionsBase>;
  delete: MethodOrPath<TSchema, "delete", "$delete", TRequestOptionsBase>;
};

type DynamicAccess<TSchema, TRequestOptionsBase = object> =
  ExtractDynamicSchema<TSchema> extends never
    ? object
    : {
        [key: string]: EnlaceClient<
          ExtractDynamicSchema<TSchema>,
          TRequestOptionsBase
        >;
        [key: number]: EnlaceClient<
          ExtractDynamicSchema<TSchema>,
          TRequestOptionsBase
        >;
      };

type MethodNameKeys = "get" | "post" | "put" | "patch" | "delete";

export type EnlaceClient<TSchema, TRequestOptionsBase = object> = HttpMethods<
  TSchema,
  TRequestOptionsBase
> &
  DynamicAccess<TSchema, TRequestOptionsBase> & {
    [K in keyof StaticPathKeys<TSchema> as K extends MethodNameKeys
      ? never
      : K]: EnlaceClient<TSchema[K], TRequestOptionsBase>;
  };

// ============================================
// Wildcard (Untyped) Mode
// ============================================

type WildcardMethodFn<TRequestOptionsBase = object> = (
  options?: RequestOptions<unknown> & TRequestOptionsBase
) => Promise<EnlaceResponse<unknown, unknown>>;

/**
 * Wildcard client type - allows any path access when no schema is provided.
 * All methods are available at every level and return unknown types.
 */
export type WildcardClient<TRequestOptionsBase = object> = {
  get: WildcardMethodFn<TRequestOptionsBase>;
  post: WildcardMethodFn<TRequestOptionsBase>;
  put: WildcardMethodFn<TRequestOptionsBase>;
  patch: WildcardMethodFn<TRequestOptionsBase>;
  delete: WildcardMethodFn<TRequestOptionsBase>;
} & {
  [key: string]: WildcardClient<TRequestOptionsBase>;
  [key: number]: WildcardClient<TRequestOptionsBase>;
};
