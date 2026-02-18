import type {
  SpooshPlugin,
  PluginTypeConfig,
  MergePluginResults,
  ReadClient,
  TagMode,
  ExtractTriggerQuery,
  ExtractTriggerBody,
  ExtractTriggerParams,
  InfiniteRequestOptions,
} from "@spoosh/core";

type TagModeInArray = "all" | "self";

type TriggerAwaitedReturn<T> = T extends (...args: never[]) => infer R
  ? Awaited<R>
  : never;

type ExtractInputFromResponse<T> = T extends { input: infer I } ? I : never;

export type InfiniteTriggerOptions<TReadFn> =
  ExtractInputFromResponse<TriggerAwaitedReturn<TReadFn>> extends infer I
    ? [I] extends [never]
      ? object
      : ExtractTriggerQuery<I> & ExtractTriggerBody<I> & ExtractTriggerParams<I>
    : object;

/**
 * Context passed to `canFetchNext` and `nextPageRequest` callbacks.
 */
export type InfiniteNextContext<TData, TRequest> = {
  /**
   * The last (most recent) page's response data.
   * Use this to check if more pages exist (e.g., `response?.nextCursor != null`).
   */
  response: TData | undefined;

  /** All responses fetched so far, ordered from first to last page */
  allResponses: TData[];

  /**
   * The request options used to fetch the last page.
   * Useful for offset-based pagination (e.g., `request.query.page + 1`).
   */
  request: TRequest;
};

/**
 * Context passed to `canFetchPrev` and `prevPageRequest` callbacks.
 */
export type InfinitePrevContext<TData, TRequest> = {
  /**
   * The first (earliest) page's response data.
   * Use this to check if previous pages exist (e.g., `response?.prevCursor != null`).
   */
  response: TData | undefined;

  /** All responses fetched so far, ordered from first to last page */
  allResponses: TData[];

  /**
   * The request options used to fetch the first page.
   * Useful for offset-based pagination (e.g., `request.query.page - 1`).
   */
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
  TRequest = InfiniteRequestOptions,
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

  /**
   * Callback to determine if there's a next page to fetch.
   * Receives the last page's response to check for pagination indicators.
   * Default: `() => false` (no next page fetching)
   *
   * @example
   * ```ts
   * canFetchNext: ({ response }) => response?.nextCursor != null
   * ```
   */
  canFetchNext?: (ctx: InfiniteNextContext<TData, TRequest>) => boolean;

  /**
   * Callback to build the request options for the next page.
   * Return only the fields that change - they will be **merged** with the initial request.
   * Default: `() => ({})` (no changes to request)
   *
   * @example
   * ```ts
   * // Initial: { query: { cursor: 0, limit: 10 } }
   * // Only return cursor - limit is preserved automatically
   * nextPageRequest: ({ response }) => ({
   *   query: { cursor: response?.nextCursor }
   * })
   * ```
   */
  nextPageRequest?: (
    ctx: InfiniteNextContext<TData, TRequest>
  ) => Partial<TRequest>;

  /** Callback to merge all responses into a single array of items */
  merger: (allResponses: TData[]) => TItem[];

  /**
   * Callback to determine if there's a previous page to fetch.
   * Receives the first page's response to check for pagination indicators.
   */
  canFetchPrev?: (ctx: InfinitePrevContext<TData, TRequest>) => boolean;

  /**
   * Callback to build the request options for the previous page.
   * Return only the fields that change - they will be **merged** with the initial request.
   */
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
 * @template TTriggerOptions - Options that can be passed to trigger()
 */
export type BaseInfiniteReadResult<
  TData,
  TError,
  TItem,
  TPluginResult = Record<string, unknown>,
  TTriggerOptions = object,
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

  /** Trigger refetch of all pages from the beginning, optionally with new request options */
  trigger: (options?: TTriggerOptions) => Promise<void>;

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
  TTriggerOptions = object,
> = BaseInfiniteReadResult<
  TData,
  TError,
  TItem,
  MergePluginResults<TPlugins>["read"],
  TTriggerOptions
>;

export type InfiniteReadApiClient<TSchema, TDefaultError> = ReadClient<
  TSchema,
  TDefaultError
>;
