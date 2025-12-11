import type {
  EnlaceCallbackPayload,
  EnlaceClient,
  EnlaceErrorCallbackPayload,
  EnlaceResponse,
  WildcardClient,
} from "enlace-core";

// ============================================================================
// Request Options
// ============================================================================

/** Per-request options for React hooks */
export type ReactRequestOptionsBase = {
  /**
   * Cache tags for caching (GET requests only)
   * This will auto generate tags from the URL path if not provided and autoGenerateTags is enabled.
   * But can be manually specified to override auto-generation.
   * */
  tags?: string[];

  /** Tags to invalidate after mutation (triggers refetch in matching queries) */
  revalidateTags?: string[];

  /**
   * Path parameters for dynamic URL segments.
   * Used to replace :paramName placeholders in the URL path.
   * @example
   * // With path api.products[':id'].delete
   * trigger({ pathParams: { id: '123' } }) // → DELETE /products/123
   */
  pathParams?: Record<string, string | number>;
};

/** Options for query mode hooks */
export type UseEnlaceQueryOptions = {
  /**
   * Whether the query should execute.
   * Set to false to skip fetching (useful when ID is "new" or undefined).
   * @default true
   */
  enabled?: boolean;
};

// ============================================================================
// Internal Types
// ============================================================================

export type ApiClient<
  TSchema,
  TDefaultError = unknown,
  TOptions = ReactRequestOptionsBase,
> = unknown extends TSchema
  ? WildcardClient<TOptions>
  : EnlaceClient<TSchema, TDefaultError, TOptions>;

export type QueryFn<
  TSchema,
  TData,
  TError,
  TDefaultError = unknown,
  TOptions = ReactRequestOptionsBase,
> = (
  api: ApiClient<TSchema, TDefaultError, TOptions>
) => Promise<EnlaceResponse<TData, TError>>;

export type SelectorFn<
  TSchema,
  TMethod,
  TDefaultError = unknown,
  TOptions = ReactRequestOptionsBase
> = (
  api: ApiClient<TSchema, TDefaultError, TOptions>
) => TMethod;

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

export const HTTP_METHODS = ["get", "post", "put", "patch", "delete"] as const;

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
} & HookResponseState<TData, TError>;

/** Result when hook is called with method selector (trigger mode) */
export type UseEnlaceSelectorResult<TMethod> = {
  trigger: TMethod;
  loading: boolean;
  fetching: boolean;
} & HookResponseState<ExtractData<TMethod>, ExtractError<TMethod>>;

// ============================================================================
// Hook Factory Types
// ============================================================================

/** Options for createEnlaceHookReact factory */
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
};

/** Hook type returned by createEnlaceHookReact */
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
    options?: UseEnlaceQueryOptions
  ): UseEnlaceQueryResult<TData, TError>;
};
