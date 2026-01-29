import type {
  SpooshPlugin,
  SpooshResponse,
  SpooshClient,
  ReadClient,
  WriteClient,
  SpooshOptions,
  MergePluginResults,
  MethodOptionsMap,
  CoreRequestOptionsBase,
  PluginTypeConfig,
  TagMode,
} from "@spoosh/core";

type QueryRequestOptions = CoreRequestOptionsBase;

type MutationRequestOptions = CoreRequestOptionsBase;

export type ReactOptionsMap = MethodOptionsMap<
  QueryRequestOptions,
  MutationRequestOptions
>;

export type ApiClient<TSchema> = SpooshClient<TSchema, unknown>;

export type PluginHooksConfig<
  TPlugins extends readonly SpooshPlugin<PluginTypeConfig>[],
> = {
  baseUrl: string;
  defaultOptions?: SpooshOptions;
  plugins: TPlugins;
};

type TagModeInArray = "all" | "self";

/**
 * Base options for `useRead` hook.
 */
export type BaseReadOptions = {
  /** Whether to fetch automatically on mount. Default: true */
  enabled?: boolean;

  /**
   * Unified tag option
   * - String: mode only ('all' | 'self' | 'none')
   * - Array: custom tags only OR [mode keyword mixed with custom tags]
   *   - 'all' or 'self' can be used in arrays
   *   - 'none' should only be used as string (use `tags: 'none'` not in array)
   */
  tags?: TagMode | (TagModeInArray | (string & {}))[];
};

/**
 * Result returned by `useRead` hook.
 *
 * @template TData - The response data type
 * @template TError - The error type
 * @template TMeta - Plugin-provided metadata fields
 * @template TTriggerOptions - Options that can be passed to trigger()
 */
export type BaseReadResult<
  TData,
  TError,
  TMeta = Record<string, unknown>,
  TTriggerOptions = { force?: boolean },
> = {
  /** True during the initial load (no data yet) */
  loading: boolean;

  /** True during any fetch operation */
  fetching: boolean;

  /** Response data from the API */
  data: TData | undefined;

  /** Error from the last failed request */
  error: TError | undefined;

  /** Plugin-provided metadata */
  meta: TMeta;

  /** Abort the current fetch operation */
  abort: () => void;

  /**
   * Manually trigger a fetch.
   *
   * @param options - Optional override options (query, body, params) to use for this specific request
   */
  trigger: (
    options?: TTriggerOptions
  ) => Promise<SpooshResponse<TData, TError>>;
};

/**
 * Result returned by `useWrite` hook.
 *
 * @template TData - The response data type
 * @template TError - The error type
 * @template TOptions - The trigger options type
 * @template TMeta - Plugin-provided metadata fields
 */
export type BaseWriteResult<
  TData,
  TError,
  TOptions,
  TMeta = Record<string, unknown>,
> = {
  /** Execute the mutation with optional options */
  trigger: (options?: TOptions) => Promise<SpooshResponse<TData, TError>>;

  /** True while the mutation is in progress */
  loading: boolean;

  /** Response data from the API */
  data: TData | undefined;

  /** Error from the last failed request */
  error: TError | undefined;

  /** Plugin-provided metadata */
  meta: TMeta;

  /** Abort the current mutation */
  abort: () => void;
};

type OptionalQueryField<TQuery> = [TQuery] extends [never]
  ? object
  : undefined extends TQuery
    ? { query?: Exclude<TQuery, undefined> }
    : { query: TQuery };

type OptionalBodyField<TBody> = [TBody] extends [never]
  ? object
  : undefined extends TBody
    ? { body?: Exclude<TBody, undefined> }
    : { body: TBody };

type OptionalParamsField<TParamNames extends string> = [TParamNames] extends [
  never,
]
  ? object
  : { params: Record<TParamNames, string | number> };

type InputFields<
  TQuery,
  TBody,
  TParamNames extends string,
> = OptionalQueryField<TQuery> &
  OptionalBodyField<TBody> &
  OptionalParamsField<TParamNames>;

export type WriteResponseInputFields<
  TQuery,
  TBody,
  TParamNames extends string,
> = [TQuery, TBody, TParamNames] extends [never, never, never]
  ? object
  : { input: InputFields<TQuery, TBody, TParamNames> | undefined };

export type UseReadResult<
  TData,
  TError,
  TMeta,
  TPlugins extends readonly SpooshPlugin<PluginTypeConfig>[],
> = BaseReadResult<TData, TError, TMeta> & MergePluginResults<TPlugins>["read"];

