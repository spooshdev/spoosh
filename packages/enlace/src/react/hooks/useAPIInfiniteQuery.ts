import { useRef, useReducer, useEffect, useCallback } from "react";
import type { EnlaceResponse } from "enlace-core";
import type {
  ApiClient,
  TrackedCall,
  UseEnlaceInfiniteQueryResult,
  UseEnlaceInfiniteQueryOptions,
  InfiniteData,
  FetchDirection,
  AnyInfiniteRequestOptions,
} from "../types";
import type { AnyReactRequestOptions } from "../types";
import {
  infiniteHookReducer,
  initialInfiniteState,
  type InfiniteHookState,
} from "../reducer";
import { generateTags } from "../../utils/generateTags";
import { onRevalidate } from "../revalidator";
import {
  createInfiniteQueryKey,
  getCache,
  setCache,
  subscribeCache,
  addResponseToInfiniteCache,
} from "../cache";

function resolvePath(
  path: string[],
  params: Record<string, string | number> | undefined
): string[] {
  if (!params) return path;

  return path.map((segment) => {
    if (segment.startsWith(":")) {
      const paramName = segment.slice(1);
      const value = params[paramName];

      if (value === undefined) {
        throw new Error(`Missing path parameter: ${paramName}`);
      }

      return String(value);
    }

    return segment;
  });
}

function shallowMergeRequest(
  initial: AnyInfiniteRequestOptions,
  override: AnyInfiniteRequestOptions
): AnyInfiniteRequestOptions {
  return {
    query: override.query
      ? { ...initial.query, ...override.query }
      : initial.query,
    params: override.params
      ? { ...initial.params, ...override.params }
      : initial.params,
    body: override.body !== undefined ? override.body : initial.body,
  };
}

export type InfiniteQueryModeOptions<
  TData,
  TItem,
  TRequest = AnyInfiniteRequestOptions,
> = {
  autoGenerateTags: boolean;
  staleTime: number;
} & UseEnlaceInfiniteQueryOptions<TData, TItem, TRequest>;

