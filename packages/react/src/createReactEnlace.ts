import type {
  PluginArray,
  StateManager,
  EventEmitter,
  PluginExecutor,
  EnlaceResponse,
  MergePluginOptions,
  MergePluginResults,
  ResolveTypes,
  ResolverContext,
  ResolveSchemaTypes,
} from "enlace";
import { createUseRead } from "./useRead";
import { createUseWrite } from "./useWrite";
import { createUseInfiniteRead } from "./useInfiniteRead";
import type {
  BaseReadOptions,
  BaseReadResult,
  BaseWriteResult,
  BaseInfiniteReadOptions,
  BaseInfiniteReadResult,
  AnyInfiniteRequestOptions,
  ExtractResponseQuery,
  ExtractResponseBody,
  ExtractResponseFormData,
  ExtractResponseParamNames,
  ResponseInputFields,
  WriteResponseInputFields,
  ExtractMethodData,
  ExtractMethodError,
} from "./types";

type InferError<T, TDefaultError> = [T] extends [unknown] ? TDefaultError : T;

type ExtractParamsRecord<T> =
  ExtractResponseParamNames<T> extends never
    ? never
    : Record<ExtractResponseParamNames<T>, string | number>;

type ReadResolverContext<TSchema, TReadFn, TDefaultError> = ResolverContext<
  TSchema,
  ExtractMethodData<TReadFn>,
  InferError<ExtractMethodError<TReadFn>, TDefaultError>,
  ExtractResponseQuery<TReadFn>,
  ExtractResponseBody<TReadFn>,
  ExtractParamsRecord<TReadFn>,
  ExtractResponseFormData<TReadFn>
>;

type ResolvedReadOptions<
  TSchema,
  TPlugins extends PluginArray,
  TReadFn,
  TDefaultError,
> = ResolveTypes<
  MergePluginOptions<TPlugins>["read"],
  ReadResolverContext<TSchema, TReadFn, TDefaultError>
>;

type UseReadFn<TApi, TDefaultError, TSchema, TPlugins extends PluginArray> = <
  TReadFn extends (api: TApi) => Promise<{ data?: unknown; error?: unknown }>,
>(
  readFn: TReadFn,
  readOptions?: BaseReadOptions &
    ResolvedReadOptions<TSchema, TPlugins, TReadFn, TDefaultError>
) => BaseReadResult<
  ExtractMethodData<TReadFn>,
  InferError<ExtractMethodError<TReadFn>, TDefaultError>
> &
  ResponseInputFields<
    ExtractResponseQuery<TReadFn>,
    ExtractResponseBody<TReadFn>,
    ExtractResponseFormData<TReadFn>,
    ExtractResponseParamNames<TReadFn>
  > &
  MergePluginResults<TPlugins>["read"];

type UseWriteFn<TApi, TDefaultError, TSchema, TPlugins extends PluginArray> = <
  TMethod extends (
    ...args: never[]
  ) => Promise<EnlaceResponse<unknown, unknown>>,
>(
  writeFn: (api: TApi) => TMethod
) => BaseWriteResult<
  ExtractMethodData<TMethod>,
  InferError<ExtractMethodError<TMethod>, TDefaultError>,
  (TMethod extends (options: infer O) => unknown ? O : object) &
    ResolveSchemaTypes<MergePluginOptions<TPlugins>["write"], TSchema>
> &
  WriteResponseInputFields<
    ExtractResponseQuery<TMethod>,
    ExtractResponseBody<TMethod>,
    ExtractResponseFormData<TMethod>,
    ExtractResponseParamNames<TMethod>
  > &
  MergePluginResults<TPlugins>["write"];

type InfiniteReadResolverContext<TSchema, TData, TError, TRequest> =
  ResolverContext<
    TSchema,
    TData,
    TError,
    TRequest extends { query: infer Q } ? Q : never,
    TRequest extends { body: infer B } ? B : never,
    TRequest extends { params: infer P } ? P : never,
    never
  >;

type ResolvedInfiniteReadOptions<
  TSchema,
  TPlugins extends PluginArray,
  TData,
  TError,
  TRequest,
> = ResolveTypes<
  MergePluginOptions<TPlugins>["infiniteRead"],
  InfiniteReadResolverContext<TSchema, TData, TError, TRequest>
>;

type UseInfiniteReadFn<
  TApi,
  TDefaultError,
  TSchema,
  TPlugins extends PluginArray,
> = <
  TData,
  TItem,
  TError = TDefaultError,
  TRequest extends AnyInfiniteRequestOptions = AnyInfiniteRequestOptions,
>(
  readFn: (api: TApi) => Promise<EnlaceResponse<TData, TError>>,
  readOptions: BaseInfiniteReadOptions<TData, TItem, TRequest> &
    ResolvedInfiniteReadOptions<TSchema, TPlugins, TData, TError, TRequest>
) => BaseInfiniteReadResult<TData, TError, TItem> &
  MergePluginResults<TPlugins>["read"];

export type EnlaceReactHooks<
  TApi,
  TDefaultError,
  TSchema,
  TPlugins extends PluginArray,
> = {
  useRead: UseReadFn<TApi, TDefaultError, TSchema, TPlugins>;
  useWrite: UseWriteFn<TApi, TDefaultError, TSchema, TPlugins>;
  useInfiniteRead: UseInfiniteReadFn<TApi, TDefaultError, TSchema, TPlugins>;
};

type EnlaceInstanceShape<TApi, TSchema, TDefaultError, TPlugins> = {
  api: TApi;
  stateManager: StateManager;
  eventEmitter: EventEmitter;
  pluginExecutor: PluginExecutor;
  _types: {
    schema: TSchema;
    defaultError: TDefaultError;
    plugins: TPlugins;
  };
};

export function createReactEnlace<
  TSchema,
  TDefaultError,
  TPlugins extends PluginArray,
  TApi,
>(
  instance: EnlaceInstanceShape<TApi, TSchema, TDefaultError, TPlugins>
): EnlaceReactHooks<TApi, TDefaultError, TSchema, TPlugins> {
  const { api, stateManager, eventEmitter, pluginExecutor } = instance;

  const useRead = createUseRead<TSchema, TDefaultError, TPlugins>({
    api,
    stateManager,
    eventEmitter,
    pluginExecutor,
  });

  const useWrite = createUseWrite<TSchema, TDefaultError, TPlugins>({
    api,
    stateManager,
    eventEmitter,
    pluginExecutor,
  });

  const useInfiniteRead = createUseInfiniteRead<
    TSchema,
    TDefaultError,
    TPlugins
  >({
    api,
    stateManager,
    eventEmitter,
    pluginExecutor,
  });

  return {
    useRead,
    useWrite,
    useInfiniteRead,
  } as EnlaceReactHooks<TApi, TDefaultError, TSchema, TPlugins>;
}
