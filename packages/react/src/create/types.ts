import type {
  PluginArray,
  StateManager,
  EventEmitter,
  PluginExecutor,
  SpooshResponse,
  SpooshTransport,
  MergePluginOptions,
  MergePluginResults,
  MergePluginApi,
  ResolverContext,
  ResolveTypes,
  ResolveResultTypes,
  InfiniteRequestOptions,
} from "@spoosh/core";
import type {
  ExtractMethodData,
  ExtractMethodError,
  ExtractMethodQuery,
  ExtractMethodBody,
  ExtractResponseQuery,
  ExtractResponseBody,
  ExtractResponseParamNames,
  ExtractSubscriptionEvents,
  ExtractSubscriptionQuery,
  ExtractSubscriptionBody,
  ExtractAllSubscriptionEventKeys,
  ExtractAllSubscriptionEvents,
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
  UseQueueOptions,
  UseQueueResult,
  QueueApiClient,
  QueueTriggerInput,
} from "../useQueue/types";
import type {
  BasePagesOptions,
  BasePagesResult,
  PagesApiClient,
  PagesTriggerOptions,
} from "../usePages/types";
import type {
  BaseSubscriptionOptions,
  BaseSubscriptionResult,
  SubscriptionApiClient,
  SubscriptionTriggerInput,
} from "../useSubscription/types";
import type { TypedUseSSEOptions, UseSSEResult } from "../useSSE/types";

type InferError<T, TDefaultError> = unknown extends T ? TDefaultError : T;

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

type ResolvedReadOptions<
  TSchema,
  TPlugins extends PluginArray,
  TReadFn,
  TDefaultError,
> = BaseReadOptions &
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
  >;

type StrictOptions<TOptions, TAllowed> = TOptions & {
  [K in keyof TOptions as K extends keyof TAllowed ? never : K]: never;
};

type UseReadFn<TDefaultError, TSchema, TPlugins extends PluginArray> = {
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
      ExtractMethodQuery<TWriteFn>,
      ExtractMethodBody<TWriteFn>,
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
      ExtractMethodQuery<TWriteFn>,
      ExtractMethodBody<TWriteFn>,
      ExtractResponseParamNames<TWriteFn>
    >;
};

type UseQueueFn<TDefaultError, TSchema, TPlugins extends PluginArray> = {
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
      UseQueueOptions
  ): UseQueueResult<
    ExtractMethodData<TQueueFn>,
    InferError<ExtractMethodError<TQueueFn>, TDefaultError>,
    QueueTriggerInput<TQueueFn> &
      ResolvedQueueTriggerOptions<TSchema, TPlugins, TQueueFn, TDefaultError>,
    ResolveResultTypes<
      MergePluginResults<TPlugins>["queue"],
      ResolvedQueueOptions<TSchema, TPlugins, TQueueFn, TDefaultError> &
        UseQueueOptions
    >
  >;
};

type UsePagesFn<TDefaultError, TSchema, TPlugins extends PluginArray> = <
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
      ResolverContext<
        TSchema,
        ExtractMethodData<TReadFn>,
        InferError<ExtractMethodError<TReadFn>, TDefaultError>
      >
    >
) => BasePagesResult<
  ExtractMethodData<TReadFn>,
  InferError<ExtractMethodError<TReadFn>, TDefaultError>,
  TItem,
  MergePluginResults<TPlugins>["read"],
  PagesTriggerOptions<TReadFn>
>;

type UseSubscriptionFn<TDefaultError, TSchema, TPlugins extends PluginArray> = <
  TSubFn extends (
    api: SubscriptionApiClient<TSchema, TDefaultError>
  ) => unknown,
>(
  subFn: TSubFn,
  subOptions?: BaseSubscriptionOptions
) => BaseSubscriptionResult<
  ExtractSubscriptionEvents<TSubFn>,
  InferError<ExtractMethodError<TSubFn>, TDefaultError>,
  MergePluginResults<TPlugins>["subscribe"],
  SubscriptionTriggerInput<
    ExtractSubscriptionQuery<TSubFn>,
    ExtractSubscriptionBody<TSubFn>,
    never
  >
>;

type InferSSEEvents<T> =
  ExtractAllSubscriptionEvents<T> extends Record<string, unknown>
    ? ExtractAllSubscriptionEvents<T>
    : Record<string, unknown>;

type FilteredEvents<
  TAllEvents extends Record<string, unknown>,
  TSelectedEvents extends readonly string[],
> = TSelectedEvents[number] extends keyof TAllEvents
  ? Pick<TAllEvents, TSelectedEvents[number]>
  : TAllEvents;

// eslint-disable-next-line @typescript-eslint/no-unused-vars
type UseSSEFn<TDefaultError, TSchema, TPlugins extends PluginArray> = {
  // Overload 1: With events option - filtered return type
  <
    TSubFn extends (api: SubscriptionApiClient<TSchema, TDefaultError>) => {
      _subscription: true;
      events: Record<string, { data: unknown }>;
    },
    const TSelectedEvents extends readonly Extract<
      ExtractAllSubscriptionEventKeys<TSubFn>,
      string
    >[],
  >(
    subFn: TSubFn,
    sseOptions: TypedUseSSEOptions<
      Extract<ExtractAllSubscriptionEventKeys<TSubFn>, string>,
      InferSSEEvents<TSubFn>,
      TSelectedEvents
    > & { events: TSelectedEvents }
  ): UseSSEResult<
    FilteredEvents<InferSSEEvents<TSubFn>, TSelectedEvents>,
    InferError<ExtractMethodError<TSubFn>, TDefaultError>
  >;

  // Overload 2: Without events option - all events
  <
    TSubFn extends (api: SubscriptionApiClient<TSchema, TDefaultError>) => {
      _subscription: true;
      events: Record<string, { data: unknown }>;
    },
  >(
    subFn: TSubFn,
    sseOptions?: Omit<
      TypedUseSSEOptions<
        Extract<ExtractAllSubscriptionEventKeys<TSubFn>, string>,
        InferSSEEvents<TSubFn>
      >,
      "events"
    >
  ): UseSSEResult<
    InferSSEEvents<TSubFn>,
    InferError<ExtractMethodError<TSubFn>, TDefaultError>
  >;
};

