import type {
  SpooshResponse,
  SpooshPlugin,
  PluginTypeConfig,
  MergePluginResults,
  WriteClient,
} from "@spoosh/core";

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

export type UseWriteResult<
  TData,
  TError,
  TOptions,
  TMeta,
  TPlugins extends readonly SpooshPlugin<PluginTypeConfig>[],
> = BaseWriteResult<TData, TError, TOptions, TMeta> &
  MergePluginResults<TPlugins>["write"];

export type WriteApiClient<TSchema, TDefaultError> = WriteClient<
  TSchema,
  TDefaultError
>;
