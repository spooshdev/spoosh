export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export type SchemaMethod = "$get" | "$post" | "$put" | "$patch" | "$delete";

export type EnlaceResponse<TData, TError> =
  | { ok: true; status: number; data: TData; headers: Headers; error?: never }
  | { ok: false; status: number; data?: never; headers: Headers; error: TError }
  | { ok: false; status: 0; data?: never; headers: null; error: Error };

export type EnlaceOptions = Omit<RequestInit, "method" | "body">;

export type EnlaceCallbackPayload<T> = {
  status: number;
  data: T;
  headers: Headers;
};

export type EnlaceNetworkError = {
  status: 0;
  error: Error;
  headers: null;
};

export type EnlaceErrorCallbackPayload<T> =
  | { status: number; error: T; headers: Headers }
  | EnlaceNetworkError;

export type EnlaceCallbacks = {
  onSuccess?: ((payload: EnlaceCallbackPayload<unknown>) => void) | undefined;
  onError?: ((payload: EnlaceErrorCallbackPayload<unknown>) => void) | undefined;
};

/** Function type for custom fetch implementations */
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

/** Per-request options */
export type RequestOptions<TBody = never> = {
  /** Request body - automatically JSON stringified if object/array */
  body?: TBody;

  /** Query parameters appended to URL */
  query?: Record<string, string | number | boolean | undefined>;

  /** Request headers - merged with default headers */
  headers?: HeadersInit;

  /** Cache mode for the request */
  cache?: RequestCache;
};

export type MethodDefinition = {
  data: unknown;
  error: unknown;
  body?: unknown;
};

/**
 * Helper to define an endpoint with proper typing.
 * @example
 * type MyApi = {
 *   posts: {
 *     $get: Endpoint<Post[], ApiError>;
 *     $post: Endpoint<Post, ApiError, CreatePost>;
 *     _: { $get: Endpoint<Post, NotFoundError> };
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

/** Typed API client based on schema definition */
export type EnlaceClient<TSchema, TRequestOptionsBase = object> = HttpMethods<
  TSchema,
  TRequestOptionsBase
> &
  DynamicAccess<TSchema, TRequestOptionsBase> & {
    [K in keyof StaticPathKeys<TSchema> as K extends MethodNameKeys
      ? never
      : K]: EnlaceClient<TSchema[K], TRequestOptionsBase>;
  };

/** Untyped API client - allows any path access when no schema is provided */
export type WildcardClient<TRequestOptionsBase = object> = {
  (options?: RequestOptions<unknown> & TRequestOptionsBase): Promise<
    EnlaceResponse<unknown, unknown>
  >;
  get: WildcardClient<TRequestOptionsBase>;
  post: WildcardClient<TRequestOptionsBase>;
  put: WildcardClient<TRequestOptionsBase>;
  patch: WildcardClient<TRequestOptionsBase>;
  delete: WildcardClient<TRequestOptionsBase>;
  [key: string]: WildcardClient<TRequestOptionsBase>;
  [key: number]: WildcardClient<TRequestOptionsBase>;
};
