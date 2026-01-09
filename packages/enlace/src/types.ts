import type {
  EnlacePlugin,
  EnlaceResponse,
  EnlaceClient,
  QueryOnlyClient,
  CleanMutationOnlyClient,
  PollingInterval,
  DataAwareCallback,
  DataAwareTransform,
  OptimisticCallbackFn,
  InvalidateOption,
  EnlaceOptions,
  MergePluginResults,
  MethodOptionsMap,
  CoreRequestOptionsBase,
} from "enlace-core";

export const HTTP_METHODS = [
  "$get",
  "$post",
  "$put",
  "$patch",
  "$delete",
] as const;

export type TrackedCall = {
  path: string[];
  method: string;
  options: unknown;
};

type QueryRequestOptions = CoreRequestOptionsBase & {
  tags?: string[];
  additionalTags?: string[];
};

type MutationRequestOptions = CoreRequestOptionsBase;

export type ReactOptionsMap = MethodOptionsMap<
  QueryRequestOptions,
  MutationRequestOptions
>;

export type ApiClient<TSchema> = EnlaceClient<
  TSchema,
  unknown,
  ReactOptionsMap
>;

export type PluginHooksConfig<
  TPlugins extends readonly EnlacePlugin<
    object,
    object,
    object,
    object,
    object
  >[],
> = {
  baseUrl: string;
  defaultOptions?: EnlaceOptions;
  plugins: TPlugins;
};

export type BaseReadOptions = {
  enabled?: boolean;
};

export type ResolveDataTypes<TOptions, TData, TError> = {
  [K in keyof TOptions]: Extract<
    TOptions[K],
    (...args: never[]) => unknown
  > extends never
    ? TOptions[K]
    : TOptions[K] extends PollingInterval<unknown, unknown> | undefined
      ? PollingInterval<TData, TError> | undefined
      : TOptions[K] extends
            | DataAwareCallback<infer R, unknown, unknown>
            | undefined
        ? DataAwareCallback<R, TData, TError> | undefined
        : TOptions[K] extends DataAwareTransform<unknown, unknown> | undefined
          ? DataAwareTransform<TData, TError> | undefined
          : TOptions[K];
};

export type ResolveSchemaTypes<TOptions, TSchema> = {
  [K in keyof TOptions]: TOptions[K] extends
    | OptimisticCallbackFn<unknown>
    | undefined
    ? OptimisticCallbackFn<TSchema> | undefined
    : TOptions[K] extends InvalidateOption<unknown> | undefined
      ? InvalidateOption<TSchema> | undefined
      : TOptions[K];
};

export type BaseReadResult<TData, TError> = {
  loading: boolean;
  fetching: boolean;
  data: TData | undefined;
  error: TError | undefined;
  abort: () => void;
};

export type BaseWriteResult<TData, TError, TOptions> = {
  trigger: (options?: TOptions) => Promise<EnlaceResponse<TData, TError>>;
  loading: boolean;
  data: TData | undefined;
  error: TError | undefined;
  reset: () => void;
  abort: () => void;
};

export type UseReadResult<
  TData,
  TError,
  TPlugins extends readonly EnlacePlugin<
    object,
    object,
    object,
    object,
    object
  >[],
> = BaseReadResult<TData, TError> & MergePluginResults<TPlugins>["read"];

export type UseWriteResult<
  TData,
  TError,
  TOptions,
  TPlugins extends readonly EnlacePlugin<
    object,
    object,
    object,
    object,
    object
  >[],
> = BaseWriteResult<TData, TError, TOptions> &
  MergePluginResults<TPlugins>["write"];

export type ReadApiClient<TSchema, TDefaultError> = QueryOnlyClient<
  TSchema,
  TDefaultError,
  ReactOptionsMap
>;

export type WriteApiClient<TSchema, TDefaultError> = CleanMutationOnlyClient<
  TSchema,
  TDefaultError,
  ReactOptionsMap
>;

export type ExtractMethodData<T> = T extends (
  ...args: never[]
) => Promise<EnlaceResponse<infer D, unknown>>
  ? D
  : unknown;

export type ExtractMethodError<T> = T extends (
  ...args: never[]
) => Promise<EnlaceResponse<unknown, infer E>>
  ? E
  : unknown;

export type ExtractMethodOptions<T> = T extends (...args: infer A) => unknown
  ? A[0]
  : never;

export type AnyInfiniteRequestOptions = {
  query?: Record<string, unknown>;
  params?: Record<string, string | number>;
  body?: unknown;
};

export type InfiniteNextContext<TData, TRequest> = {
  response: TData | undefined;
  allResponses: TData[];
  request: TRequest;
};

export type InfinitePrevContext<TData, TRequest> = {
  response: TData | undefined;
  allResponses: TData[];
  request: TRequest;
};

export type BaseInfiniteReadOptions<
  TData,
  TItem,
  TRequest = AnyInfiniteRequestOptions,
> = {
  enabled?: boolean;
  canFetchNext: (ctx: InfiniteNextContext<TData, TRequest>) => boolean;
  nextPageRequest: (
    ctx: InfiniteNextContext<TData, TRequest>
  ) => Partial<TRequest>;
  merger: (allResponses: TData[]) => TItem[];
  canFetchPrev?: (ctx: InfinitePrevContext<TData, TRequest>) => boolean;
  prevPageRequest?: (
    ctx: InfinitePrevContext<TData, TRequest>
  ) => Partial<TRequest>;
};

export type BaseInfiniteReadResult<TData, TError, TItem> = {
  data: TItem[] | undefined;
  allResponses: TData[] | undefined;
  loading: boolean;
  fetching: boolean;
  fetchingNext: boolean;
  fetchingPrev: boolean;
  canFetchNext: boolean;
  canFetchPrev: boolean;
  fetchNext: () => Promise<void>;
  fetchPrev: () => Promise<void>;
  refetch: () => Promise<void>;
  abort: () => void;
  error: TError | undefined;
};

export type UseInfiniteReadResult<
  TData,
  TError,
  TItem,
  TPlugins extends readonly EnlacePlugin<
    object,
    object,
    object,
    object,
    object
  >[],
> = BaseInfiniteReadResult<TData, TError, TItem> &
  MergePluginResults<TPlugins>["read"];

export type InfiniteReadApiClient<TSchema, TDefaultError> = QueryOnlyClient<
  TSchema,
  TDefaultError,
  ReactOptionsMap
>;
