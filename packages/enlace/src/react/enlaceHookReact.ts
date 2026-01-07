import { enlace, type EnlaceOptions, type EnlaceResponse } from "enlace-core";
import type {
  ApiClient,
  EnlaceHookOptions,
  EnlaceHooks,
  QueryFn,
  SelectorFn,
  UseEnlaceQueryOptions,
  UseEnlaceQueryResult,
  UseEnlaceSelectorResult,
  InfiniteQueryFn,
  UseEnlaceInfiniteQueryOptions,
  UseEnlaceInfiniteQueryResult,
} from "./types";
import { useAPIQueryImpl, type QueryModeOptions } from "./hooks/useAPIQuery";
import { useAPIMutationImpl } from "./hooks/useAPIMutation";
import {
  useAPIInfiniteQueryImpl,
  type InfiniteQueryModeOptions,
} from "./hooks/useAPIInfiniteQuery";
import { createTrackingProxy, type TrackingResult } from "./trackingProxy";

/**
 * Creates React hooks for making API calls.
 * Returns { useQuery, useMutation, useInfiniteQuery }.
 *
 * @example
 * const { useQuery, useMutation, useInfiniteQuery } = enlaceHookReact<ApiSchema>('https://api.com');
 *
 * // Query - auto-fetch GET requests
 * const { loading, data, error } = useQuery((api) => api.posts.$get({ query: { userId } }));
 *
 * // Mutation - trigger-based mutations
 * const { trigger, loading } = useMutation((api) => api.posts.$delete);
 * onClick={() => trigger({ body: { id: 1 } })}
 *
 * // Infinite Query - paginated data with fetchNext/fetchPrev
 * const { data, fetchNext, canFetchNext } = useInfiniteQuery(
 *   (api) => api.posts.$get({ query: { limit: 10 } }),
 *   {
 *     canFetchNext: ({ response }) => response?.hasMore ?? false,
 *     nextPageRequest: ({ response }) => ({ query: { cursor: response?.nextCursor } }),
 *     merger: (allResponses) => allResponses.flatMap(r => r.items),
 *   }
 * );
 */
export function enlaceHookReact<TSchema = unknown, TDefaultError = unknown>(
  baseUrl: string,
  defaultOptions: EnlaceOptions = {},
  hookOptions: EnlaceHookOptions = {}
): EnlaceHooks<TSchema, TDefaultError> {
  const {
    autoGenerateTags = true,
    autoRevalidateTags = true,
    staleTime = 0,
    onSuccess,
    onError,
    retry,
    retryDelay,
  } = hookOptions;

  const api = enlace<TSchema, TDefaultError>(baseUrl, defaultOptions, {
    onSuccess,
    onError,
  });

  function useQuery<TData, TError>(
    queryFn: QueryFn<TSchema, TData, TError, TDefaultError>,
    queryOptions?: UseEnlaceQueryOptions<TData, TError>
  ): UseEnlaceQueryResult<TData, TError> {
    let trackingResult: TrackingResult = {
      trackedCall: null,
      selectorPath: null,
      selectorMethod: null,
    };

    const trackingProxy = createTrackingProxy<TSchema>((result) => {
      trackingResult = result;
    });

    (queryFn as (api: ApiClient<TSchema, TDefaultError>) => unknown)(
      trackingProxy as ApiClient<TSchema, TDefaultError>
    );

    if (!trackingResult.trackedCall) {
      throw new Error(
        "useQuery requires calling an HTTP method ($get). " +
          "Example: useQuery((api) => api.posts.$get())"
      );
    }

    const options: QueryModeOptions<TData, TError> = {
      autoGenerateTags,
      staleTime,
      enabled: queryOptions?.enabled ?? true,
      pollingInterval: queryOptions?.pollingInterval,
      retry: queryOptions?.retry ?? retry,
      retryDelay: queryOptions?.retryDelay ?? retryDelay,
    };

    return useAPIQueryImpl<TSchema, TData, TError>(
      api as ApiClient<TSchema, TDefaultError>,
      trackingResult.trackedCall,
      options
    );
  }

  function useMutation<
    TMethod extends (
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ...args: any[]
    ) => Promise<EnlaceResponse<unknown, unknown>>,
  >(
    selectorFn: SelectorFn<TSchema, TMethod, TDefaultError>
  ): UseEnlaceSelectorResult<TMethod> {
    let trackingResult: TrackingResult = {
      trackedCall: null,
      selectorPath: null,
      selectorMethod: null,
    };

    const trackingProxy = createTrackingProxy<TSchema>((result) => {
      trackingResult = result;
    });

    (selectorFn as (api: ApiClient<TSchema, TDefaultError>) => unknown)(
      trackingProxy as ApiClient<TSchema, TDefaultError>
    );

    const actualMethod = (
      selectorFn as (api: ApiClient<TSchema, TDefaultError>) => unknown
    )(api as ApiClient<TSchema, TDefaultError>);

    return useAPIMutationImpl<TMethod>({
      method: actualMethod as (
        ...args: unknown[]
      ) => Promise<EnlaceResponse<unknown, unknown>>,
      api,
      path: trackingResult.selectorPath ?? [],
      methodName: trackingResult.selectorMethod ?? "",
      autoRevalidateTags,
      retry,
      retryDelay,
    });
  }

  function useInfiniteQuery<
    TData,
    TError,
    TItem = TData extends Array<infer U> ? U : TData,
    TRequest = unknown,
  >(
    queryFn: InfiniteQueryFn<TSchema, TDefaultError>,
    queryOptions: UseEnlaceInfiniteQueryOptions<TData, TItem, TRequest>
  ): UseEnlaceInfiniteQueryResult<TData, TError, TItem> {
    let trackingResult: TrackingResult = {
      trackedCall: null,
      selectorPath: null,
      selectorMethod: null,
    };

    const trackingProxy = createTrackingProxy<TSchema>((result) => {
      trackingResult = result;
    });

    (queryFn as (api: ApiClient<TSchema, TDefaultError>) => unknown)(
      trackingProxy as ApiClient<TSchema, TDefaultError>
    );

    if (!trackingResult.trackedCall) {
      throw new Error(
        "useInfiniteQuery requires calling an HTTP method ($get, $post, etc). " +
          "Example: useInfiniteQuery((api) => api.posts.$get({ query: { limit: 10 } }), options)"
      );
    }

    const options = {
      autoGenerateTags,
      staleTime,
      ...queryOptions,
      enabled: queryOptions.enabled ?? true,
      retry: queryOptions.retry ?? retry,
      retryDelay: queryOptions.retryDelay ?? retryDelay,
    };

    return useAPIInfiniteQueryImpl<TSchema, TData, TError, TItem>(
      api as ApiClient<TSchema, TDefaultError>,
      trackingResult.trackedCall,
      options as unknown as InfiniteQueryModeOptions<TData, TItem>
    );
  }

  return {
    useQuery,
    useMutation,
    useInfiniteQuery,
  } as EnlaceHooks<TSchema, TDefaultError>;
}
