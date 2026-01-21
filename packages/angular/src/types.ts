import type { Signal } from "@angular/core";
import type {
  SpooshResponse,
  PluginArray,
  StateManager,
  EventEmitter,
  PluginExecutor,
  QueryOnlyClient,
  MutationOnlyClient,
  MethodOptionsMap,
  CoreRequestOptionsBase,
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

export interface BaseReadOptions {
  enabled?: EnabledOption;
  tags?: string[];
  additionalTags?: string[];
}

export interface BaseReadResult<
  TData,
  TError,
  TPluginResult = Record<string, unknown>,
> {
  data: Signal<TData | undefined>;
  error: Signal<TError | undefined>;
  loading: Signal<boolean>;
  fetching: Signal<boolean>;
  meta: Signal<TPluginResult>;
  abort: () => void;
  refetch: () => Promise<SpooshResponse<TData, TError>>;
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
  reset: () => void;
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
> extends BaseReadOptions {
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
  refetch: () => Promise<void>;
  abort: () => void;
}

type QueryRequestOptions = CoreRequestOptionsBase;

type MutationRequestOptions = CoreRequestOptionsBase;

export type AngularOptionsMap = MethodOptionsMap<
  QueryRequestOptions,
  MutationRequestOptions
>;

export type ReadApiClient<TSchema, TDefaultError> = QueryOnlyClient<
  TSchema,
  TDefaultError,
  AngularOptionsMap
>;

export type WriteApiClient<TSchema, TDefaultError> = MutationOnlyClient<
  TSchema,
  TDefaultError,
  AngularOptionsMap
>;

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
  : {
      input: Signal<
        InputFields<TQuery, TBody, TFormData, TParamNames> | undefined
      >;
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

export type ExtractMethodFormData<T> =
  ExtractMethodOptions<T> extends {
    formData: infer F;
  }
    ? F
    : never;

export type ExtractMethodUrlEncoded<T> =
  ExtractMethodOptions<T> extends {
    urlEncoded: infer U;
  }
    ? U
    : never;
