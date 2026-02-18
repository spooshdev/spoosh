import type { Signal } from "@angular/core";
import type {
  ReadClient,
  TagOptions,
  ExtractTriggerQuery,
  ExtractTriggerBody,
  ExtractTriggerParams,
  InfinitePage,
  InfiniteNextContext,
  InfinitePrevContext,
} from "@spoosh/core";
import type { EnabledOption } from "../types/shared";

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
 * Options for `injectPages`.
 *
 * @template TData - The response data type for each page
 * @template TItem - The item type after merging all pages
 * @template TError - The error type
 * @template TRequest - The request options type
 * @template TMeta - Plugin metadata type
 */
export interface BasePagesOptions<
  TData,
  TItem,
  TError = unknown,
  TRequest = object,
  TMeta = Record<string, unknown>,
> extends TagOptions {
  enabled?: EnabledOption;

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
   * Callback to determine if there's a previous page to fetch.
   * Receives the first page to check for pagination indicators.
   * Default: `() => false` (no previous page fetching)
   */
  canFetchPrev?: (
    ctx: InfinitePrevContext<TData, TError, TRequest, TMeta>
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
   * Callback to build the request options for the previous page.
   * Return only the fields that change - they will be **merged** with the initial request.
   */
  prevPageRequest?: (
    ctx: InfinitePrevContext<TData, TError, TRequest, TMeta>
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
}

/**
 * Result returned by `injectPages`.
 *
 * @template TData - The response data type for each page
 * @template TError - The error type
 * @template TItem - The item type after merging all pages
 * @template TPluginResult - Plugin-provided result fields
 * @template TTriggerOptions - Options that can be passed to trigger()
 */
export interface BasePagesResult<
  TData,
  TError,
  TItem,
  TPluginResult = Record<string, unknown>,
  TTriggerOptions = object,
> {
  /** Merged items from all fetched pages */
  data: Signal<TItem[] | undefined>;

  /** Array of all pages with status, data, error, and meta per page */
  pages: Signal<InfinitePage<TData, TError, TPluginResult>[]>;

  /** Error from the last failed request */
  error: Signal<TError | undefined>;

  /** True during the initial load (no data yet) */
  loading: Signal<boolean>;

  /** True during any fetch operation */
  fetching: Signal<boolean>;

  /** True while fetching the next page */
  fetchingNext: Signal<boolean>;

  /** True while fetching the previous page */
  fetchingPrev: Signal<boolean>;

  /** Whether there's a next page available to fetch */
  canFetchNext: Signal<boolean>;

  /** Whether there's a previous page available to fetch */
  canFetchPrev: Signal<boolean>;

  /** Fetch the next page */
  fetchNext: () => Promise<void>;

  /** Fetch the previous page */
  fetchPrev: () => Promise<void>;

  /** Trigger refetch of all pages from the beginning, optionally with new request options */
  trigger: (options?: TTriggerOptions) => Promise<void>;

  /** Abort the current fetch operation */
  abort: () => void;
}

export type PagesApiClient<TSchema, TDefaultError> = ReadClient<
  TSchema,
  TDefaultError
>;