export type UseWriteResult<
  TData,
  TError,
  TOptions,
  TMeta,
  TPlugins extends readonly SpooshPlugin<PluginTypeConfig>[],
> = BaseWriteResult<TData, TError, TOptions, TMeta> &
  MergePluginResults<TPlugins>["write"];

export type ReadApiClient<TSchema, TDefaultError> = ReadClient<
  TSchema,
  TDefaultError
>;

export type WriteApiClient<TSchema, TDefaultError> = WriteClient<
  TSchema,
  TDefaultError
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

export type ExtractCoreMethodOptions<T> = T extends (
  ...args: infer A
) => unknown
  ? A[0] extends object
    ? Pick<A[0], Extract<keyof A[0], "query" | "params" | "body">>
    : object
  : object;

type ExtractSuccessInput<T> =
  SuccessResponse<AwaitedReturnType<T>> extends {
    input?: infer I;
  }
    ? I
    : object;

export type ExtractResponseRequestOptions<T> = ExtractSuccessInput<T>;

export type ExtractMethodQuery<T> =
  ExtractMethodOptions<T> extends {
    query: infer Q;
  }
    ? Q
    : never;

export type ExtractMethodBody<T> =
  ExtractMethodOptions<T> extends {
    body: infer B;
  }
    ? B
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

export type ExtractResponseParamNames<T> =
  SuccessReturnType<T> extends { input: { params: Record<infer K, unknown> } }
    ? K extends string
      ? K
      : never
    : never;

type TriggerAwaitedReturn<T> = T extends (...args: never[]) => infer R
  ? Awaited<R>
  : never;

type ExtractInputFromResponse<T> = T extends { input: infer I } ? I : never;

type ExtractTriggerQuery<I> = I extends { query: infer Q }
  ? { query?: Q }
  : unknown;
type ExtractTriggerBody<I> = I extends { body: infer B }
  ? { body?: B }
  : unknown;
type ExtractTriggerParams<I> = I extends { params: infer P }
  ? { params?: P }
  : unknown;

export type TriggerOptions<T> =
  ExtractInputFromResponse<TriggerAwaitedReturn<T>> extends infer I
    ? [I] extends [never]
      ? { force?: boolean }
      : ExtractTriggerQuery<I> &
          ExtractTriggerBody<I> &
          ExtractTriggerParams<I> & {
            /** Force refetch even if data is cached */
            force?: boolean;
          }
    : { force?: boolean };

type QueryField<TQuery> = [TQuery] extends [never]
  ? object
  : undefined extends TQuery
    ? { query?: Exclude<TQuery, undefined> }
    : { query: TQuery };

type BodyField<TBody> = [TBody] extends [never]
  ? object
  : undefined extends TBody
    ? { body?: Exclude<TBody, undefined> }
    : { body: TBody };

type ParamsField<TParamNames extends string> = [TParamNames] extends [never]
  ? object
  : { params: Record<TParamNames, string | number> };

type ReadInputFields<
  TQuery,
  TBody,
  TParamNames extends string,
> = QueryField<TQuery> & BodyField<TBody> & ParamsField<TParamNames>;

export type ResponseInputFields<TQuery, TBody, TParamNames extends string> = [
  TQuery,
  TBody,
  TParamNames,
] extends [never, never, never]
  ? object
  : { input: ReadInputFields<TQuery, TBody, TParamNames> };

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
> = {
  /** Whether to fetch automatically on mount. Default: true */
  enabled?: boolean;

  /**
   * Unified tag option
   * - String: mode only ('all' | 'self' | 'none')
   * - Array: custom tags only OR [mode keyword mixed with custom tags]
   *   - 'all' or 'self' can be used in arrays
   *   - 'none' should only be used as string (use `tags: 'none'` not in array)
   */
  tags?: TagMode | (TagModeInArray | (string & {}))[];

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
 * @template TPluginResult - Plugin-provided result fields
 */
export type BaseInfiniteReadResult<
  TData,
  TError,
  TItem,
  TPluginResult = Record<string, unknown>,
> = {
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

  /** Plugin-provided metadata */
  meta: TPluginResult;

  /** Fetch the next page */
  fetchNext: () => Promise<void>;

  /** Fetch the previous page */
  fetchPrev: () => Promise<void>;

  /** Trigger refetch of all pages from the beginning */
  trigger: () => Promise<void>;

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

export type InfiniteReadApiClient<TSchema, TDefaultError> = ReadClient<
  TSchema,
  TDefaultError
>;
