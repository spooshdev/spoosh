import { useRef, useReducer, useEffect, useCallback, useState } from "react";
import { generateTags, type EnlaceResponse } from "enlace-core";
import type {
  ApiClient,
  TrackedCall,
  UseEnlaceInfiniteReadResult,
  UseEnlaceInfiniteReadOptions,
  FetchDirection,
  AnyInfiniteRequestOptions,
} from "../types";
import type { AnyReactRequestOptions } from "../types";
import {
  infiniteHookReducer,
  initialInfiniteState,
  type InfiniteHookState,
} from "../reducer";
import { onRevalidate } from "../revalidator";
import {
  createPageQueryKey,
  createInfiniteTrackerKey,
  getCache,
  setCache,
  subscribeMultipleCache,
  getInfiniteTracker,
  setInfiniteTracker,
  isStale,
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

export type InfiniteReadModeOptions<
  TData,
  TItem,
  TRequest = AnyInfiniteRequestOptions,
> = {
  autoGenerateTags: boolean;
  staleTime: number;
} & UseEnlaceInfiniteReadOptions<TData, TItem, TRequest>;

export function useInfiniteReadImpl<TSchema, TData, TError, TItem>(
  api: ApiClient<TSchema>,
  trackedCall: TrackedCall,
  options: InfiniteReadModeOptions<TData, TItem>
): UseEnlaceInfiniteReadResult<TData, TError, TItem> {
  const {
    autoGenerateTags,
    staleTime,
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

  const resolvedPath = resolvePath(trackedCall.path, requestOptions?.params);
  const baseTags =
    requestOptions?.tags ??
    (autoGenerateTags ? generateTags(resolvedPath) : []);
  const queryTagsValue = [
    ...baseTags,
    ...(requestOptions?.additionalTags ?? []),
  ];
  const queryTagsRef = useRef(queryTagsValue);
  queryTagsRef.current = queryTagsValue;

  const trackerKeyValue = createInfiniteTrackerKey(
    trackedCall.path,
    trackedCall.method,
    baseOptionsForKey
  );
  const trackerKeyRef = useRef(trackerKeyValue);
  trackerKeyRef.current = trackerKeyValue;

  const existingTracker = getInfiniteTracker(trackerKeyValue);
  const pageKeysRef = useRef<string[]>(existingTracker?.pageKeys ?? []);
  const pageRequestsRef = useRef<Map<string, AnyInfiniteRequestOptions>>(
    new Map(
      Object.entries(existingTracker?.pageRequests ?? {}) as [
        string,
        AnyInfiniteRequestOptions,
      ][]
    )
  );
  const [subscriptionVersion, setSubscriptionVersion] = useState(
    existingTracker ? 1 : 0
  );

  const canFetchNextRef = useRef(canFetchNext);
  const canFetchPrevRef = useRef(canFetchPrev);
  const mergerRef = useRef(merger);
  canFetchNextRef.current = canFetchNext;
  canFetchPrevRef.current = canFetchPrev;
  mergerRef.current = merger;

  const getCacheState = (): Partial<InfiniteHookState<TData, TItem>> => {
    const pageKeys = pageKeysRef.current;

    if (pageKeys.length === 0) {
      return {
        data: undefined,
        allResponses: undefined,
        allRequests: undefined,
        canFetchNext: false,
        canFetchPrev: false,
        isOptimistic: false,
        error: undefined,
      };
    }

    const allResponses: TData[] = [];
    const allRequests: AnyInfiniteRequestOptions[] = [];
    let hasError: TError | undefined;
    let isAnyOptimistic = false;

    for (const key of pageKeys) {
      const cached = getCache<TData, TError>(key);

      if (cached?.error) {
        hasError = cached.error;
      }

      if (cached?.data !== undefined) {
        allResponses.push(cached.data);
        allRequests.push(
          pageRequestsRef.current.get(key) ?? initialRequestRef.current
        );
      }

      if (cached?.isOptimistic) {
        isAnyOptimistic = true;
      }
    }

    if (allResponses.length === 0) {
      return {
        data: undefined,
        allResponses: undefined,
        allRequests: undefined,
        canFetchNext: false,
        canFetchPrev: false,
        isOptimistic: false,
        error: hasError,
      };
    }

    const lastResponse = allResponses.at(-1);
    const firstResponse = allResponses.at(0);
    const lastRequest = allRequests.at(-1) ?? initialRequestRef.current;
    const firstRequest = allRequests.at(0) ?? initialRequestRef.current;

    const canNext = canFetchNextRef.current({
      response: lastResponse,
      allResponses,
      request: lastRequest,
    });

    const canPrev = canFetchPrevRef.current
      ? canFetchPrevRef.current({
          response: firstResponse,
          allResponses,
          request: firstRequest,
        })
      : false;

    const mergedData = mergerRef.current(allResponses);

    return {
      data: mergedData,
      allResponses,
      allRequests,
      canFetchNext: canNext,
      canFetchPrev: canPrev,
      isOptimistic: isAnyOptimistic,
      error: hasError,
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
      const mergedRequest = shallowMergeRequest(
        initialRequestRef.current,
        requestOverride
      );

      const pageKey = createPageQueryKey(
        trackedCall.path,
        trackedCall.method,
        baseOptionsForKey,
        mergedRequest
      );

      const cached = getCache<TData, TError>(pageKey);

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
            setCache<TData, TError>(pageKey, {
              error: res.error,
              timestamp: Date.now(),
              tags: queryTagsRef.current,
            });
          } else if (res.data !== undefined) {
            pageRequestsRef.current.set(pageKey, mergedRequest);

            if (direction === "next") {
              if (!pageKeysRef.current.includes(pageKey)) {
                pageKeysRef.current = [...pageKeysRef.current, pageKey];
              }
            } else {
              if (!pageKeysRef.current.includes(pageKey)) {
                pageKeysRef.current = [pageKey, ...pageKeysRef.current];
              }
            }

            setInfiniteTracker(
              trackerKeyRef.current,
              {
                pageKeys: pageKeysRef.current,
                pageRequests: Object.fromEntries(pageRequestsRef.current),
              },
              queryTagsRef.current
            );

            setCache<TData, TError>(pageKey, {
              data: res.data,
              error: undefined,
              timestamp: Date.now(),
              tags: queryTagsRef.current,
            });

            setSubscriptionVersion((v) => v + 1);
          }
        })
        .catch((err: TError) => {
          if (!mountedRef.current) return;

          setCache<TData, TError>(pageKey, {
            error: err,
            timestamp: Date.now(),
            tags: queryTagsRef.current,
          });
        });

      setCache<TData, TError>(pageKey, {
        promise: fetchPromise,
        tags: queryTagsRef.current,
      });

      await fetchPromise;
    },
    [api as unknown, trackedCall, baseOptionsForKey, retry, retryDelay]
  );

  const fetchNext = useCallback(async () => {
    const pageKeys = pageKeysRef.current;

    if (pageKeys.length === 0) {
      return;
    }

    const allResponses: TData[] = [];
    const allRequests: AnyInfiniteRequestOptions[] = [];

    for (const key of pageKeys) {
      const cached = getCache<TData, TError>(key);

      if (cached?.data !== undefined) {
        allResponses.push(cached.data);
        allRequests.push(
          pageRequestsRef.current.get(key) ?? initialRequestRef.current
        );
      }
    }

    if (allResponses.length === 0) return;

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
  }, [canFetchNext, nextPageRequest, doFetch]);

  const fetchPrev = useCallback(async () => {
    if (!canFetchPrev || !prevPageRequest) return;

    const pageKeys = pageKeysRef.current;

    if (pageKeys.length === 0) {
      return;
    }

    const allResponses: TData[] = [];
    const allRequests: AnyInfiniteRequestOptions[] = [];

    for (const key of pageKeys) {
      const cached = getCache<TData, TError>(key);

      if (cached?.data !== undefined) {
        allResponses.push(cached.data);
        allRequests.push(
          pageRequestsRef.current.get(key) ?? initialRequestRef.current
        );
      }
    }

    if (allResponses.length === 0) return;

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
  }, [canFetchPrev, prevPageRequest, doFetch]);

  const refetch = useCallback(async () => {
    for (const key of pageKeysRef.current) {
      setCache<TData, TError>(key, {
        data: undefined,
        error: undefined,
        timestamp: 0,
      });
    }

    pageKeysRef.current = [];
    pageRequestsRef.current.clear();

    setInfiniteTracker(
      trackerKeyRef.current,
      { pageKeys: [], pageRequests: {} },
      queryTagsRef.current
    );

    await doFetch("next", {});
  }, [doFetch]);

  useEffect(() => {
    mountedRef.current = true;

    if (!enabled) {
      dispatch({ type: "RESET" });
      return () => {
        mountedRef.current = false;
      };
    }

    const hasPages = pageKeysRef.current.length > 0;
    const firstPageKey = pageKeysRef.current[0];
    const isFirstPageStale = firstPageKey
      ? isStale(firstPageKey, staleTime)
      : true;

    if (!hasPages || isFirstPageStale) {
      dispatch({ type: "FETCH_INITIAL_START" });

      if (hasPages && isFirstPageStale) {
        pageKeysRef.current = [];
        pageRequestsRef.current.clear();
        setInfiniteTracker(
          trackerKeyRef.current,
          { pageKeys: [], pageRequests: {} },
          queryTagsRef.current
        );
      }

      doFetch("next", {});
    } else {
      dispatch({ type: "SYNC_CACHE", state: getCacheState() });
    }

    return () => {
      mountedRef.current = false;
    };
  }, [enabled, staleTime]);

  useEffect(() => {
    if (pageKeysRef.current.length === 0) return;

    dispatch({ type: "SYNC_CACHE", state: getCacheState() });

    const unsubscribe = subscribeMultipleCache(pageKeysRef.current, () => {
      if (mountedRef.current) {
        dispatch({ type: "SYNC_CACHE", state: getCacheState() });
      }
    });

    return () => {
      unsubscribe();
    };
  }, [subscriptionVersion]);

  useEffect(() => {
    if (queryTagsRef.current.length === 0) return;

    return onRevalidate((invalidatedTags) => {
      const hasMatch = invalidatedTags.some((tag) =>
        queryTagsRef.current.includes(tag)
      );

      if (hasMatch && mountedRef.current) {
        refetch();
      }
    });
  }, [JSON.stringify(queryTagsValue), refetch]);

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
