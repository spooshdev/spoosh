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
  InfinitePage,
  InfiniteNextContext,
  InfinitePrevContext,
} from "@spoosh/core";

type TagModeInArray = "all" | "self";

type TriggerAwaitedReturn<T> = T extends (...args: never[]) => infer R
  ? Awaited<R>
  : never;

type ExtractInputFromResponse<T> = T extends { input: infer I } ? I : never;

type BaseTriggerOptions = {
  /** Bypass cache and force refetch. Default: true */
  force?: boolean;
};

export type PagesTriggerOptions<TReadFn> =
  ExtractInputFromResponse<TriggerAwaitedReturn<TReadFn>> extends infer I
    ? [I] extends [never]
      ? BaseTriggerOptions
      : ExtractTriggerQuery<I> &
          ExtractTriggerBody<I> &
          ExtractTriggerParams<I> &
          BaseTriggerOptions
    : BaseTriggerOptions;

/**
 * Options for `usePages` hook.
 *
 * @template TData - The response data type for each page
 * @template TItem - The item type after merging all responses
 * @template TError - The error type
 * @template TRequest - The request options type (query, params, body)
 * @template TMeta - Plugin metadata type
 */
export type BasePagesOptions<
  TData,
  TItem,
  TError = unknown,
  TRequest = InfiniteRequestOptions,
  TMeta = Record<string, unknown>,
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
   * Receives the last page to check for pagination indicators.
   * Default: `() => false` (no next page fetching)
   *
   * @example
   * ```ts
   * canFetchNext: ({ lastPage }) => lastPage?.data?.nextCursor != null
   * ```
   */
  canFetchNext?: (
    ctx: InfiniteNextContext<TData, TError, TRequest, TMeta>
  ) => boolean;

  /**
   * Callback to build the request options for the next page.
   * Return only the fields that change - they will be **merged** with the initial request.
   * Default: `() => ({})` (no changes to request)
   *
   * @example
   * ```ts
   * // Initial: { query: { cursor: 0, limit: 10 } }
   * // Only return cursor - limit is preserved automatically
   * nextPageRequest: ({ lastPage }) => ({
   *   query: { cursor: lastPage?.data?.nextCursor }
   * })
   * ```
   */
  nextPageRequest?: (
    ctx: InfiniteNextContext<TData, TError, TRequest, TMeta>
  ) => Partial<TRequest>;

  /**
   * Callback to merge all pages into a single array of items.
   *
   * @example
   * ```ts
   * merger: (pages) => pages.flatMap(p => p.data?.items ?? [])
   * ```
   */
  merger: (pages: InfinitePage<TData, TError, TMeta>[]) => TItem[];

  /**
   * Callback to determine if there's a previous page to fetch.
   * Receives the first page to check for pagination indicators.
   */
  canFetchPrev?: (
    ctx: InfinitePrevContext<TData, TError, TRequest, TMeta>
  ) => boolean;

  /**
   * Callback to build the request options for the previous page.
   * Return only the fields that change - they will be **merged** with the initial request.
   */
  prevPageRequest?: (
    ctx: InfinitePrevContext<TData, TError, TRequest, TMeta>
  ) => Partial<TRequest>;
};

/**
 * Result returned by `usePages` hook.
 *
 * @template TData - The response data type for each page
 * @template TError - The error type
 * @template TItem - The item type after merging all responses
 * @template TPluginResult - Plugin-provided result fields
 * @template TTriggerOptions - Options that can be passed to trigger()
 */
export type BasePagesResult<
  TData,
  TError,
  TItem,
  TPluginResult = Record<string, unknown>,
  TTriggerOptions = object,
> = {
  /** Merged items from all fetched pages */
  data: TItem[] | undefined;

  /** Array of all pages with status, data, error, and meta per page */
  pages: InfinitePage<TData, TError, TPluginResult>[];

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

  /** Trigger refetch of all pages from the beginning, optionally with new request options */
  trigger: (options?: TTriggerOptions) => Promise<void>;

  /** Abort the current fetch operation */
  abort: () => void;

  /** Error from the last failed request */
  error: TError | undefined;
};

export type UsePagesResult<
  TData,
  TError,
  TItem,
  TPlugins extends readonly SpooshPlugin<PluginTypeConfig>[],
  TTriggerOptions = object,
> = BasePagesResult<
  TData,
  TError,
  TItem,
  MergePluginResults<TPlugins>["read"],
  TTriggerOptions
>;

export type PagesApiClient<TSchema, TDefaultError> = ReadClient<
  TSchema,
  TDefaultError
>;
