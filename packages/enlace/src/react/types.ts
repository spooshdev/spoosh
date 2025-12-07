import type { EnlaceClient, EnlaceResponse, WildcardClient } from "enlace-core";

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
};

// ============================================================================
// Internal Types
// ============================================================================

export type ApiClient<
  TSchema,
  TOptions = ReactRequestOptionsBase,
> = unknown extends TSchema
  ? WildcardClient<TOptions>
  : EnlaceClient<TSchema, TOptions>;

export type QueryFn<
  TSchema,
  TData,
  TError,
  TOptions = ReactRequestOptionsBase,
> = (
  api: ApiClient<TSchema, TOptions>
) => Promise<EnlaceResponse<TData, TError>>;

export type SelectorFn<TSchema, TMethod, TOptions = ReactRequestOptionsBase> = (
  api: ApiClient<TSchema, TOptions>
) => TMethod;

export type HookState = {
  loading: boolean;
  fetching: boolean;
  ok: boolean | undefined;
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

/** Discriminated union for hook response state - enables type narrowing on ok check */
type HookResponseState<TData, TError> =
  | { ok: undefined; data: undefined; error: undefined }
  | { ok: true; data: TData; error: undefined }
  | { ok: false; data: undefined; error: TError };

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
