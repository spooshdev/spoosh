import type {
  CoreRequestOptionsBase,
  EnlaceCallbackPayload,
  EnlaceClient,
  EnlaceErrorCallbackPayload,
  EnlaceResponse,
  MethodOptionsMap,
  ResolvedCacheConfig,
  RetryConfig,
  WildcardClient,
} from "enlace-core";

// ============================================================================
// Request Options
// ============================================================================

/**
 * Query-only request options (GET requests).
 * Extends CoreRequestOptionsBase which provides conditional params support.
 */
export type QueryRequestOptions = CoreRequestOptionsBase & {
  /**
   * Cache tags for caching (GET requests only)
   * This will auto generate tags from the URL path if not provided and autoGenerateTags is enabled.
   * But can be manually specified to override auto-generation.
   */
  tags?: string[];

  /**
   * Additional cache tags to merge with auto-generated tags.
   * Use this when you want to extend (not replace) the auto-generated tags.
   * @example
   * api.posts.$get({ additionalTags: ['custom-tag'] })
   * // If autoGenerateTags produces ['posts'], final tags: ['posts', 'custom-tag']
   */
  additionalTags?: string[];
};

/**
 * Mutation-only request options (POST, PUT, PATCH, DELETE).
 * Extends CoreRequestOptionsBase which provides conditional params support.
 */
export type MutationRequestOptions = CoreRequestOptionsBase & {
  /** Tags to invalidate after mutation (triggers refetch in matching queries) */
  revalidateTags?: string[];

  /**
   * Additional revalidation tags to merge with auto-generated tags.
   * Use this when you want to extend (not replace) the auto-generated revalidation tags.
   * @example
   * api.posts.$post({ body: {...}, additionalRevalidateTags: ['other-tag'] })
   * // If autoRevalidateTags produces ['posts'], final tags: ['posts', 'other-tag']
   */
  additionalRevalidateTags?: string[];
};

/** Maps HTTP methods to their respective option types */
export type ReactOptionsMap = MethodOptionsMap<
  QueryRequestOptions,
  MutationRequestOptions
>;

/** @deprecated Use QueryRequestOptions or MutationRequestOptions instead */
export type ReactRequestOptionsBase = QueryRequestOptions &
  MutationRequestOptions;

/** Runtime request options that includes all possible properties */
export type AnyReactRequestOptions = ReactRequestOptionsBase & {
  params?: Record<string, string | number>;
  optimistic?: (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    cache: any,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    api: any
  ) => ResolvedCacheConfig | ResolvedCacheConfig[];
};

/** Polling interval value: milliseconds to wait, or false to stop polling */
export type PollingIntervalValue = number | false;

/** Function that determines polling interval based on current data/error state */
export type PollingIntervalFn<TData, TError> = (
  data: TData | undefined,
  error: TError | undefined
) => PollingIntervalValue;

/** Polling interval option: static value or dynamic function */
export type PollingInterval<TData = unknown, TError = unknown> =
  | PollingIntervalValue
  | PollingIntervalFn<TData, TError>;

/** Options for query mode hooks */
export type UseEnlaceQueryOptions<TData = unknown, TError = unknown> = {
  /**
   * Whether the query should execute.
   * Set to false to skip fetching (useful when ID is "new" or undefined).
   * @default true
   */
  enabled?: boolean;

  /**
   * Polling interval in milliseconds, or a function that returns the interval.
   * When set, the query will refetch after this interval AFTER the previous request completes.
   * Uses sequential polling (setTimeout after fetch completes), not interval-based.
   *
   * Can be:
   * - `number`: Fixed interval in milliseconds
   * - `false`: Disable polling
   * - `(data, error) => number | false`: Dynamic interval based on response
   *
   * @example
   * // Fixed interval
   * { pollingInterval: 5000 }
   *
   * // Conditional polling based on data
   * { pollingInterval: (order) => order?.status === 'pending' ? 2000 : false }
   *
   * @default undefined (no polling)
   */
  pollingInterval?: PollingInterval<TData, TError>;

  /**
   * Number of retry attempts for network errors. Set to 0 or false to disable.
   * @default 3
   */
  retry?: number | false;

  /**
   * Base delay in ms between retries. Uses exponential backoff.
   * @default 1000
   */
  retryDelay?: number;
};

