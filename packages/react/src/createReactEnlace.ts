import type {
  PluginArray,
  StateManager,
  EventEmitter,
  PluginExecutor,
  EnlaceResponse,
  MergePluginOptions,
  MergePluginResults,
} from "enlace";
import { createUseRead } from "./useRead";
import { createUseWrite } from "./useWrite";
import { createUseInfiniteRead } from "./useInfiniteRead";
import type {
  BaseReadOptions,
  BaseReadResult,
  ResolveDataTypes,
  BaseWriteResult,
  ResolveSchemaTypes,
  BaseInfiniteReadOptions,
  BaseInfiniteReadResult,
  AnyInfiniteRequestOptions,
} from "./types";

type UseReadFn<TApi, TDefaultError, TPlugins extends PluginArray> = <
  TData,
  TError = TDefaultError,
>(
  readFn: (api: TApi) => Promise<EnlaceResponse<TData, TError>>,
  readOptions?: BaseReadOptions &
    ResolveDataTypes<MergePluginOptions<TPlugins>["read"], TData, TError>
) => BaseReadResult<TData, TError> & MergePluginResults<TPlugins>["read"];

type UseWriteFn<TApi, TDefaultError, TSchema, TPlugins extends PluginArray> = <
  TMethod extends (
    ...args: never[]
  ) => Promise<EnlaceResponse<unknown, unknown>>,
>(
  writeFn: (api: TApi) => TMethod
) => BaseWriteResult<
  TMethod extends (
    ...args: never[]
  ) => Promise<EnlaceResponse<infer D, unknown>>
    ? D
    : unknown,
  TMethod extends (
    ...args: never[]
  ) => Promise<EnlaceResponse<unknown, infer E>>
    ? E
    : TDefaultError,
  (TMethod extends (options: infer O) => unknown ? O : object) &
    ResolveSchemaTypes<MergePluginOptions<TPlugins>["write"], TSchema>
> &
  MergePluginResults<TPlugins>["write"];

type UseInfiniteReadFn<TApi, TDefaultError, TPlugins extends PluginArray> = <
  TData,
  TItem,
  TError = TDefaultError,
  TRequest extends AnyInfiniteRequestOptions = AnyInfiniteRequestOptions,
>(
  readFn: (api: TApi) => Promise<EnlaceResponse<TData, TError>>,
  readOptions: BaseInfiniteReadOptions<TData, TItem, TRequest> &
    ResolveDataTypes<
      MergePluginOptions<TPlugins>["infiniteRead"],
      TData,
      TError
    >
) => BaseInfiniteReadResult<TData, TError, TItem> &
  MergePluginResults<TPlugins>["read"];

export type EnlaceReactHooks<
  TApi,
  TDefaultError,
  TSchema,
  TPlugins extends PluginArray,
> = {
  useRead: UseReadFn<TApi, TDefaultError, TPlugins>;
  useWrite: UseWriteFn<TApi, TDefaultError, TSchema, TPlugins>;
  useInfiniteRead: UseInfiniteReadFn<TApi, TDefaultError, TPlugins>;
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
