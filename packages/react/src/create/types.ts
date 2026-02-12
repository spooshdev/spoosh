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
  ResolveTypes,
  ResolveResultTypes,
} from "@spoosh/core";
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
} from "../useRead/types";
import type {
  BaseWriteResult,
  WriteResponseInputFields,
  WriteApiClient,
  WriteTriggerInput,
} from "../useWrite/types";
import type {
  BaseInfiniteReadOptions,
  BaseInfiniteReadResult,
  AnyInfiniteRequestOptions,
  InfiniteReadApiClient,
} from "../useInfiniteRead/types";

type InferError<T, TDefaultError> = [T] extends [unknown] ? TDefaultError : T;

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

type UseReadFn<TDefaultError, TSchema, TPlugins extends PluginArray> = {
  <
    TReadFn extends (
      api: ReadApiClient<TSchema, TDefaultError>
    ) => Promise<SpooshResponse<unknown, unknown>>,
    TReadOpts,
  >(
    readFn: TReadFn,
    readOptions: TReadOpts &
      BaseReadOptions &
      ResolveTypes<
        MergePluginOptions<TPlugins>["read"],
        ResolverContext<
          TSchema,
          ExtractMethodData<TReadFn>,
          InferError<ExtractMethodError<TReadFn>, TDefaultError>,
          ExtractResponseQuery<TReadFn>,
          ExtractResponseBody<TReadFn>,
          ExtractResponseParamNames<TReadFn> extends never
            ? never
            : Record<ExtractResponseParamNames<TReadFn>, string | number>
        >
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

type UseWriteFn<TDefaultError, TSchema, TPlugins extends PluginArray> = {
  <
    TWriteFn extends (
      api: WriteApiClient<TSchema, TDefaultError>
    ) => Promise<SpooshResponse<unknown, unknown>>,
    TWriteOpts extends ResolvedWriteOptions<
      TSchema,
      TPlugins,
      TWriteFn,
      TDefaultError
    > = ResolvedWriteOptions<TSchema, TPlugins, TWriteFn, TDefaultError>,
  >(
    writeFn: TWriteFn,
    writeOptions?: TWriteOpts
  ): BaseWriteResult<
    ExtractMethodData<TWriteFn>,
    InferError<ExtractMethodError<TWriteFn>, TDefaultError>,
    WriteTriggerInput<TWriteFn> &
      ResolvedWriteTriggerOptions<TSchema, TPlugins, TWriteFn, TDefaultError>,
    ResolveResultTypes<MergePluginResults<TPlugins>["write"], TWriteOpts>
  > &
    WriteResponseInputFields<
      ExtractMethodQuery<TWriteFn>,
      ExtractMethodBody<TWriteFn>,
      ExtractResponseParamNames<TWriteFn>
    >;
};

type InfiniteReadResolverContext<TSchema, TData, TError, TRequest> =
  ResolverContext<
    TSchema,
    TData,
    TError,
    TRequest extends { query: infer Q } ? Q : never,
    TRequest extends { body: infer B } ? B : never,
    TRequest extends { params: infer P } ? P : never
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
   * @param readFn - Function that selects the API endpoint to call (e.g., `(api) => api("posts").GET()`)
   * @param readOptions - Optional configuration including `enabled`, `tags`, and plugin-specific options
   * @returns Object containing `data`, `error`, `loading`, `fetching`, `trigger`, and `abort`
   *
   * @example
   * ```tsx
   * const { data, loading, error } = useRead((api) => api("posts").GET());
   *
   * const { data: post } = useRead(
   *   (api) => api("posts/:id").GET({ params: { id: postId } }),
   *   { enabled: !!postId }
   * );
   * ```
   */
  useRead: UseReadFn<TDefaultError, TSchema, TPlugins>;

  /**
   * React hook for mutations (POST, PUT, PATCH, DELETE) with manual triggering.
   *
   * @param writeFn - Function that selects the API endpoint (e.g., `(api) => api("posts").POST`)
   * @returns Object containing `trigger`, `data`, `error`, `loading`, and `abort`
   *
   * @example
   * ```tsx
   * const { trigger, loading, data } = useWrite((api) => api("posts").POST);
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
   *   (api) => api("posts").GET(),
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
  /** The API instance */
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
