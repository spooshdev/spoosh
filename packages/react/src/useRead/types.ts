import type {
  SpooshResponse,
  SpooshPlugin,
  PluginTypeConfig,
  MergePluginResults,
  ReadClient,
  TagMode,
} from "@spoosh/core";

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
