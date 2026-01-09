import type {
  EnlacePlugin,
  EnlaceResponse,
  EnlaceClient,
  QueryOnlyClient,
  MutationOnlyClient,
  EnlaceOptions,
  MergePluginResults,
  MethodOptionsMap,
  CoreRequestOptionsBase,
  ResolveSchemaTypes,
  ResolveDataTypes,
  PluginTypeConfig,
} from "enlace";

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

type QueryRequestOptions = CoreRequestOptionsBase;

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
  TPlugins extends readonly EnlacePlugin<PluginTypeConfig>[],
> = {
  baseUrl: string;
  defaultOptions?: EnlaceOptions;
  plugins: TPlugins;
};

export type BaseReadOptions = {
  enabled?: boolean;
  tags?: string[];
  additionalTags?: string[];
};

export type { ResolveSchemaTypes, ResolveDataTypes };

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
  TPlugins extends readonly EnlacePlugin<PluginTypeConfig>[],
> = BaseReadResult<TData, TError> & MergePluginResults<TPlugins>["read"];

export type UseWriteResult<
  TData,
  TError,
  TOptions,
  TPlugins extends readonly EnlacePlugin<PluginTypeConfig>[],
> = BaseWriteResult<TData, TError, TOptions> &
  MergePluginResults<TPlugins>["write"];

export type ReadApiClient<TSchema, TDefaultError> = QueryOnlyClient<
  TSchema,
  TDefaultError,
  ReactOptionsMap
>;

export type WriteApiClient<TSchema, TDefaultError> = MutationOnlyClient<
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
  tags?: string[];
  additionalTags?: string[];
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
  TPlugins extends readonly EnlacePlugin<PluginTypeConfig>[],
> = BaseInfiniteReadResult<TData, TError, TItem> &
  MergePluginResults<TPlugins>["read"];

export type InfiniteReadApiClient<TSchema, TDefaultError> = QueryOnlyClient<
  TSchema,
  TDefaultError,
  ReactOptionsMap
>;
