export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export type SchemaMethod = "$get" | "$post" | "$put" | "$patch" | "$delete";

export type EnlaceResponse<TData, TError> =
  | {
      status: number;
      data: TData;
      headers?: Headers;
      error?: undefined;
      aborted?: false;
    }
  | {
      status: number;
      data?: undefined;
      headers?: Headers;
      error: TError;
      aborted?: boolean;
    };

export type RetryConfig = {
  /** Number of retry attempts for network errors. Set to 0 or false to disable. @default 3 */
  retry?: number | false;
  /** Base delay in ms between retries. Uses exponential backoff. @default 1000 */
  retryDelay?: number;
};

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

/** Base request options that are always available */
type BaseRequestOptions = {
  /** Request headers - merged with default headers. Can be HeadersInit or async function returning HeadersInit */
  headers?: HeadersInitOrGetter;

  /** Cache mode for the request */
  cache?: RequestCache;

  /** AbortSignal for cancelling the request */
  signal?: AbortSignal;
};

/** Conditional body option - only exists when TBody is not never */
type BodyOption<TBody> = [TBody] extends [never] ? object : { body: TBody };

/** Conditional query option - only exists when TQuery is not never */
type QueryOption<TQuery> = [TQuery] extends [never]
  ? object
  : { query: TQuery };

/** Conditional formData option - only exists when TFormData is not never */
type FormDataOption<TFormData> = [TFormData] extends [never]
  ? object
  : { formData: TFormData };

/** Per-request options - properties only appear when their types are defined */
export type RequestOptions<
  TBody = never,
  TQuery = never,
  TFormData = never,
> = BaseRequestOptions &
  BodyOption<TBody> &
  QueryOption<TQuery> &
  FormDataOption<TFormData>;

/** Runtime request options type - used internally for fetch execution */
export type AnyRequestOptions = BaseRequestOptions & {
  body?: unknown;
  query?: Record<string, string | number | boolean | undefined>;
  formData?: Record<string, unknown>;
  signal?: AbortSignal;
} & Partial<RetryConfig>;

/**
 * Params option - only available when accessing dynamic URL segments.
 * Used internally by the type system to conditionally show params option.
 */
type DynamicParamsOption = {
  /**
   * Path parameters for dynamic URL segments.
   * Used to replace :paramName placeholders in the URL path.
   * @example
   * // With path api.products[':id'].$get
   * api.products[':id'].$get({ params: { id: '123' } }) // → GET /products/123
   */
  params?: Record<string, string | number>;
};

/**
 * Core request options base with conditional params support.
 * Framework packages (enlace) can extend this to add additional options.
 */
export type CoreRequestOptionsBase = {
  /** @internal Used by type system to conditionally include params */
  __hasDynamicParams?: DynamicParamsOption;
};

/**
 * Maps HTTP methods to their respective options types.
 * Used to provide different autocomplete options for query vs mutation methods.
 */
export type MethodOptionsMap<
  TQueryOptions = object,
  TMutationOptions = object,
> = {
  $get: TQueryOptions;
  $post: TMutationOptions;
  $put: TMutationOptions;
  $patch: TMutationOptions;
  $delete: TMutationOptions;
};

/** Extract options type for a specific method from the options map */
type ExtractMethodOptions<TOptionsMap, TMethod extends SchemaMethod> =
  TOptionsMap extends MethodOptionsMap<infer TQuery, infer TMutation>
    ? TMethod extends "$get"
      ? TQuery
      : TMutation
    : TOptionsMap;

/** Function type for custom fetch implementations */
export type FetchExecutor<
  TOptions = EnlaceOptions,
  TRequestOptions = AnyRequestOptions,
> = <TData, TError>(
  baseUrl: string,
  path: string[],
  method: HttpMethod,
  defaultOptions: TOptions,
  requestOptions?: TRequestOptions
) => Promise<EnlaceResponse<TData, TError>>;

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

