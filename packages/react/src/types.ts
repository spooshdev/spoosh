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
  ResolveTypes,
  ResolverContext,
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

export type { ResolveSchemaTypes, ResolveTypes, ResolverContext };

export type BaseReadResult<TData, TError> = {
  loading: boolean;
  fetching: boolean;
  data: TData | undefined;
  error: TError | undefined;
  abort: () => void;
  refetch: () => Promise<EnlaceResponse<TData, TError>>;
};

export type BaseWriteResult<TData, TError, TOptions> = {
  trigger: (options?: TOptions) => Promise<EnlaceResponse<TData, TError>>;
  loading: boolean;
  data: TData | undefined;
  error: TError | undefined;
  reset: () => void;
  abort: () => void;
};

type OptionalQueryField<TQuery> = [TQuery] extends [never]
  ? object
  : { query: TQuery };

type OptionalBodyField<TBody> = [TBody] extends [never]
  ? object
  : { body: TBody };

type OptionalFormDataField<TFormData> = [TFormData] extends [never]
  ? object
  : { formData: TFormData };

type OptionalParamsField<TParamNames extends string> = [TParamNames] extends [
  never,
]
  ? object
  : { params: Record<TParamNames, string | number> };

type InputFields<
  TQuery,
  TBody,
  TFormData,
  TParamNames extends string,
> = OptionalQueryField<TQuery> &
  OptionalBodyField<TBody> &
  OptionalFormDataField<TFormData> &
  OptionalParamsField<TParamNames>;

export type WriteResponseInputFields<
  TQuery,
  TBody,
  TFormData,
  TParamNames extends string,
> = [TQuery, TBody, TFormData, TParamNames] extends [never, never, never, never]
  ? object
  : { input: InputFields<TQuery, TBody, TFormData, TParamNames> | undefined };

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

export type ExtractMethodOptions<T> = T extends (...args: infer A) => unknown
  ? A[0]
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

export type ExtractResponseFormData<T> =
  SuccessReturnType<T> extends {
    input: { formData: infer F };
  }
    ? F
    : never;

export type ExtractResponseParamNames<T> =
  SuccessReturnType<T> extends { input: { params: Record<infer K, unknown> } }
    ? K extends string
      ? K
      : never
    : never;

type QueryField<TQuery> = [TQuery] extends [never] ? object : { query: TQuery };

type BodyField<TBody> = [TBody] extends [never] ? object : { body: TBody };

type FormDataField<TFormData> = [TFormData] extends [never]
  ? object
  : { formData: TFormData };

type ParamsField<TParamNames extends string> = [TParamNames] extends [never]
  ? object
  : { params: Record<TParamNames, string | number> };

type ReadInputFields<
  TQuery,
  TBody,
  TFormData,
  TParamNames extends string,
> = QueryField<TQuery> &
  BodyField<TBody> &
  FormDataField<TFormData> &
  ParamsField<TParamNames>;

export type ResponseInputFields<
  TQuery,
  TBody,
  TFormData,
  TParamNames extends string,
> = [TQuery, TBody, TFormData, TParamNames] extends [never, never, never, never]
  ? object
  : { input: ReadInputFields<TQuery, TBody, TFormData, TParamNames> };

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