/**
 * Base hooks that are always available.
 */
type BaseSpooshReactHooks<
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
   * @param writeFn - Function that selects the API endpoint (e.g., `(api) => api("posts").POST()`)
   * @returns Object containing `trigger`, `data`, `error`, `loading`, and `abort`
   *
   * @example
   * ```tsx
   * const { trigger, loading, data } = useWrite((api) => api("posts").POST());
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
   * @returns Object containing `data`, `pages`, `fetchNext`, `fetchPrev`, `canFetchNext`, `canFetchPrev`, `loading`, `fetching`, and pagination states
   *
   * @example
   * ```tsx
   * const { data, fetchNext, canFetchNext, loading } = usePages(
   *   (api) => api("posts").GET(),
   *   {
   *     canFetchNext: ({ lastPage }) => !!lastPage?.data?.nextCursor,
   *     nextPageRequest: ({ lastPage }) => ({ query: { cursor: lastPage?.data?.nextCursor } }),
   *     merger: (pages) => pages.flatMap(p => p.data?.items ?? [])
   *   }
   * );
   * ```
   */
  usePages: UsePagesFn<TDefaultError, TSchema, TPlugins>;

  /**
   * React hook for queued operations with concurrency control.
   *
   * @param queueFn - Function that selects the API endpoint
   * @param queueOptions - Optional configuration including `concurrency`
   * @returns Object containing `trigger`, `queue`, `progress`, `abort`, `retry`, `remove`, `clear`
   *
   * @example
   * ```tsx
   * const { trigger, queue, progress } = useQueue(
   *   (api) => api("uploads").POST(),
   *   { concurrency: 2 }
   * );
   *
   * for (const file of files) {
   *   trigger({ body: form({ file }) });
   * }
   * ```
   */
  useQueue: UseQueueFn<TDefaultError, TSchema, TPlugins>;

  /**
   * React hook for subscribing to real-time data streams (SSE, WebSocket, etc.).
   *
   * @param subFn - Function that selects the subscription endpoint
   * @param subOptions - Optional configuration including `enabled`, `tags`
   * @returns Object containing `data`, `error`, `loading`, `isSubscribed`, `emit`, `unsubscribe`
   *
   * @example
   * ```tsx
   * const { data } = useSubscription((api) =>
   *   api("notifications").GET({ events: ["alert", "message"] })
   * );
   * ```
   */
  useSubscription: UseSubscriptionFn<TDefaultError, TSchema, TPlugins>;
} & MergePluginApi<TPlugins, TSchema>;

/**
 * SSE hooks available when SSE transport is registered.
 */
type SSEHooks<TDefaultError, TSchema, TPlugins extends PluginArray> = {
  /**
   * React hook for SSE streams with per-hook parsing and accumulation.
   *
   * @param subFn - Function that selects the SSE endpoint
   * @param sseOptions - Configuration including `events`, `parse`, `accumulate`, `maxRetries`, `retryDelay`
   * @returns Object containing `data`, `error`, `loading`, `isConnected`, `trigger`, `disconnect`, `reset`
   *
   * @example
   * ```tsx
   * const { data, reset } = useSSE(
   *   (api) => api("chat").POST(),
   *   {
   *     events: ["chunk", "done"],
   *     parse: "json-done",
   *     accumulate: { chunk: "merge" },
   *     maxRetries: 5,
   *   }
   * );
   * ```
   */
  useSSE: UseSSEFn<TDefaultError, TSchema, TPlugins>;
};

/**
 * Spoosh React hooks interface containing useRead, useWrite, and usePages.
 * useSSE is only available when SSE transport is registered via withTransports([sse()]).
 *
 * @template TDefaultError - The default error type
 * @template TSchema - The API schema type
 * @template TPlugins - The plugins array type
 * @template TTransports - The registered transport names
 */
export type SpooshReactHooks<
  TDefaultError,
  TSchema,
  TPlugins extends PluginArray,
  TTransports extends string = never,
> = BaseSpooshReactHooks<TDefaultError, TSchema, TPlugins> &
  ([TTransports] extends [never]
    ? object
    : "sse" extends TTransports
      ? SSEHooks<TDefaultError, TSchema, TPlugins>
      : object);

/**
 * Shape of a Spoosh instance required for creating React hooks.
 */
export type SpooshInstanceShape<
  TApi,
  TSchema,
  TDefaultError,
  TPlugins,
  TTransports extends string = never,
> = {
  /** The API instance */
  api: TApi;

  /** State manager for caching and state */
  stateManager: StateManager;

  /** Event emitter for refetch and invalidation events */
  eventEmitter: EventEmitter;

  /** Plugin executor for running plugins */
  pluginExecutor: PluginExecutor;

  /** Registered transports for subscriptions */
  transports: Map<string, SpooshTransport>;

  /** Config with baseUrl and default options */
  config: {
    baseUrl: string;
    defaultOptions: {
      headers?: HeadersInit | (() => HeadersInit | Promise<HeadersInit>);
      [key: string]: unknown;
    };
  };

  /** Type information (not used at runtime) */
  _types: {
    schema: TSchema;
    defaultError: TDefaultError;
    plugins: TPlugins;
    transports: TTransports;
  };
};
