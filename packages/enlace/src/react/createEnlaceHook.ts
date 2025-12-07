import {
  createEnlace,
  type EnlaceOptions,
  type EnlaceResponse,
  type WildcardClient,
} from "enlace-core";
import type {
  ApiClient,
  QueryFn,
  SelectorFn,
  TrackedCall,
  UseEnlaceManualResult,
  UseEnlaceQueryResult,
  UseEnlaceSelectorResult,
  UseWildcardManualResult,
  WildcardQueryFn,
  WildcardSelectorFn,
} from "./types";
import { useManualMode } from "./useManualMode";
import { useQueryMode, createTrackingProxy } from "./useQueryMode";
import { useSelectorMode } from "./useSelectorMode";

type WildcardHook = {
  <TData = unknown, TError = unknown>(): UseWildcardManualResult<TData, TError>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Required for method type inference
  <TMethod extends (...args: any[]) => Promise<EnlaceResponse<unknown, unknown>>>(
    selector: WildcardSelectorFn<TMethod>
  ): UseEnlaceSelectorResult<TMethod>;
  <TData, TError>(queryFn: WildcardQueryFn<TData, TError>): UseEnlaceQueryResult<TData, TError>;
};

type TypedHook<TSchema> = {
  <TData = unknown, TError = unknown>(): UseEnlaceManualResult<TSchema, TData, TError>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Required for method type inference
  <TMethod extends (...args: any[]) => Promise<EnlaceResponse<unknown, unknown>>>(
    selector: SelectorFn<TSchema, TMethod>
  ): UseEnlaceSelectorResult<TMethod>;
  <TData, TError>(queryFn: QueryFn<TSchema, TData, TError>): UseEnlaceQueryResult<TData, TError>;
};

/**
 * Creates a React hook for making API calls.
 * Called at module level to create a reusable hook.
 *
 * @example
 * const useAPI = createEnlaceHook<ApiSchema>('https://api.com');
 *
 * // Query mode - auto-fetch (auto-tracks changes, no deps array needed)
 * const { loading, data, error } = useAPI((api) => api.posts.get({ query: { userId } }));
 *
 * // Selector mode - typed trigger for lazy calls
 * const { trigger, loading, data, error } = useAPI((api) => api.posts.delete);
 * onClick={() => trigger({ body: { id: 1 } })}
 *
 * // Manual mode - typed client with optional data/error types
 * const { client, loading, data, ok, error } = useAPI<Post[], ApiError>();
 */
export function createEnlaceHook(baseUrl: string, defaultOptions?: EnlaceOptions): WildcardHook;
export function createEnlaceHook<TSchema>(
  baseUrl: string,
  defaultOptions?: EnlaceOptions
): TypedHook<TSchema>;
export function createEnlaceHook<TSchema = unknown>(
  baseUrl: string,
  defaultOptions: EnlaceOptions = {}
): WildcardHook | TypedHook<TSchema> {
  const api = createEnlace<TSchema>(baseUrl, defaultOptions);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Required for method type inference
  function useEnlaceHook<TData, TError, TMethod extends (...args: any[]) => Promise<EnlaceResponse<unknown, unknown>>>(
    selectorOrQuery?:
      | SelectorFn<TSchema, TMethod>
      | QueryFn<TSchema, TData, TError>
      | WildcardSelectorFn<TMethod>
      | WildcardQueryFn<TData, TError>
  ):
    | UseEnlaceManualResult<TSchema, TData, TError>
    | UseWildcardManualResult<TData, TError>
    | UseEnlaceSelectorResult<TMethod>
    | UseEnlaceQueryResult<TData, TError> {
    // Manual mode - no selector provided
    if (!selectorOrQuery) {
      return useManualMode(api as ApiClient<TSchema>) as UseEnlaceManualResult<TSchema, TData, TError>;
    }

    // Use tracking proxy to capture path/method/options without executing
    let trackedCall: TrackedCall | null = null;
    const trackingProxy = createTrackingProxy<TSchema>((tracked) => {
      trackedCall = tracked;
    });

    // Execute selector/query with tracking proxy to determine mode
    const result = (selectorOrQuery as (api: WildcardClient<object>) => unknown)(
      trackingProxy as WildcardClient<object>
    );

    // Selector mode - result is a function (method was accessed but not called)
    if (typeof result === "function") {
      const actualResult = (selectorOrQuery as (api: WildcardClient<object>) => unknown)(
        api as WildcardClient<object>
      );
      return useSelectorMode<TMethod>(
        actualResult as (...args: unknown[]) => Promise<EnlaceResponse<unknown, unknown>>
      );
    }

    // Query mode - method was called, trackedCall has the info
    return useQueryMode<TSchema, TData, TError>(
      api as ApiClient<TSchema>,
      trackedCall!
    );
  }

  return useEnlaceHook as WildcardHook | TypedHook<TSchema>;
}
