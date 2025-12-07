import {
  createEnlace,
  type EnlaceOptions,
  type EnlaceResponse,
  type WildcardClient,
} from "enlace-core";
import type {
  ApiClient,
  QueryFn,
  ReactRequestOptionsBase,
  SelectorFn,
  UseEnlaceManualResult,
  UseEnlaceQueryResult,
  UseEnlaceSelectorResult,
  UseWildcardManualResult,
  WildcardQueryFn,
  WildcardSelectorFn,
} from "./types";
import { useManualMode } from "./useManualMode";
import { useQueryMode, createTrackingProxy, type TrackingResult } from "./useQueryMode";
import { useSelectorMode } from "./useSelectorMode";

export type EnlaceHookOptions = {
  /** Auto-generate cache tags from URL path for queries. @default true */
  autoGenerateTags?: boolean;

  /** Auto-revalidate generated tags after successful mutations. @default true */
  autoRevalidateTags?: boolean;
};

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
export function createEnlaceHook(
  baseUrl: string,
  defaultOptions?: EnlaceOptions,
  hookOptions?: EnlaceHookOptions
): WildcardHook;
export function createEnlaceHook<TSchema>(
  baseUrl: string,
  defaultOptions?: EnlaceOptions,
  hookOptions?: EnlaceHookOptions
): TypedHook<TSchema>;
export function createEnlaceHook<TSchema = unknown>(
  baseUrl: string,
  defaultOptions: EnlaceOptions = {},
  hookOptions: EnlaceHookOptions = {}
): WildcardHook | TypedHook<TSchema> {
  const api = createEnlace<TSchema>(baseUrl, defaultOptions);
  const { autoGenerateTags = true, autoRevalidateTags = true } = hookOptions;

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
    let trackingResult: TrackingResult = {
      trackedCall: null,
      selectorPath: null,
      selectorMethod: null,
    };
    const trackingProxy = createTrackingProxy<TSchema>((result) => {
      trackingResult = result;
    });

    // Execute selector/query with tracking proxy to determine mode
    const result = (selectorOrQuery as (api: WildcardClient<ReactRequestOptionsBase>) => unknown)(
      trackingProxy as WildcardClient<ReactRequestOptionsBase>
    );

    // Selector mode - result is a function (method was accessed but not called)
    if (typeof result === "function") {
      const actualResult = (selectorOrQuery as (api: WildcardClient<ReactRequestOptionsBase>) => unknown)(
        api as WildcardClient<ReactRequestOptionsBase>
      );
      return useSelectorMode<TMethod>(
        actualResult as (...args: unknown[]) => Promise<EnlaceResponse<unknown, unknown>>,
        trackingResult.selectorPath ?? [],
        autoRevalidateTags
      );
    }

    // Query mode - method was called, trackedCall has the info
    return useQueryMode<TSchema, TData, TError>(
      api as ApiClient<TSchema>,
      trackingResult.trackedCall!,
      autoGenerateTags
    );
  }

  return useEnlaceHook as WildcardHook | TypedHook<TSchema>;
}