export function useAPIInfiniteQueryImpl<TSchema, TData, TError, TItem>(
  api: ApiClient<TSchema>,
  trackedCall: TrackedCall,
  options: InfiniteQueryModeOptions<TData, TItem>
): UseEnlaceInfiniteQueryResult<TData, TError, TItem> {
  const {
    autoGenerateTags,
    canFetchNext,
    nextPageRequest,
    canFetchPrev,
    prevPageRequest,
    merger,
    enabled = true,
    retry,
    retryDelay,
  } = options;

  const requestOptions = trackedCall.options as
    | AnyReactRequestOptions
    | undefined;

  const initialRequest: AnyInfiniteRequestOptions = {
    query: (requestOptions as Record<string, unknown>)?.query as
      | Record<string, unknown>
      | undefined,
    params: requestOptions?.params,
    body: (requestOptions as Record<string, unknown>)?.body as unknown,
  };

  const baseOptionsForKey = {
    ...(trackedCall.options as object),
    query: undefined,
    params: undefined,
    body: undefined,
  };

  const queryKey = createInfiniteQueryKey(
    trackedCall.path,
    trackedCall.method,
    baseOptionsForKey
  );

  const resolvedPath = resolvePath(trackedCall.path, requestOptions?.params);
  const baseTags =
    requestOptions?.tags ??
    (autoGenerateTags ? generateTags(resolvedPath) : []);
  const queryTags = [...baseTags, ...(requestOptions?.additionalTags ?? [])];

  const getCacheState = (): Partial<InfiniteHookState<TData, TItem>> => {
    const cached = getCache<InfiniteData<TData>, TError>(queryKey);
    const infiniteData = cached?.data;

    if (!infiniteData || infiniteData.responses.length === 0) {
      return {
        data: undefined,
        allResponses: undefined,
        allRequests: undefined,
        canFetchNext: false,
        canFetchPrev: false,
        isOptimistic: false,
        error: cached?.error,
      };
    }

    const allResponses = infiniteData.responses.map((r) => r.data);
    const allRequests = infiniteData.responses.map((r) => r.request);

    const lastResponse = allResponses.at(-1);
    const firstResponse = allResponses.at(0);
    const lastRequest = allRequests.at(-1) ?? initialRequest;
    const firstRequest = allRequests.at(0) ?? initialRequest;

    const canNext = canFetchNext({
      response: lastResponse,
      allResponses,
      request: lastRequest,
    });

    const canPrev = canFetchPrev
      ? canFetchPrev({
          response: firstResponse,
          allResponses,
          request: firstRequest,
        })
      : false;

    const mergedData = merger(allResponses);

    return {
      data: mergedData,
      allResponses,
      allRequests,
      canFetchNext: canNext,
      canFetchPrev: canPrev,
      isOptimistic: cached?.isOptimistic ?? false,
      error: cached?.error,
    };
  };

  const [state, dispatch] = useReducer(
    infiniteHookReducer<TData, TItem>,
    null,
    () => ({
      ...(initialInfiniteState as InfiniteHookState<TData, TItem>),
      ...getCacheState(),
    })
  );

  const mountedRef = useRef(true);
  const abortControllerRef = useRef<AbortController | null>(null);
  const initialRequestRef = useRef(initialRequest);
  initialRequestRef.current = initialRequest;

  const abort = useCallback(() => {
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
  }, []);

  const doFetch = useCallback(
    async (
      direction: FetchDirection,
      requestOverride: AnyInfiniteRequestOptions
    ) => {
      const cached = getCache<InfiniteData<TData>, TError>(queryKey);

      if (cached?.promise) {
        return;
      }

      if (direction === "next") {
        dispatch({ type: "FETCH_NEXT_START" });
      } else {
        dispatch({ type: "FETCH_PREV_START" });
      }

      abortControllerRef.current = new AbortController();
      const signal = abortControllerRef.current.signal;

      const mergedRequest = shallowMergeRequest(
        initialRequestRef.current,
        requestOverride
      );
      const resolvedPathForFetch = resolvePath(
        trackedCall.path,
        mergedRequest.params
      );

      let current: unknown = api;
      for (const segment of resolvedPathForFetch) {
        current = (current as Record<string, unknown>)[segment];
      }

      const method = (current as Record<string, unknown>)[
        trackedCall.method
      ] as (opts?: unknown) => Promise<EnlaceResponse<TData, TError>>;

      const fetchOptions = {
        retry,
        retryDelay,
        ...(trackedCall.options as object),
        query: mergedRequest.query,
        params: mergedRequest.params,
        body: mergedRequest.body,
        signal,
      };

      const fetchPromise = method(fetchOptions)
        .then((res) => {
          if (res.aborted || !mountedRef.current) return;

          if (res.error) {
            setCache<InfiniteData<TData>, TError>(queryKey, {
              error: res.error,
              timestamp: Date.now(),
              tags: queryTags,
            });
          } else if (res.data !== undefined) {
            addResponseToInfiniteCache<TData>(
              queryKey,
              res.data,
              mergedRequest,
              direction
            );

            setCache<InfiniteData<TData>, TError>(queryKey, {
              error: undefined,
              tags: queryTags,
            });
          }
        })
        .catch((err: TError) => {
          if (!mountedRef.current) return;

          setCache<InfiniteData<TData>, TError>(queryKey, {
            error: err,
            timestamp: Date.now(),
            tags: queryTags,
          });
        });

      setCache<InfiniteData<TData>, TError>(queryKey, {
        promise: fetchPromise,
        tags: queryTags,
      });

      await fetchPromise;
    },
    [queryKey, api, trackedCall, queryTags, retry, retryDelay]
  );

  const fetchNext = useCallback(async () => {
    const cached = getCache<InfiniteData<TData>, TError>(queryKey);

    if (!cached?.data || cached.data.responses.length === 0) {
      return;
    }

    const allResponses = cached.data.responses.map((r) => r.data);
    const allRequests = cached.data.responses.map((r) => r.request);
    const lastResponse = allResponses.at(-1);
    const lastRequest = allRequests.at(-1) ?? initialRequestRef.current;

    const canNext = canFetchNext({
      response: lastResponse,
      allResponses,
      request: lastRequest,
    });

    if (!canNext) return;

    const nextRequest = nextPageRequest({
      response: lastResponse,
      allResponses,
      request: lastRequest,
    });

    await doFetch("next", nextRequest);
  }, [queryKey, canFetchNext, nextPageRequest, doFetch]);

  const fetchPrev = useCallback(async () => {
    if (!canFetchPrev || !prevPageRequest) return;

    const cached = getCache<InfiniteData<TData>, TError>(queryKey);

    if (!cached?.data || cached.data.responses.length === 0) {
      return;
    }

    const allResponses = cached.data.responses.map((r) => r.data);
    const allRequests = cached.data.responses.map((r) => r.request);
    const firstResponse = allResponses.at(0);
    const firstRequest = allRequests.at(0) ?? initialRequestRef.current;

    const canPrev = canFetchPrev({
      response: firstResponse,
      allResponses,
      request: firstRequest,
    });

    if (!canPrev) return;

    const prevRequest = prevPageRequest({
      response: firstResponse,
      allResponses,
      request: firstRequest,
    });

    await doFetch("prev", prevRequest);
  }, [queryKey, canFetchPrev, prevPageRequest, doFetch]);

  const refetch = useCallback(async () => {
    setCache<InfiniteData<TData>, TError>(queryKey, {
      data: undefined,
      error: undefined,
      timestamp: 0,
    });

    await doFetch("next", {});
  }, [queryKey, doFetch]);

  useEffect(() => {
    mountedRef.current = true;

    if (!enabled) {
      dispatch({ type: "RESET" });
      return () => {
        mountedRef.current = false;
      };
    }

    const cached = getCache<InfiniteData<TData>, TError>(queryKey);

    if (!cached?.data || cached.data.responses.length === 0) {
      dispatch({ type: "FETCH_INITIAL_START" });
      doFetch("next", {});
    } else {
      dispatch({ type: "SYNC_CACHE", state: getCacheState() });
    }

    const unsubscribe = subscribeCache(queryKey, () => {
      if (mountedRef.current) {
        dispatch({ type: "SYNC_CACHE", state: getCacheState() });
      }
    });

    return () => {
      mountedRef.current = false;
      unsubscribe();
    };
  }, [queryKey, enabled]);

  useEffect(() => {
    if (queryTags.length === 0) return;

    return onRevalidate((invalidatedTags) => {
      const hasMatch = invalidatedTags.some((tag) => queryTags.includes(tag));

      if (hasMatch && mountedRef.current) {
        refetch();
      }
    });
  }, [JSON.stringify(queryTags), refetch]);

  return {
    data: state.data,
    allResponses: state.allResponses,
    loading: state.loading,
    fetching: state.fetching,
    fetchingNext: state.fetchingNext,
    fetchingPrev: state.fetchingPrev,
    canFetchNext: state.canFetchNext,
    canFetchPrev: state.canFetchPrev,
    fetchNext,
    fetchPrev,
    refetch,
    abort,
    error: state.error as TError | undefined,
    isOptimistic: state.isOptimistic,
  };
}
