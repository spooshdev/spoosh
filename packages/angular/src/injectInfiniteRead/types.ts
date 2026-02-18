import type { Signal } from "@angular/core";
import type {
  ReadClient,
  TagOptions,
  ExtractTriggerQuery,
  ExtractTriggerBody,
  ExtractTriggerParams,
} from "@spoosh/core";
import type { EnabledOption } from "../types/shared";

/**
 * Context passed to pagination callbacks (`canFetchNext`, `nextPageRequest`, etc.).
 *
 * For next-page callbacks: `response` and `request` refer to the **last** (most recent) page.
 * For prev-page callbacks: `response` and `request` refer to the **first** (earliest) page.
 */
export type PageContext<TData, TRequest> = {
  /**
   * The relevant page's response data.
   * - For `canFetchNext`/`nextPageRequest`: the last page's response
   * - For `canFetchPrev`/`prevPageRequest`: the first page's response
   */
  response: TData | undefined;

  /** All responses fetched so far, ordered from first to last page */
  allResponses: TData[];

  /**
   * The request options used to fetch the relevant page.
   * - For `canFetchNext`/`nextPageRequest`: the last page's request
   * - For `canFetchPrev`/`prevPageRequest`: the first page's request
   */
  request: TRequest;
};

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

export interface BaseInfiniteReadOptions<
  TData,
  TItem,
  TRequest,
> extends TagOptions {
  enabled?: EnabledOption;

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
  canFetchNext?: (ctx: PageContext<TData, TRequest>) => boolean;

  /**
   * Callback to determine if there's a previous page to fetch.
   * Receives the first page's response to check for pagination indicators.
   * Default: `() => false` (no previous page fetching)
   */
  canFetchPrev?: (ctx: PageContext<TData, TRequest>) => boolean;

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
  nextPageRequest?: (ctx: PageContext<TData, TRequest>) => Partial<TRequest>;

  /**
   * Callback to build the request options for the previous page.
   * Return only the fields that change - they will be **merged** with the initial request.
   */
  prevPageRequest?: (ctx: PageContext<TData, TRequest>) => Partial<TRequest>;

  /** Callback to merge all responses into a single array of items */
  merger: (responses: TData[]) => TItem[];
}

export interface BaseInfiniteReadResult<
  TData,
  TError,
  TItem,
  TPluginResult = Record<string, unknown>,
  TTriggerOptions = object,
> {
  data: Signal<TItem[] | undefined>;
  allResponses: Signal<TData[] | undefined>;
  error: Signal<TError | undefined>;
  loading: Signal<boolean>;
  fetching: Signal<boolean>;
  fetchingNext: Signal<boolean>;
  fetchingPrev: Signal<boolean>;
  canFetchNext: Signal<boolean>;
  canFetchPrev: Signal<boolean>;
  meta: Signal<TPluginResult>;
  fetchNext: () => Promise<void>;
  fetchPrev: () => Promise<void>;
  trigger: (options?: TTriggerOptions) => Promise<void>;
  abort: () => void;
}

export type InfiniteReadApiClient<TSchema, TDefaultError> = ReadClient<
  TSchema,
  TDefaultError
>;
