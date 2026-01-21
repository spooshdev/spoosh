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
  ResolveResultTypes,
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
  ExtractMethodQuery,
  ExtractMethodBody,
  ExtractMethodFormData,
  ExtractMethodUrlEncoded,
  AnyInfiniteRequestOptions,
  ReadApiClient,
  WriteApiClient,
  InfiniteReadApiClient,
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

type WriteResolverContext<TSchema, TMethod, TDefaultError> = ResolverContext<
  TSchema,
  ExtractMethodData<TMethod>,
  InferError<ExtractMethodError<TMethod>, TDefaultError>,
  ExtractMethodQuery<TMethod>,
  ExtractMethodBody<TMethod>,
  ExtractResponseParamNames<TMethod> extends never
    ? never
    : Record<ExtractResponseParamNames<TMethod>, string | number>,
  ExtractMethodFormData<TMethod>,
  ExtractMethodUrlEncoded<TMethod>
>;

type ResolvedWriteOptions<
  TSchema,
  TPlugins extends PluginArray,
  TMethod,
  TDefaultError,
> = import("@spoosh/core").ResolveTypes<
  MergePluginOptions<TPlugins>["write"],
  WriteResolverContext<TSchema, TMethod, TDefaultError>
>;

type UseReadFn<TDefaultError, TSchema, TPlugins extends PluginArray> = <
  TReadFn extends (
    api: ReadApiClient<TSchema, TDefaultError>
  ) => Promise<{ data?: unknown; error?: unknown }>,
  TReadOpts extends BaseReadOptions &
    ResolvedReadOptions<TSchema, TPlugins, TReadFn, TDefaultError> =
    BaseReadOptions &
      ResolvedReadOptions<TSchema, TPlugins, TReadFn, TDefaultError>,
>(
  readFn: TReadFn,
  readOptions?: TReadOpts
) => BaseReadResult<
  ExtractMethodData<TReadFn>,
  InferError<ExtractMethodError<TReadFn>, TDefaultError>,
  ResolveResultTypes<MergePluginResults<TPlugins>["read"], TReadOpts>
> &
  ResponseInputFields<
    ExtractResponseQuery<TReadFn>,
    ExtractResponseBody<TReadFn>,
    ExtractResponseFormData<TReadFn>,
    ExtractResponseParamNames<TReadFn>
  >;

type UseWriteFn<TDefaultError, TSchema, TPlugins extends PluginArray> = <
  TMethod extends (
    ...args: never[]
  ) => Promise<SpooshResponse<unknown, unknown>>,
  TWriteOpts extends (TMethod extends (options: infer O) => unknown
    ? O
    : object) &
    ResolvedWriteOptions<TSchema, TPlugins, TMethod, TDefaultError> =
    (TMethod extends (options: infer O) => unknown ? O : object) &
      ResolvedWriteOptions<TSchema, TPlugins, TMethod, TDefaultError>,
>(
  writeFn: (api: WriteApiClient<TSchema, TDefaultError>) => TMethod
) => BaseWriteResult<
  ExtractMethodData<TMethod>,
  InferError<ExtractMethodError<TMethod>, TDefaultError>,
  TWriteOpts,
  ResolveResultTypes<MergePluginResults<TPlugins>["write"], TWriteOpts>
> &
  WriteResponseInputFields<
    ExtractResponseQuery<TMethod>,
    ExtractResponseBody<TMethod>,
    ExtractResponseFormData<TMethod>,
    ExtractResponseParamNames<TMethod>
  >;

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

type UseInfiniteReadFn<TDefaultError, TSchema, TPlugins extends PluginArray> = <
  TData,
  TItem,
  TError = TDefaultError,
  TRequest extends AnyInfiniteRequestOptions = AnyInfiniteRequestOptions,
>(
  readFn: (
    api: InfiniteReadApiClient<TSchema, TDefaultError>
  ) => Promise<SpooshResponse<TData, TError>>,
  readOptions: BaseInfiniteReadOptions<TData, TItem, TRequest> &
    ResolvedInfiniteReadOptions<TSchema, TPlugins, TData, TError, TRequest>
) => BaseInfiniteReadResult<
  TData,
  TError,
  TItem,
  MergePluginResults<TPlugins>["read"]
>;

/**
 * Spoosh React hooks interface containing useRead, useWrite, and useInfiniteRead.
 *
 * @template TDefaultError - The default error type
 * @template TSchema - The API schema type
 * @template TPlugins - The plugins array type
 */
export type SpooshReactHooks<
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
   *   (api) => api.posts(postId).$get(),
   *   { enabled: !!postId }
   * );
   * ```
   */
  useRead: UseReadFn<TDefaultError, TSchema, TPlugins>;

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
  useWrite: UseWriteFn<TDefaultError, TSchema, TPlugins>;

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
  useInfiniteRead: UseInfiniteReadFn<TDefaultError, TSchema, TPlugins>;
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
