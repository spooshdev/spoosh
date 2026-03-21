import type {
  SpooshResponse,
  SpooshPlugin,
  PluginTypeConfig,
  MergePluginResults,
  ReadClient,
  ExtractTriggerQuery,
  ExtractTriggerBody,
  ExtractTriggerParams,
} from "@spoosh/core";

/**
 * Base options for `useRead` hook.
 */
export type BaseReadOptions = {
  /** Whether to fetch automatically on mount. Default: true */
  enabled?: boolean;

  /**
   * Custom tags for cache entry.
   * Can be a single tag string or an array of tags.
   * Default: auto-generated from path (e.g., "users/1")
   */
  tags?: string | string[];
};

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

type TriggerAwaitedReturn<T> = T extends (...args: never[]) => infer R
  ? Awaited<R>
  : never;

type ExtractInputFromResponse<T> = T extends { input: infer I } ? I : never;

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

export type UseReadResult<
  TData,
  TError,
  TMeta,
  TPlugins extends readonly SpooshPlugin<PluginTypeConfig>[],
> = BaseReadResult<TData, TError, TMeta> & MergePluginResults<TPlugins>["read"];

export type ReadApiClient<TSchema, TDefaultError> = ReadClient<
  TSchema,
  TDefaultError
>;
