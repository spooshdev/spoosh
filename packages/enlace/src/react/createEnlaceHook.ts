import {
  createEnlace,
  type EnlaceCallbackPayload,
  type EnlaceErrorCallbackPayload,
  type EnlaceOptions,
  type EnlaceResponse,
} from "enlace-core";
import type {
  ApiClient,
  QueryFn,
  SelectorFn,
  UseEnlaceQueryOptions,
  UseEnlaceQueryResult,
  UseEnlaceSelectorResult,
} from "./types";
import { useQueryMode } from "./useQueryMode";
import { createTrackingProxy, type TrackingResult } from "./trackingProxy";
import { useSelectorMode } from "./useSelectorMode";

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

type EnlaceHook<TSchema> = {
  <
    TMethod extends (
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Required for method type inference
      ...args: any[]
    ) => Promise<EnlaceResponse<unknown, unknown>>,
  >(
    selector: SelectorFn<TSchema, TMethod>
  ): UseEnlaceSelectorResult<TMethod>;

  <TData, TError>(
    queryFn: QueryFn<TSchema, TData, TError>,
    options?: UseEnlaceQueryOptions
  ): UseEnlaceQueryResult<TData, TError>;
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
 */
export function createEnlaceHook<TSchema = unknown>(
  baseUrl: string,
  defaultOptions: EnlaceOptions = {},
  hookOptions: EnlaceHookOptions = {}
): EnlaceHook<TSchema> {
  const {
    autoGenerateTags = true,
    autoRevalidateTags = true,
    staleTime = 0,
    onSuccess,
    onError,
  } = hookOptions;
  const api = createEnlace<TSchema>(baseUrl, defaultOptions, { onSuccess, onError });

  function useEnlaceHook<
    TData,
    TError,
    TMethod extends (
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Required for method type inference
      ...args: any[]
    ) => Promise<EnlaceResponse<unknown, unknown>>,
  >(
    selectorOrQuery:
      | SelectorFn<TSchema, TMethod>
      | QueryFn<TSchema, TData, TError>,
    queryOptions?: UseEnlaceQueryOptions
  ): UseEnlaceSelectorResult<TMethod> | UseEnlaceQueryResult<TData, TError> {
    let trackingResult: TrackingResult = {
      trackedCall: null,
      selectorPath: null,
      selectorMethod: null,
    };
    const trackingProxy = createTrackingProxy<TSchema>((result) => {
      trackingResult = result;
    });

    const result = (selectorOrQuery as (api: ApiClient<TSchema>) => unknown)(
      trackingProxy as ApiClient<TSchema>
    );

    if (typeof result === "function") {
      const actualResult = (
        selectorOrQuery as (api: ApiClient<TSchema>) => unknown
      )(api as ApiClient<TSchema>);
      return useSelectorMode<TMethod>({
        method: actualResult as (
          ...args: unknown[]
        ) => Promise<EnlaceResponse<unknown, unknown>>,
        api,
        path: trackingResult.selectorPath ?? [],
        methodName: trackingResult.selectorMethod ?? "",
        autoRevalidateTags,
      });
    }

    return useQueryMode<TSchema, TData, TError>(
      api as ApiClient<TSchema>,
      trackingResult.trackedCall!,
      { autoGenerateTags, staleTime, enabled: queryOptions?.enabled ?? true }
    );
  }

  return useEnlaceHook as EnlaceHook<TSchema>;
}
