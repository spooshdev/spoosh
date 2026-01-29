import type { Signal } from "@angular/core";
import type {
  SpooshResponse,
  PluginArray,
  StateManager,
  EventEmitter,
  PluginExecutor,
  ReadClient,
  WriteClient,
  MethodOptionsMap,
  CoreRequestOptionsBase,
  TagOptions,
} from "@spoosh/core";

export interface SpooshInstanceShape<
  TApi,
  TSchema,
  TDefaultError,
  TPlugins extends PluginArray,
> {
  api: TApi;
  stateManager: StateManager;
  eventEmitter: EventEmitter;
  pluginExecutor: PluginExecutor;
  _types: {
    schema: TSchema;
    defaultError: TDefaultError;
    plugins: TPlugins;
  };
}

export type EnabledOption = boolean | (() => boolean);

export interface BaseReadOptions extends TagOptions {
  enabled?: EnabledOption;
}

export interface BaseReadResult<
  TData,
  TError,
  TPluginResult = Record<string, unknown>,
  TTriggerOptions = { force?: boolean },
> {
  data: Signal<TData | undefined>;
  error: Signal<TError | undefined>;
  loading: Signal<boolean>;
  fetching: Signal<boolean>;
  meta: Signal<TPluginResult>;
  abort: () => void;

  /**
   * Manually trigger a fetch.
   *
   * @param options - Optional override options (query, body, params) to use for this specific request
   */
  trigger: (
    options?: TTriggerOptions
  ) => Promise<SpooshResponse<TData, TError>>;
}

export interface BaseWriteResult<
  TData,
  TError,
  TOptions,
  TPluginResult = Record<string, unknown>,
> {
  trigger: (options?: TOptions) => Promise<SpooshResponse<TData, TError>>;
  data: Signal<TData | undefined>;
  error: Signal<TError | undefined>;
  loading: Signal<boolean>;
  meta: Signal<TPluginResult>;
  abort: () => void;
}

export type PageContext<TData, TRequest> = {
  response: TData | undefined;
  allResponses: TData[];
  request: TRequest;
};

export interface BaseInfiniteReadOptions<
  TData,
  TItem,
  TRequest,
> extends TagOptions {
  enabled?: EnabledOption;

  canFetchNext: (ctx: PageContext<TData, TRequest>) => boolean;
  canFetchPrev?: (ctx: PageContext<TData, TRequest>) => boolean;
  nextPageRequest: (ctx: PageContext<TData, TRequest>) => Partial<TRequest>;
  prevPageRequest?: (ctx: PageContext<TData, TRequest>) => Partial<TRequest>;
  merger: (responses: TData[]) => TItem[];
}

export interface BaseInfiniteReadResult<
  TData,
  TError,
  TItem,
  TPluginResult = Record<string, unknown>,
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
  trigger: () => Promise<void>;
  abort: () => void;
}

type QueryRequestOptions = CoreRequestOptionsBase;

type MutationRequestOptions = CoreRequestOptionsBase;

export type AngularOptionsMap = MethodOptionsMap<
  QueryRequestOptions,
  MutationRequestOptions
>;

export type ReadApiClient<TSchema, TDefaultError> = ReadClient<
  TSchema,
  TDefaultError
>;

export type WriteApiClient<TSchema, TDefaultError> = WriteClient<
  TSchema,
  TDefaultError
>;

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
  : {
      input: Signal<InputFields<TQuery, TBody, TParamNames> | undefined>;
    };

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

export type ExtractMethodOptions<T> = T extends (
  options?: infer O
) => Promise<unknown>
  ? O
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

type AwaitedReturnTypeTrigger<T> = T extends (...args: never[]) => infer R
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
  ExtractInputFromResponse<AwaitedReturnTypeTrigger<T>> extends infer I
    ? [I] extends [never]
      ? { force?: boolean }
      : ExtractTriggerQuery<I> &
          ExtractTriggerBody<I> &
          ExtractTriggerParams<I> & {
            /** Force refetch even if data is cached */
            force?: boolean;
          }
    : { force?: boolean };

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