// ============================================================================
// Internal Types
// ============================================================================

export type ApiClient<
  TSchema,
  TDefaultError = unknown,
  TOptionsMap = ReactOptionsMap,
> = unknown extends TSchema
  ? WildcardClient<TOptionsMap>
  : EnlaceClient<TSchema, TDefaultError, TOptionsMap>;

export type QueryFn<
  TSchema,
  TData,
  TError,
  TDefaultError = unknown,
  TOptionsMap = ReactOptionsMap,
> = (
  api: ApiClient<TSchema, TDefaultError, TOptionsMap>
) => Promise<EnlaceResponse<TData, TError>>;

export type SelectorFn<
  TSchema,
  TMethod,
  TDefaultError = unknown,
  TOptionsMap = ReactOptionsMap,
> = (api: ApiClient<TSchema, TDefaultError, TOptionsMap>) => TMethod;

export type HookState = {
  loading: boolean;
  fetching: boolean;
  data: unknown;
  error: unknown;
};

export type TrackedCall = {
  path: string[];
  method: string;
  options: unknown;
};

export const HTTP_METHODS = [
  "$get",
  "$post",
  "$put",
  "$patch",
  "$delete",
] as const;

// ============================================================================
// Public Result Types
// ============================================================================

type ExtractData<T> = T extends (
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Required for conditional type inference
  ...args: any[]
) => Promise<EnlaceResponse<infer D, unknown>>
  ? D
  : never;

type ExtractError<T> = T extends (
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Required for conditional type inference
  ...args: any[]
) => Promise<EnlaceResponse<unknown, infer E>>
  ? E
  : never;

/** Discriminated union for hook response state - enables type narrowing via error check */
type HookResponseState<TData, TError> =
  | { data: TData; error?: undefined }
  | { data?: undefined; error: TError };

/** Result when hook is called with query function (auto-fetch mode) */
export type UseEnlaceQueryResult<TData, TError> = {
  loading: boolean;
  fetching: boolean;
  /** Abort the current in-flight request */
  abort: () => void;
  /** Whether the current data is from an optimistic update (not yet confirmed by server) */
  isOptimistic: boolean;
} & HookResponseState<TData, TError>;

/** Result when hook is called with method selector (trigger mode) */
export type UseEnlaceSelectorResult<TMethod> = {
  trigger: TMethod;
  loading: boolean;
  fetching: boolean;
  /** Abort the current in-flight request */
  abort: () => void;
} & HookResponseState<ExtractData<TMethod>, ExtractError<TMethod>>;

// ============================================================================
// Hook Factory Types
// ============================================================================

/** Options for enlaceHookReact factory */
export type EnlaceHookOptions = {
  /**
   * Auto-generate cache tags from URL path for GET requests.
   * e.g., `/posts/1` generates tags `['posts', 'posts/1']`
   * @default true
   */
  autoGenerateTags?: boolean;

  /** Auto-revalidate generated tags after successful mutations. @default true */
  autoRevalidateTags?: boolean;

  /** Time in ms before cached data is considered stale. @default 0 (always stale) */
  staleTime?: number;

  /** Callback called on successful API responses */
  onSuccess?: (payload: EnlaceCallbackPayload<unknown>) => void;

  /** Callback called on error responses (HTTP errors or network failures) */
  onError?: (payload: EnlaceErrorCallbackPayload<unknown>) => void;
} & RetryConfig;

/** Hook type returned by enlaceHookReact */
export type EnlaceHook<TSchema, TDefaultError = unknown> = {
  <
    TMethod extends (
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Required for method type inference
      ...args: any[]
    ) => Promise<EnlaceResponse<unknown, unknown>>,
  >(
    selector: SelectorFn<TSchema, TMethod, TDefaultError>
  ): UseEnlaceSelectorResult<TMethod>;

  <TData, TError>(
    queryFn: QueryFn<TSchema, TData, TError, TDefaultError>,
    options?: UseEnlaceQueryOptions<TData, TError>
  ): UseEnlaceQueryResult<TData, TError>;
};
