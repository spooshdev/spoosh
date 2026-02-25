import type {
  PluginArray,
  MergePluginInstanceApi,
  MergePluginOptions,
  MergePluginResults,
  SpooshResponse,
  ResolverContext,
  ResolveTypes,
  ResolveResultTypes,
  InfiniteRequestOptions,
} from "@spoosh/core";
import type { SpooshInstanceShape } from "../types/shared";
import type {
  ExtractMethodData,
  ExtractMethodError,
  ExtractMethodQuery,
  ExtractMethodBody,
  ExtractResponseQuery,
  ExtractResponseBody,
  ExtractResponseParamNames,
} from "../types/extraction";
import type {
  BaseReadOptions,
  BaseReadResult,
  ResponseInputFields,
  ReadApiClient,
  TriggerOptions,
} from "../injectRead/types";
import type {
  BaseWriteResult,
  WriteResponseInputFields,
  WriteApiClient,
  WriteTriggerInput,
} from "../injectWrite/types";
import type {
  InjectQueueOptions,
  BaseQueueResult,
  QueueApiClient,
  QueueTriggerInput,
} from "../injectQueue/types";
import type {
  BasePagesOptions,
  BasePagesResult,
  PagesApiClient,
  PagesTriggerOptions,
} from "../injectPages/types";

type InferError<T, TDefaultError> = unknown extends T ? TDefaultError : T;

type StrictOptions<TOptions, TAllowed> = TOptions & {
  [K in keyof TOptions as K extends keyof TAllowed ? never : K]: never;
};

type ReadResolverContext<TSchema, TReadFn, TDefaultError> = ResolverContext<
  TSchema,
  ExtractMethodData<TReadFn>,
  InferError<ExtractMethodError<TReadFn>, TDefaultError>,
  ExtractResponseQuery<TReadFn>,
  ExtractResponseBody<TReadFn>,
  ExtractResponseParamNames<TReadFn> extends never
    ? never
    : Record<ExtractResponseParamNames<TReadFn>, string | number>
>;

type ResolvedReadOptions<
  TSchema,
  TPlugins extends PluginArray,
  TReadFn,
  TDefaultError,
> = BaseReadOptions &
  ResolveTypes<
    MergePluginOptions<TPlugins>["read"],
    ReadResolverContext<TSchema, TReadFn, TDefaultError>
  >;

type WriteResolverContext<TSchema, TMethod, TDefaultError> = ResolverContext<
  TSchema,
  ExtractMethodData<TMethod>,
  InferError<ExtractMethodError<TMethod>, TDefaultError>,
  ExtractMethodQuery<TMethod>,
  ExtractMethodBody<TMethod>,
  ExtractResponseParamNames<TMethod> extends never
    ? never
    : Record<ExtractResponseParamNames<TMethod>, string | number>
>;

type ResolvedWriteOptions<
  TSchema,
  TPlugins extends PluginArray,
  TMethod,
  TDefaultError,
> = ResolveTypes<
  MergePluginOptions<TPlugins>["write"],
  WriteResolverContext<TSchema, TMethod, TDefaultError>
>;

type ResolvedWriteTriggerOptions<
  TSchema,
  TPlugins extends PluginArray,
  TMethod,
  TDefaultError,
> = ResolveTypes<
  MergePluginOptions<TPlugins>["writeTrigger"],
  WriteResolverContext<TSchema, TMethod, TDefaultError>
>;

type QueueResolverContext<TSchema, TMethod, TDefaultError> = ResolverContext<
  TSchema,
  ExtractMethodData<TMethod>,
  InferError<ExtractMethodError<TMethod>, TDefaultError>,
  ExtractMethodQuery<TMethod>,
  ExtractMethodBody<TMethod>,
  ExtractResponseParamNames<TMethod> extends never
    ? never
    : Record<ExtractResponseParamNames<TMethod>, string | number>
>;

type ResolvedQueueOptions<
  TSchema,
  TPlugins extends PluginArray,
  TMethod,
  TDefaultError,
> = ResolveTypes<
  MergePluginOptions<TPlugins>["queue"],
  QueueResolverContext<TSchema, TMethod, TDefaultError>
>;

type ResolvedQueueTriggerOptions<
  TSchema,
  TPlugins extends PluginArray,
  TMethod,
  TDefaultError,
> = ResolveTypes<
  MergePluginOptions<TPlugins>["queueTrigger"],
  QueueResolverContext<TSchema, TMethod, TDefaultError>
>;

type PagesResolverContext<TSchema, TReadFn, TDefaultError> = ResolverContext<
  TSchema,
  ExtractMethodData<TReadFn>,
  InferError<ExtractMethodError<TReadFn>, TDefaultError>,
  ExtractResponseQuery<TReadFn>,
  ExtractResponseBody<TReadFn>,
  ExtractResponseParamNames<TReadFn> extends never
    ? never
    : Record<ExtractResponseParamNames<TReadFn>, string | number>
>;

