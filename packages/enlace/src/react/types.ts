import type { EnlaceClient, EnlaceResponse, WildcardClient } from "enlace-core";

// ============================================================================
// Request Options
// ============================================================================

/** Per-request options for React hooks */
export type ReactRequestOptionsBase = {
  /** Cache tags for this query (auto-generated from path if not provided) */
  tags?: string[];

  /** Tags to invalidate after mutation (triggers refetch in matching queries) */
  revalidateTags?: string[];
};

// ============================================================================
// Internal Types
// ============================================================================

export type ApiClient<TSchema> = unknown extends TSchema
  ? WildcardClient<ReactRequestOptionsBase>
  : EnlaceClient<TSchema, ReactRequestOptionsBase>;

export type QueryFn<TSchema, TData, TError> = (
  api: ApiClient<TSchema>
) => Promise<EnlaceResponse<TData, TError>>;

export type SelectorFn<TSchema, TMethod> = (api: ApiClient<TSchema>) => TMethod;

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

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Required for conditional type inference
type ExtractData<T> = T extends (...args: any[]) => Promise<EnlaceResponse<infer D, unknown>> ? D : never;

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Required for conditional type inference
type ExtractError<T> = T extends (...args: any[]) => Promise<EnlaceResponse<unknown, infer E>> ? E : never;

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
