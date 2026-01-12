import type {
  SpooshPlugin,
  SpooshResponse,
  SpooshClient,
  QueryOnlyClient,
  MutationOnlyClient,
  SpooshOptions,
  MergePluginResults,
  MethodOptionsMap,
  CoreRequestOptionsBase,
  ResolveSchemaTypes,
  ResolveTypes,
  ResolverContext,
  PluginTypeConfig,
  TagOptions,
} from "@spoosh/core";

type QueryRequestOptions = CoreRequestOptionsBase;

type MutationRequestOptions = CoreRequestOptionsBase;

export type ReactOptionsMap = MethodOptionsMap<
  QueryRequestOptions,
  MutationRequestOptions
>;

export type ApiClient<TSchema> = SpooshClient<
  TSchema,
  unknown,
  ReactOptionsMap
>;

export type PluginHooksConfig<
  TPlugins extends readonly SpooshPlugin<PluginTypeConfig>[],
> = {
  baseUrl: string;
  defaultOptions?: SpooshOptions;
  plugins: TPlugins;
};

/**
 * Base options for `useRead` hook.
 */
export type BaseReadOptions = TagOptions & {
  /** Whether to fetch automatically on mount. Default: true */
  enabled?: boolean;
};

export type { ResolveSchemaTypes, ResolveTypes, ResolverContext };

/**
 * Result returned by `useRead` hook.
 *
 * @template TData - The response data type
 * @template TError - The error type
 */
export type BaseReadResult<TData, TError> = {
  /** True during the initial load (no data yet) */
  loading: boolean;

  /** True during any fetch operation */
  fetching: boolean;

  /** Response data from the API */
  data: TData | undefined;

  /** Error from the last failed request */
  error: TError | undefined;

  /** Abort the current fetch operation */
  abort: () => void;

  /** Manually trigger a refetch */
  refetch: () => Promise<SpooshResponse<TData, TError>>;
};

/**
 * Result returned by `useWrite` hook.
 *
 * @template TData - The response data type
 * @template TError - The error type
 * @template TOptions - The trigger options type
 */
export type BaseWriteResult<TData, TError, TOptions> = {
  /** Execute the mutation with optional options */
  trigger: (options?: TOptions) => Promise<SpooshResponse<TData, TError>>;

  /** True while the mutation is in progress */
  loading: boolean;

  /** Response data from the API */
  data: TData | undefined;

  /** Error from the last failed request */
  error: TError | undefined;

  /** Reset the state to initial values */
  reset: () => void;

  /** Abort the current mutation */
  abort: () => void;
};

type OptionalQueryField<TQuery> = [TQuery] extends [never]
  ? object
  : { query: TQuery };

type OptionalBodyField<TBody> = [TBody] extends [never]
  ? object
  : { body: TBody };

type OptionalFormDataField<TFormData> = [TFormData] extends [never]
  ? object
  : { formData: TFormData };

type OptionalParamsField<TParamNames extends string> = [TParamNames] extends [
  never,
]
  ? object
  : { params: Record<TParamNames, string | number> };

type InputFields<
  TQuery,
  TBody,
  TFormData,
  TParamNames extends string,
> = OptionalQueryField<TQuery> &
  OptionalBodyField<TBody> &
  OptionalFormDataField<TFormData> &
  OptionalParamsField<TParamNames>;

export type WriteResponseInputFields<
  TQuery,
  TBody,
  TFormData,
  TParamNames extends string,
> = [TQuery, TBody, TFormData, TParamNames] extends [never, never, never, never]
  ? object
  : { input: InputFields<TQuery, TBody, TFormData, TParamNames> | undefined };

export type UseReadResult<
  TData,
  TError,
  TPlugins extends readonly SpooshPlugin<PluginTypeConfig>[],
> = BaseReadResult<TData, TError> & MergePluginResults<TPlugins>["read"];

export type UseWriteResult<
  TData,
  TError,
  TOptions,
  TPlugins extends readonly SpooshPlugin<PluginTypeConfig>[],
> = BaseWriteResult<TData, TError, TOptions> &
  MergePluginResults<TPlugins>["write"];

export type ReadApiClient<TSchema, TDefaultError> = QueryOnlyClient<
  TSchema,
  TDefaultError,
  ReactOptionsMap
>;

export type WriteApiClient<TSchema, TDefaultError> = MutationOnlyClient<
  TSchema,
  TDefaultError,
  ReactOptionsMap
>;

type SuccessResponse<T> = Extract<T, { data: unknown; error?: undefined }>;

type ErrorResponse<T> = Extract<T, { error: unknown; data?: undefined }>;

export type ExtractMethodData<T> = T extends (...args: never[]) => infer R
  ? SuccessResponse<Awaited<R>> extends { data: infer D }
  ? D
  : unknown
  : unknown;

export type ExtractMethodError<T> = T extends (...args: never[]) => infer R
  ? ErrorResponse<Awaited<R>> extends { error: infer E }
  ? E
  : unknown
  : unknown;

export type ExtractMethodOptions<T> = T extends (...args: infer A) => unknown
  ? A[0]
  : never;

type AwaitedReturnType<T> = T extends (...args: never[]) => infer R
  ? Awaited<R>
  : never;

type SuccessReturnType<T> = SuccessResponse<AwaitedReturnType<T>>;

