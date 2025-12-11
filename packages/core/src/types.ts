export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export type SchemaMethod = "$get" | "$post" | "$put" | "$patch" | "$delete";

export type EnlaceResponse<TData, TError> =
  | { status: number; data: TData; headers?: Headers; error?: undefined }
  | { status: number; data?: undefined; headers?: Headers; error: TError };

export type HeadersInitOrGetter =
  | HeadersInit
  | (() => HeadersInit | Promise<HeadersInit>);

export type EnlaceOptions = Omit<RequestInit, "method" | "body" | "headers"> & {
  headers?: HeadersInitOrGetter;
};

export type EnlaceCallbackPayload<T> = {
  status: number;
  data: T;
  headers?: Headers;
};

export type EnlaceErrorCallbackPayload<T> = {
  status: number;
  error: T;
  headers?: Headers;
};

export type EnlaceCallbacks = {
  onSuccess?: ((payload: EnlaceCallbackPayload<unknown>) => void) | undefined;
  onError?:
    | ((payload: EnlaceErrorCallbackPayload<unknown>) => void)
    | undefined;
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
export type RequestOptions<TBody = never, TQuery = never, TFormData = never> = {
  /** Request body - automatically JSON stringified if object/array */
  body?: TBody;

  /** Query parameters appended to URL */
  query?: [TQuery] extends [never]
    ? Record<string, string | number | boolean | undefined>
    : TQuery;

  /** FormData for file uploads - automatically converted to FormData */
  formData?: TFormData;

  /** Request headers - merged with default headers. Can be HeadersInit or async function returning HeadersInit */
  headers?: HeadersInitOrGetter;

  /** Cache mode for the request */
  cache?: RequestCache;
};

export type MethodDefinition = {
  data: unknown;
  error: unknown;
  body?: unknown;
};

declare const EndpointBrand: unique symbol;

/**
 * Helper to define an endpoint with proper typing.
 * @example
 * type MyApi = {
 *   posts: {
 *     $get: Post[];  // Direct type - simplest (error from global default)
 *     $post: Endpoint<Post, CreatePost>;  // Data + Body (error from global default)
 *     $put: Endpoint<Post, UpdatePost, CustomError>;  // Data + Body + Error
 *     $delete: Endpoint<void>;  // Data only with Endpoint
 *     _: { $get: Endpoint<Post, never, NotFoundError> };  // Data + explicit Error
 *   };
 * };
 */
export type Endpoint<TData, TBody = never, TError = never> = {
  [EndpointBrand]: true;
} & ([TBody] extends [never]
  ? [TError] extends [never]
    ? { data: TData }
    : { data: TData; error: TError }
  : [TError] extends [never]
    ? { data: TData; body: TBody }
    : { data: TData; error: TError; body: TBody });

/**
 * Endpoint with typed query parameters.
 * @example
 * type MyApi = {
 *   users: {
 *     $get: EndpointWithQuery<User[], { page: number; limit: number; search?: string }>;
 *   };
 * };
 */
export type EndpointWithQuery<TData, TQuery, TError = never> = {
  [EndpointBrand]: true;
} & ([TError] extends [never]
  ? { data: TData; query: TQuery }
  : { data: TData; query: TQuery; error: TError });

/**
 * Endpoint with FormData (file uploads).
 * @example
 * type MyApi = {
 *   uploads: {
 *     $post: EndpointWithFormData<Upload, { file: Blob | File; name: string }>;
 *   };
 * };
 */
export type EndpointWithFormData<TData, TFormData, TError = never> = {
  [EndpointBrand]: true;
} & ([TError] extends [never]
  ? { data: TData; formData: TFormData }
  : { data: TData; formData: TFormData; error: TError });

/**
 * Full endpoint definition for complex cases.
 * @example
 * type MyApi = {
 *   products: {
 *     $post: EndpointFull<{
 *       data: Product;
 *       body: CreateProduct;
 *       query: { categoryId: string };
 *       error: ValidationError;
 *     }>;
 *   };
 * };
 */
export type EndpointFull<
  T extends {
    data: unknown;
    body?: unknown;
    query?: unknown;
    formData?: unknown;
    error?: unknown;
  },
> = { [EndpointBrand]: true } & T;

/**
 * Normalizes endpoint definitions to standard MethodDefinition format.
 * Only extracts data/body/error/query/formData from branded Endpoint types.
 * Non-Endpoint types pass through as-is (the whole type becomes the data type).
 */
type NormalizeEndpoint<T, TDefaultError> = T extends { [EndpointBrand]: true }
  ? {
      data: T extends { data: infer D } ? D : never;
      error: T extends { error: infer E } ? E : TDefaultError;
      body: T extends { body: infer B } ? B : never;
      query: T extends { query: infer Q } ? Q : never;
      formData: T extends { formData: infer F } ? F : never;
    }
  : {
      data: T;
      error: TDefaultError;
      body: never;
      query: never;
      formData: never;
    };

type ExtractMethodDef<
  TSchema,
  TMethod extends SchemaMethod,
  TDefaultError = unknown,
> = TSchema extends { [K in TMethod]: infer M }
  ? NormalizeEndpoint<M, TDefaultError>
  : never;

type ExtractData<
  TSchema,
  TMethod extends SchemaMethod,
  TDefaultError = unknown,
> =
  ExtractMethodDef<TSchema, TMethod, TDefaultError> extends { data: infer D }
    ? D
    : never;

type ExtractError<
  TSchema,
  TMethod extends SchemaMethod,
  TDefaultError = unknown,
> =
  ExtractMethodDef<TSchema, TMethod, TDefaultError> extends { error: infer E }
    ? E
    : TDefaultError;

type ExtractBody<
  TSchema,
  TMethod extends SchemaMethod,
  TDefaultError = unknown,
> =
  ExtractMethodDef<TSchema, TMethod, TDefaultError> extends { body: infer B }
    ? B
    : never;

type ExtractQuery<
  TSchema,
  TMethod extends SchemaMethod,
  TDefaultError = unknown,
> =
  ExtractMethodDef<TSchema, TMethod, TDefaultError> extends { query: infer Q }
    ? Q
    : never;

type ExtractFormData<
  TSchema,
  TMethod extends SchemaMethod,
  TDefaultError = unknown,
> =
  ExtractMethodDef<TSchema, TMethod, TDefaultError> extends {
    formData: infer F;
  }
    ? F
    : never;

type HasMethod<TSchema, TMethod extends SchemaMethod> = TSchema extends {
  [K in TMethod]: unknown;
}
  ? true
  : false;

type HasRequiredOptions<
  TSchema,
  TMethod extends SchemaMethod,
  TDefaultError = unknown,
> = [ExtractBody<TSchema, TMethod, TDefaultError>] extends [never]
  ? [ExtractFormData<TSchema, TMethod, TDefaultError>] extends [never]
    ? false
    : true
  : true;

type MethodFn<
  TSchema,
  TMethod extends SchemaMethod,
  TDefaultError = unknown,
  TRequestOptionsBase = object,
> =
  HasMethod<TSchema, TMethod> extends true
    ? HasRequiredOptions<TSchema, TMethod, TDefaultError> extends true
      ? (
          options: RequestOptions<
            ExtractBody<TSchema, TMethod, TDefaultError>,
            ExtractQuery<TSchema, TMethod, TDefaultError>,
            ExtractFormData<TSchema, TMethod, TDefaultError>
          > &
            TRequestOptionsBase
        ) => Promise<
          EnlaceResponse<
            ExtractData<TSchema, TMethod, TDefaultError>,
            ExtractError<TSchema, TMethod, TDefaultError>
          >
        >
      : (
          options?: RequestOptions<
            never,
            ExtractQuery<TSchema, TMethod, TDefaultError>,
            never
          > &
            TRequestOptionsBase
        ) => Promise<
          EnlaceResponse<
            ExtractData<TSchema, TMethod, TDefaultError>,
            ExtractError<TSchema, TMethod, TDefaultError>
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
  TDefaultError = unknown,
  TRequestOptionsBase = object,
> = TMethodName extends keyof TSchema
  ? EnlaceClient<TSchema[TMethodName], TDefaultError, TRequestOptionsBase>
  : MethodFn<TSchema, TSchemaMethod, TDefaultError, TRequestOptionsBase>;

type HttpMethods<
  TSchema,
  TDefaultError = unknown,
  TRequestOptionsBase = object,
> = {
  get: MethodOrPath<TSchema, "get", "$get", TDefaultError, TRequestOptionsBase>;
  post: MethodOrPath<
    TSchema,
    "post",
    "$post",
    TDefaultError,
    TRequestOptionsBase
  >;
  put: MethodOrPath<TSchema, "put", "$put", TDefaultError, TRequestOptionsBase>;
  patch: MethodOrPath<
    TSchema,
    "patch",
    "$patch",
    TDefaultError,
    TRequestOptionsBase
  >;
  delete: MethodOrPath<
    TSchema,
    "delete",
    "$delete",
    TDefaultError,
    TRequestOptionsBase
  >;
};

type DynamicAccess<
  TSchema,
  TDefaultError = unknown,
  TRequestOptionsBase = object,
> =
  ExtractDynamicSchema<TSchema> extends never
    ? object
    : {
        [key: string]: EnlaceClient<
          ExtractDynamicSchema<TSchema>,
          TDefaultError,
          TRequestOptionsBase
        >;
        [key: number]: EnlaceClient<
          ExtractDynamicSchema<TSchema>,
          TDefaultError,
          TRequestOptionsBase
        >;
      };

type MethodNameKeys = "get" | "post" | "put" | "patch" | "delete";

/** Typed API client based on schema definition */
export type EnlaceClient<
  TSchema,
  TDefaultError = unknown,
  TRequestOptionsBase = object,
> = HttpMethods<TSchema, TDefaultError, TRequestOptionsBase> &
  DynamicAccess<TSchema, TDefaultError, TRequestOptionsBase> & {
    [K in keyof StaticPathKeys<TSchema> as K extends MethodNameKeys
      ? never
      : K]: EnlaceClient<TSchema[K], TDefaultError, TRequestOptionsBase>;
  };

/** Untyped API client - allows any path access when no schema is provided */
export type WildcardClient<TRequestOptionsBase = object> = {
  (
    options?: RequestOptions<unknown> & TRequestOptionsBase
  ): Promise<EnlaceResponse<unknown, unknown>>;
  get: WildcardClient<TRequestOptionsBase>;
  post: WildcardClient<TRequestOptionsBase>;
  put: WildcardClient<TRequestOptionsBase>;
  patch: WildcardClient<TRequestOptionsBase>;
  delete: WildcardClient<TRequestOptionsBase>;
  [key: string]: WildcardClient<TRequestOptionsBase>;
  [key: number]: WildcardClient<TRequestOptionsBase>;
};