/** Helper to compute final request options with dynamic segment awareness */
type ComputeRequestOptions<
  TRequestOptionsBase,
  THasDynamicSegment extends boolean,
> = "__hasDynamicParams" extends keyof TRequestOptionsBase
  ? THasDynamicSegment extends true
    ? Omit<TRequestOptionsBase, "__hasDynamicParams"> &
        NonNullable<TRequestOptionsBase["__hasDynamicParams"]>
    : Omit<TRequestOptionsBase, "__hasDynamicParams">
  : TRequestOptionsBase;

// ============================================================================
// Optimistic Update Types
// ============================================================================

/** Extract data type from endpoint definition for optimistic updates */
type ExtractOptimisticData<T> = T extends { data: infer D }
  ? D
  : T extends void
    ? void
    : T;

/** Convert endpoint definition to a method signature for optimistic selector */
type EndpointToOptimisticMethod<T> = () => Promise<
  EnlaceResponse<ExtractOptimisticData<T>, unknown>
>;

/**
 * Helper type for navigating schema in optimistic `for` selector.
 * Provides autocomplete for schema paths and $get methods.
 */
type OptimisticSchemaHelper<TSchema> = {
  [K in keyof TSchema as K extends SchemaMethod | "_"
    ? never
    : K extends keyof TSchema
      ? K
      : never]: K extends keyof TSchema
    ? OptimisticSchemaHelper<TSchema[K]>
    : never;
} & {
  [K in SchemaMethod as K extends keyof TSchema
    ? K
    : never]: K extends keyof TSchema
    ? EndpointToOptimisticMethod<TSchema[K]>
    : never;
} & (TSchema extends { _: infer D }
    ? {
        [key: string]: OptimisticSchemaHelper<D>;
        [key: number]: OptimisticSchemaHelper<D>;
      }
    : object);

/** Config passed to the cache function */
export type CacheConfig<TData, TResponse = unknown> = {
  for: () => Promise<EnlaceResponse<TData, unknown>>;
  updater: (data: TData, response?: TResponse) => TData;
  timing?: "immediate" | "onSuccess";
  rollbackOnError?: boolean;
  /**
   * Still revalidate/refetch after optimistic update.
   * Rarely needed - use when API response has minimal data but you need complete data.
   * Consider returning full data from your API instead.
   * @default false
   */
  refetch?: boolean;
  /** Called when mutation fails. Useful for showing toast notifications. */
  onError?: (error: unknown) => void;
};

/** Resolved config returned by cache function (runtime type) */
export type ResolvedCacheConfig = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for: (...args: any[]) => Promise<EnlaceResponse<unknown, unknown>>;
  timing?: "immediate" | "onSuccess";
  updater: (data: unknown, response?: unknown) => unknown;
  rollbackOnError?: boolean;
  refetch?: boolean;
  onError?: (error: unknown) => void;
};

/** Optimistic callback function for mutations */
type OptimisticCallbackFn<TSchema, TResponse = unknown> = (
  cache: <TData>(config: CacheConfig<TData, TResponse>) => ResolvedCacheConfig,
  api: OptimisticSchemaHelper<TSchema>
) => ResolvedCacheConfig | ResolvedCacheConfig[];

/** Optimistic option for mutation methods */
type MutationOptimisticOption<TRootSchema, TResponse = unknown> = {
  optimistic?: OptimisticCallbackFn<TRootSchema, TResponse>;
};

/** Add optimistic option only for mutation methods */
type WithOptimistic<
  TSchema,
  TMethod extends SchemaMethod,
  TDefaultError,
  TRootSchema,
> = TMethod extends "$get"
  ? object
  : MutationOptimisticOption<
      TRootSchema,
      ExtractData<TSchema, TMethod, TDefaultError>
    >;

type MethodFn<
  TSchema,
  TMethod extends SchemaMethod,
  TDefaultError = unknown,
  TOptionsMap = object,
  THasDynamicSegment extends boolean = false,
  TRootSchema = TSchema,
