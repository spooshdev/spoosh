import type { EnlaceClient, EnlaceResponse, WildcardClient } from "enlace-core";

// ============================================================================
// Internal Types
// ============================================================================

export type ApiClient<TSchema> = unknown extends TSchema
  ? WildcardClient<object>
  : EnlaceClient<TSchema, object>;

export type QueryFn<TSchema, TData, TError> = (
  api: ApiClient<TSchema>
) => Promise<EnlaceResponse<TData, TError>>;

export type SelectorFn<TSchema, TMethod> = (api: ApiClient<TSchema>) => TMethod;

export type WildcardQueryFn<TData, TError> = (
  api: WildcardClient<object>
) => Promise<EnlaceResponse<TData, TError>>;

export type WildcardSelectorFn<TMethod> = (api: WildcardClient<object>) => TMethod;

export type HookState = {
  loading: boolean;
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

/** Result when hook is called without selector (manual mode) */
export type UseEnlaceManualResult<TSchema, TData = unknown, TError = unknown> = {
  client: ApiClient<TSchema>;
  loading: boolean;
  ok: boolean | undefined;
  data: TData | undefined;
  error: TError | undefined;
};

/** Result when hook is called without selector (manual mode) - wildcard version */
export type UseWildcardManualResult<TData = unknown, TError = unknown> = {
  client: WildcardClient<object>;
  loading: boolean;
  ok: boolean | undefined;
  data: TData | undefined;
  error: TError | undefined;
};

/** Result when hook is called with query function (auto-fetch mode) */
export type UseEnlaceQueryResult<TData, TError> = {
  loading: boolean;
  ok: boolean | undefined;
  data: TData | undefined;
  error: TError | undefined;
};

/** Result when hook is called with method selector (trigger mode) */
export type UseEnlaceSelectorResult<TMethod> = {
  trigger: TMethod;
  loading: boolean;
  ok: boolean | undefined;
  data: ExtractData<TMethod> | undefined;
  error: ExtractError<TMethod> | undefined;
};