type InjectReadFn<TDefaultError, TSchema, TPlugins extends PluginArray> = {
  <
    TReadFn extends (
      api: ReadApiClient<TSchema, TDefaultError>
    ) => Promise<SpooshResponse<unknown, unknown>>,
    TReadOpts extends ResolvedReadOptions<
      TSchema,
      TPlugins,
      TReadFn,
      TDefaultError
    >,
  >(
    readFn: TReadFn,
    readOptions: StrictOptions<
      TReadOpts,
      ResolvedReadOptions<TSchema, TPlugins, TReadFn, TDefaultError>
    >
  ): BaseReadResult<
    ExtractMethodData<TReadFn>,
    InferError<ExtractMethodError<TReadFn>, TDefaultError>,
    ResolveResultTypes<MergePluginResults<TPlugins>["read"], TReadOpts>,
    TriggerOptions<TReadFn>
  > &
    ResponseInputFields<
      ExtractResponseQuery<TReadFn>,
      ExtractResponseBody<TReadFn>,
      ExtractResponseParamNames<TReadFn>
    >;

  <
    TReadFn extends (
      api: ReadApiClient<TSchema, TDefaultError>
    ) => Promise<SpooshResponse<unknown, unknown>>,
  >(
    readFn: TReadFn
  ): BaseReadResult<
    ExtractMethodData<TReadFn>,
    InferError<ExtractMethodError<TReadFn>, TDefaultError>,
    MergePluginResults<TPlugins>["read"],
    TriggerOptions<TReadFn>
  > &
    ResponseInputFields<
      ExtractResponseQuery<TReadFn>,
      ExtractResponseBody<TReadFn>,
      ExtractResponseParamNames<TReadFn>
    >;
};

type InjectWriteFn<TDefaultError, TSchema, TPlugins extends PluginArray> = {
  <
    TWriteFn extends (
      api: WriteApiClient<TSchema, TDefaultError>
    ) => Promise<SpooshResponse<unknown, unknown>>,
    TWriteOpts extends ResolvedWriteOptions<
      TSchema,
      TPlugins,
      TWriteFn,
      TDefaultError
    >,
  >(
    writeFn: TWriteFn,
    writeOptions: StrictOptions<
      TWriteOpts,
      ResolvedWriteOptions<TSchema, TPlugins, TWriteFn, TDefaultError>
    >
  ): BaseWriteResult<
    ExtractMethodData<TWriteFn>,
    InferError<ExtractMethodError<TWriteFn>, TDefaultError>,
    WriteTriggerInput<TWriteFn> &
      ResolvedWriteTriggerOptions<TSchema, TPlugins, TWriteFn, TDefaultError>,
    ResolveResultTypes<MergePluginResults<TPlugins>["write"], TWriteOpts>
  > &
    WriteResponseInputFields<
      ExtractResponseQuery<TWriteFn>,
      ExtractResponseBody<TWriteFn>,
      ExtractResponseParamNames<TWriteFn>
    >;

  <
    TWriteFn extends (
      api: WriteApiClient<TSchema, TDefaultError>
    ) => Promise<SpooshResponse<unknown, unknown>>,
  >(
    writeFn: TWriteFn
  ): BaseWriteResult<
    ExtractMethodData<TWriteFn>,
    InferError<ExtractMethodError<TWriteFn>, TDefaultError>,
    WriteTriggerInput<TWriteFn> &
      ResolvedWriteTriggerOptions<TSchema, TPlugins, TWriteFn, TDefaultError>,
    MergePluginResults<TPlugins>["write"]
  > &
    WriteResponseInputFields<
      ExtractResponseQuery<TWriteFn>,
      ExtractResponseBody<TWriteFn>,
      ExtractResponseParamNames<TWriteFn>
    >;
};

type InjectQueueFn<TDefaultError, TSchema, TPlugins extends PluginArray> = {
  <
    TQueueFn extends (
      api: QueueApiClient<TSchema, TDefaultError>
    ) => Promise<SpooshResponse<unknown, unknown>>,
  >(
    queueFn: TQueueFn,
    queueOptions?: ResolvedQueueOptions<
      TSchema,
      TPlugins,
      TQueueFn,
      TDefaultError
    > &
      InjectQueueOptions
  ): BaseQueueResult<
    ExtractMethodData<TQueueFn>,
    InferError<ExtractMethodError<TQueueFn>, TDefaultError>,
    QueueTriggerInput<TQueueFn> &
      ResolvedQueueTriggerOptions<TSchema, TPlugins, TQueueFn, TDefaultError>,
    ResolveResultTypes<
      MergePluginResults<TPlugins>["queue"],
      ResolvedQueueOptions<TSchema, TPlugins, TQueueFn, TDefaultError> &
        InjectQueueOptions
    >
  >;
};

type InjectPagesFn<TDefaultError, TSchema, TPlugins extends PluginArray> = <
  TReadFn extends (
    api: PagesApiClient<TSchema, TDefaultError>
  ) => Promise<SpooshResponse<unknown, unknown>>,
  TRequest extends InfiniteRequestOptions = InfiniteRequestOptions,
  TItem = unknown,
>(
  readFn: TReadFn,
  readOptions: BasePagesOptions<
    ExtractMethodData<TReadFn>,
    TItem,
    InferError<ExtractMethodError<TReadFn>, TDefaultError>,
    TRequest,
    MergePluginResults<TPlugins>["read"]
  > &
    ResolveTypes<
      MergePluginOptions<TPlugins>["pages"],
      PagesResolverContext<TSchema, TReadFn, TDefaultError>
    >
) => BasePagesResult<
  ExtractMethodData<TReadFn>,
  InferError<ExtractMethodError<TReadFn>, TDefaultError>,
  TItem,
  MergePluginResults<TPlugins>["read"],
  PagesTriggerOptions<TReadFn>
>;

export type SpooshAngularFunctions<
  TDefaultError,
  TSchema,
  TPlugins extends PluginArray,
> = {
  injectRead: InjectReadFn<TDefaultError, TSchema, TPlugins>;
  injectWrite: InjectWriteFn<TDefaultError, TSchema, TPlugins>;
  injectPages: InjectPagesFn<TDefaultError, TSchema, TPlugins>;
  injectQueue: InjectQueueFn<TDefaultError, TSchema, TPlugins>;
} & MergePluginInstanceApi<TPlugins, TSchema>;

export type { SpooshInstanceShape, ExtractMethodData, ExtractMethodError };
