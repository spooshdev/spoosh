import type {
  PluginArray,
  StateManager,
  EventEmitter,
  PluginExecutor,
  SpooshResponse,
  MergePluginOptions,
  MergePluginResults,
  MergePluginInstanceApi,
  ResolverContext,
  ResolveSchemaTypes,
} from "@spoosh/core";
import type {
  BaseReadOptions,
  BaseReadResult,
  BaseWriteResult,
  BaseInfiniteReadOptions,
  BaseInfiniteReadResult,
  ExtractResponseQuery,
  ExtractResponseBody,
  ExtractResponseFormData,
  ExtractResponseParamNames,
  ResponseInputFields,
  WriteResponseInputFields,
  ExtractMethodData,
  ExtractMethodError,
  AnyInfiniteRequestOptions,
} from "../types";

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
> = import("@spoosh/core").ResolveTypes<
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
  ) => Promise<SpooshResponse<unknown, unknown>>,
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
> = import("@spoosh/core").ResolveTypes<
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
  readFn: (api: TApi) => Promise<SpooshResponse<TData, TError>>,
  readOptions: BaseInfiniteReadOptions<TData, TItem, TRequest> &
    ResolvedInfiniteReadOptions<TSchema, TPlugins, TData, TError, TRequest>
) => BaseInfiniteReadResult<TData, TError, TItem> &
  MergePluginResults<TPlugins>["read"];

/**
 * Spoosh React hooks interface containing useRead, useWrite, and useInfiniteRead.
 *
 * @template TApi - The API client type
 * @template TDefaultError - The default error type
 * @template TSchema - The API schema type
 * @template TPlugins - The plugins array type
 */
export type SpooshReactHooks<
  TApi,
  TDefaultError,
  TSchema,
  TPlugins extends PluginArray,
> = {
  /**
   * React hook for fetching data from an API endpoint with automatic caching and revalidation.
   *
   * @param readFn - Function that selects the API endpoint to call (e.g., `(api) => api.posts.$get()`)
   * @param readOptions - Optional configuration including `enabled`, `tags`, and plugin-specific options
   * @returns Object containing `data`, `error`, `loading`, `fetching`, `refetch`, and `abort`
   *
   * @example
   * ```tsx
   * const { data, loading, error } = useRead((api) => api.posts.$get());
   *
   * const { data: post } = useRead(
   *   (api) => api.posts[postId].$get(),
   *   { enabled: !!postId }
   * );
   * ```
   */
  useRead: UseReadFn<TApi, TDefaultError, TSchema, TPlugins>;

  /**
   * React hook for mutations (POST, PUT, PATCH, DELETE) with manual triggering.
   *
   * @param writeFn - Function that selects the API endpoint (e.g., `(api) => api.posts.$post`)
   * @returns Object containing `trigger`, `data`, `error`, `loading`, `reset`, and `abort`
   *
   * @example
   * ```tsx
   * const { trigger, loading, data } = useWrite((api) => api.posts.$post);
   *
   * const handleSubmit = async (formData) => {
   *   const { data, error } = await trigger({ body: formData });
   *   if (data) console.log('Created:', data);
   * };
   * ```
   */
  useWrite: UseWriteFn<TApi, TDefaultError, TSchema, TPlugins>;

  /**
   * React hook for infinite/paginated data fetching with automatic pagination control.
   *
   * @param readFn - Function that selects the API endpoint to call
   * @param readOptions - Configuration including `canFetchNext`, `nextPageRequest`, `merger`, and optional `canFetchPrev`/`prevPageRequest`
   * @returns Object containing `data`, `allResponses`, `fetchNext`, `fetchPrev`, `canFetchNext`, `canFetchPrev`, `loading`, `fetching`, and pagination states
   *
   * @example
   * ```tsx
   * const { data, fetchNext, canFetchNext, loading } = useInfiniteRead(
   *   (api) => api.posts.$get(),
   *   {
   *     canFetchNext: ({ response }) => !!response?.nextCursor,
   *     nextPageRequest: ({ response }) => ({ query: { cursor: response?.nextCursor } }),
   *     merger: (responses) => responses.flatMap(r => r.items)
   *   }
   * );
   * ```
   */
  useInfiniteRead: UseInfiniteReadFn<TApi, TDefaultError, TSchema, TPlugins>;
} & MergePluginInstanceApi<TPlugins, TSchema>;

/**
 * Shape of a Spoosh instance required for creating React hooks.
 */
export type SpooshInstanceShape<TApi, TSchema, TDefaultError, TPlugins> = {
  /** The API client instance */
  api: TApi;

  /** State manager for caching and state */
  stateManager: StateManager;

  /** Event emitter for refetch and invalidation events */
  eventEmitter: EventEmitter;

  /** Plugin executor for running plugins */
  pluginExecutor: PluginExecutor;

  /** Type information (not used at runtime) */
  _types: {
    schema: TSchema;
    defaultError: TDefaultError;
    plugins: TPlugins;
  };
};