> =
  HasMethod<TSchema, TMethod> extends true
    ? HasRequiredOptions<TSchema, TMethod, TDefaultError> extends true
      ? (
          options: RequestOptions<
            ExtractBody<TSchema, TMethod, TDefaultError>,
            ExtractQuery<TSchema, TMethod, TDefaultError>,
            ExtractFormData<TSchema, TMethod, TDefaultError>
          > &
            ComputeRequestOptions<
              ExtractMethodOptions<TOptionsMap, TMethod>,
              THasDynamicSegment
            > &
            WithOptimistic<TSchema, TMethod, TDefaultError, TRootSchema>
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
            ComputeRequestOptions<
              ExtractMethodOptions<TOptionsMap, TMethod>,
              THasDynamicSegment
            > &
            WithOptimistic<TSchema, TMethod, TDefaultError, TRootSchema>
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

type HttpMethods<
  TSchema,
  TDefaultError = unknown,
  TOptionsMap = object,
  THasDynamicSegment extends boolean = false,
  TRootSchema = TSchema,
> = {
  [K in SchemaMethod as K extends keyof TSchema ? K : never]: MethodFn<
    TSchema,
    K,
    TDefaultError,
    TOptionsMap,
    THasDynamicSegment,
    TRootSchema
  >;
};

type DynamicAccess<
  TSchema,
  TDefaultError = unknown,
  TOptionsMap = object,
  TRootSchema = TSchema,
> =
  ExtractDynamicSchema<TSchema> extends never
    ? object
    : {
        [key: string]: EnlaceClient<
          ExtractDynamicSchema<TSchema>,
          TDefaultError,
          TOptionsMap,
          true,
          TRootSchema
        >;
        [key: number]: EnlaceClient<
          ExtractDynamicSchema<TSchema>,
          TDefaultError,
          TOptionsMap,
          true,
          TRootSchema
        >;
      };

type MethodNameKeys = SchemaMethod;

type DynamicKey<
  TSchema,
  TDefaultError,
  TOptionsMap,
  TRootSchema = TSchema,
> = TSchema extends {
  _: infer D;
}
  ? { _: EnlaceClient<D, TDefaultError, TOptionsMap, true, TRootSchema> }
  : object;

/** Typed API client based on schema definition */
export type EnlaceClient<
  TSchema,
  TDefaultError = unknown,
  TOptionsMap = object,
  THasDynamicSegment extends boolean = false,
  TRootSchema = TSchema,
> = HttpMethods<
  TSchema,
  TDefaultError,
  TOptionsMap,
  THasDynamicSegment,
  TRootSchema
> &
  DynamicAccess<TSchema, TDefaultError, TOptionsMap, TRootSchema> &
  DynamicKey<TSchema, TDefaultError, TOptionsMap, TRootSchema> & {
    [K in keyof StaticPathKeys<TSchema> as K extends MethodNameKeys
      ? never
      : K]: EnlaceClient<
      TSchema[K],
      TDefaultError,
      TOptionsMap,
      THasDynamicSegment,
      TRootSchema
    >;
  };

/** Untyped API client - allows any path access when no schema is provided */
export type WildcardClient<TRequestOptionsBase = object> = {
  (
    options?: RequestOptions<unknown> & TRequestOptionsBase
  ): Promise<EnlaceResponse<unknown, unknown>>;
  $get: WildcardClient<TRequestOptionsBase>;
  $post: WildcardClient<TRequestOptionsBase>;
  $put: WildcardClient<TRequestOptionsBase>;
  $patch: WildcardClient<TRequestOptionsBase>;
  $delete: WildcardClient<TRequestOptionsBase>;
  [key: string]: WildcardClient<TRequestOptionsBase>;
  [key: number]: WildcardClient<TRequestOptionsBase>;
};
