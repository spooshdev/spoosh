import type {
  SpooshPlugin,
  PluginTypeConfig,
  MergePluginResults,
  ReadClient,
  TagMode,
} from "@spoosh/core";

type TagModeInArray = "all" | "self";

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