export type ExtractResponseQuery<T> =
  SuccessReturnType<T> extends {
    input: { query: infer Q };
  }
  ? Q
  : never;

export type ExtractResponseBody<T> =
  SuccessReturnType<T> extends {
    input: { body: infer B };
  }
  ? B
  : never;

export type ExtractResponseFormData<T> =
  SuccessReturnType<T> extends {
    input: { formData: infer F };
  }
  ? F
  : never;

export type ExtractResponseParamNames<T> =
  SuccessReturnType<T> extends { input: { params: Record<infer K, unknown> } }
  ? K extends string
  ? K
  : never
  : never;

type QueryField<TQuery> = [TQuery] extends [never] ? object : { query: TQuery };

type BodyField<TBody> = [TBody] extends [never] ? object : { body: TBody };

type FormDataField<TFormData> = [TFormData] extends [never]
  ? object
  : { formData: TFormData };

type ParamsField<TParamNames extends string> = [TParamNames] extends [never]
  ? object
  : { params: Record<TParamNames, string | number> };

type ReadInputFields<
  TQuery,
  TBody,
  TFormData,
  TParamNames extends string,
> = QueryField<TQuery> &
  BodyField<TBody> &
  FormDataField<TFormData> &
  ParamsField<TParamNames>;

export type ResponseInputFields<
  TQuery,
  TBody,
  TFormData,
  TParamNames extends string,
> = [TQuery, TBody, TFormData, TParamNames] extends [never, never, never, never]
  ? object
  : { input: ReadInputFields<TQuery, TBody, TFormData, TParamNames> };

export type AnyInfiniteRequestOptions = {
  query?: Record<string, unknown>;
  params?: Record<string, string | number>;
  body?: unknown;
};

/**
 * Context passed to `canFetchNext` and `nextPageRequest` callbacks.
 */
export type InfiniteNextContext<TData, TRequest> = {
  /** The latest fetched response data */
  response: TData | undefined;

  /** All responses fetched so far */
  allResponses: TData[];

  /** The current request options (query, params, body) */
  request: TRequest;
};

/**
 * Context passed to `canFetchPrev` and `prevPageRequest` callbacks.
 */
export type InfinitePrevContext<TData, TRequest> = {
  /** The latest fetched response data */
  response: TData | undefined;

  /** All responses fetched so far */
  allResponses: TData[];

  /** The current request options (query, params, body) */
  request: TRequest;
};

/**
 * Options for `useInfiniteRead` hook.
 *
 * @template TData - The response data type for each page
 * @template TItem - The item type after merging all responses
 * @template TRequest - The request options type (query, params, body)
 */
export type BaseInfiniteReadOptions<
  TData,
  TItem,
  TRequest = AnyInfiniteRequestOptions,
> = TagOptions & {
  /** Whether to fetch automatically on mount. Default: true */
  enabled?: boolean;

  /** Callback to determine if there's a next page to fetch */
  canFetchNext: (ctx: InfiniteNextContext<TData, TRequest>) => boolean;

  /** Callback to build the request options for the next page */
  nextPageRequest: (
    ctx: InfiniteNextContext<TData, TRequest>
  ) => Partial<TRequest>;

  /** Callback to merge all responses into a single array of items */
  merger: (allResponses: TData[]) => TItem[];

  /** Callback to determine if there's a previous page to fetch */
  canFetchPrev?: (ctx: InfinitePrevContext<TData, TRequest>) => boolean;

  /** Callback to build the request options for the previous page */
  prevPageRequest?: (
    ctx: InfinitePrevContext<TData, TRequest>
  ) => Partial<TRequest>;
};

/**
 * Result returned by `useInfiniteRead` hook.
 *
 * @template TData - The response data type for each page
 * @template TError - The error type
 * @template TItem - The item type after merging all responses
 */
export type BaseInfiniteReadResult<TData, TError, TItem> = {
  /** Merged items from all fetched responses */
  data: TItem[] | undefined;

  /** Array of all raw response data */
  allResponses: TData[] | undefined;

  /** True during the initial load (no data yet) */
  loading: boolean;

  /** True during any fetch operation */
  fetching: boolean;

  /** True while fetching the next page */
  fetchingNext: boolean;

  /** True while fetching the previous page */
  fetchingPrev: boolean;

  /** Whether there's a next page available to fetch */
  canFetchNext: boolean;

  /** Whether there's a previous page available to fetch */
  canFetchPrev: boolean;

  /** Fetch the next page */
  fetchNext: () => Promise<void>;

  /** Fetch the previous page */
  fetchPrev: () => Promise<void>;

  /** Refetch all pages from the beginning */
  refetch: () => Promise<void>;

  /** Abort the current fetch operation */
  abort: () => void;

  /** Error from the last failed request */
  error: TError | undefined;
};

export type UseInfiniteReadResult<
  TData,
  TError,
  TItem,
  TPlugins extends readonly SpooshPlugin<PluginTypeConfig>[],
> = BaseInfiniteReadResult<TData, TError, TItem> &
  MergePluginResults<TPlugins>["read"];

export type InfiniteReadApiClient<TSchema, TDefaultError> = QueryOnlyClient<
  TSchema,
  TDefaultError,
  ReactOptionsMap
>;
