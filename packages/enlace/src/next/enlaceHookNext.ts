"use client";

import type { EnlaceOptions, EnlaceResponse } from "enlace-core";
import { enlaceNext } from "./index";
import type {
  NextApiClient,
  NextEnlaceHooks,
  NextHookOptions,
  NextQueryFn,
  NextSelectorFn,
  NextInfiniteQueryFn,
} from "./types";
import type {
  UseEnlaceQueryOptions,
  UseEnlaceQueryResult,
  UseEnlaceSelectorResult,
  UseEnlaceInfiniteQueryOptions,
  UseEnlaceInfiniteQueryResult,
} from "../react/types";
import {
  useAPIQueryImpl,
  type QueryModeOptions,
} from "../react/hooks/useAPIQuery";
import { useAPIMutationImpl } from "../react/hooks/useAPIMutation";
import {
  useAPIInfiniteQueryImpl,
  type InfiniteQueryModeOptions,
} from "../react/hooks/useAPIInfiniteQuery";
import {
  createTrackingProxy,
  type TrackingResult,
} from "../react/trackingProxy";

/**
 * Creates React hooks for making API calls in Next.js Client Components.
 * Returns { useQuery, useMutation, useInfiniteQuery }.
 *
 * @example
 * const { useQuery, useMutation, useInfiniteQuery } = enlaceHookNext<ApiSchema>('https://api.com', {}, {
 *   serverRevalidator: (tags) => revalidateTagsAction(tags),
 * });
 *
 * // Query - auto-fetch GET requests
 * const { loading, data, error } = useQuery((api) => api.posts.$get());
 *
 * // Mutation - trigger-based mutations
 * const { trigger } = useMutation((api) => api.posts.$delete);
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
export function enlaceHookNext<TSchema = unknown, TDefaultError = unknown>(
  baseUrl: string,
  defaultOptions: EnlaceOptions = {},
  hookOptions: NextHookOptions = {}
): NextEnlaceHooks<TSchema, TDefaultError> {
  const {
    autoGenerateTags = true,
    autoRevalidateTags = true,
    staleTime = 0,
    retry,
    retryDelay,
    ...nextOptions
  } = hookOptions;

  const api = enlaceNext<TSchema, TDefaultError>(baseUrl, defaultOptions, {
    autoGenerateTags,
    autoRevalidateTags,
    ...nextOptions,
  });

  function useQuery<TData, TError>(
    queryFn: NextQueryFn<TSchema, TData, TError, TDefaultError>,
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

    (queryFn as (api: NextApiClient<TSchema, TDefaultError>) => unknown)(
      trackingProxy as NextApiClient<TSchema, TDefaultError>
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
      api as unknown as import("../react/types").ApiClient<
        TSchema,
        TDefaultError
      >,
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
    selectorFn: NextSelectorFn<TSchema, TMethod, TDefaultError>
  ): UseEnlaceSelectorResult<TMethod> {
    let trackingResult: TrackingResult = {
      trackedCall: null,
      selectorPath: null,
      selectorMethod: null,
    };

    const trackingProxy = createTrackingProxy<TSchema>((result) => {
      trackingResult = result;
    });

    (selectorFn as (api: NextApiClient<TSchema, TDefaultError>) => unknown)(
      trackingProxy as NextApiClient<TSchema, TDefaultError>
    );

    const actualMethod = (
      selectorFn as (api: NextApiClient<TSchema, TDefaultError>) => unknown
    )(api as NextApiClient<TSchema, TDefaultError>);

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
    queryFn: NextInfiniteQueryFn<TSchema, TDefaultError>,
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

    (queryFn as (api: NextApiClient<TSchema, TDefaultError>) => unknown)(
      trackingProxy as NextApiClient<TSchema, TDefaultError>
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
      api as unknown as import("../react/types").ApiClient<
        TSchema,
        TDefaultError
      >,
      trackingResult.trackedCall,
      options as unknown as InfiniteQueryModeOptions<TData, TItem>
    );
  }

  return {
    useQuery,
    useMutation,
    useInfiniteQuery,
  } as NextEnlaceHooks<TSchema, TDefaultError>;
}
