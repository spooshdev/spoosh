import { useRef, useReducer, useEffect, useCallback, useState } from "react";
import {
  type EnlaceResponse,
  type PluginExecutor,
  type StateManager,
  type EventEmitter,
  type MergePluginOptions,
  type MergePluginResults,
  type EnlacePlugin,
  type PluginTypeConfig,
  type PluginContext,
  type OperationState,
} from "enlace";
import { createTrackingProxy, type TrackingResult } from "./trackingProxy";
import type {
  BaseInfiniteReadOptions,
  BaseInfiniteReadResult,
  ResolveDataTypes,
  InfiniteReadApiClient,
  AnyInfiniteRequestOptions,
} from "./types";
import { resolvePath, resolveTags } from "./utils";

export type CreateUseInfiniteReadOptions = {
  api: unknown;
  stateManager: StateManager;
  eventEmitter: EventEmitter;
  pluginExecutor: PluginExecutor;
};

type FetchDirection = "next" | "prev";

type InfiniteState<TData, TItem> = {
  loading: boolean;
  fetching: boolean;
  fetchingNext: boolean;
  fetchingPrev: boolean;
  data: TItem[] | undefined;
  allResponses: TData[] | undefined;
  allRequests: AnyInfiniteRequestOptions[] | undefined;
  canFetchNext: boolean;
  canFetchPrev: boolean;
  error: unknown;
  isOptimistic: boolean;
};

type InfiniteAction<TData, TItem> =
  | { type: "FETCH_INITIAL_START" }
  | { type: "FETCH_NEXT_START" }
  | { type: "FETCH_PREV_START" }
  | { type: "FETCH_ERROR"; error: unknown }
  | { type: "SYNC_CACHE"; state: Partial<InfiniteState<TData, TItem>> }
  | { type: "RESET" };

function infiniteReducer<TData, TItem>(
  state: InfiniteState<TData, TItem>,
  action: InfiniteAction<TData, TItem>
): InfiniteState<TData, TItem> {
  switch (action.type) {
    case "FETCH_INITIAL_START":
      return { ...state, loading: true, fetching: true };
    case "FETCH_NEXT_START":
      return { ...state, fetching: true, fetchingNext: true };
    case "FETCH_PREV_START":
      return { ...state, fetching: true, fetchingPrev: true };
    case "FETCH_ERROR":
      return {
        ...state,
        loading: false,
        fetching: false,
        fetchingNext: false,
        fetchingPrev: false,
        error: action.error,
      };
    case "SYNC_CACHE":
      return {
        ...state,
        ...action.state,
        loading: false,
        fetching: false,
        fetchingNext: false,
        fetchingPrev: false,
      };
    case "RESET":
      return initialInfiniteState as InfiniteState<TData, TItem>;
    default:
      return state;
  }
}

const initialInfiniteState: InfiniteState<unknown, unknown> = {
  loading: false,
  fetching: false,
  fetchingNext: false,
  fetchingPrev: false,
  data: undefined,
  allResponses: undefined,
  allRequests: undefined,
  canFetchNext: false,
  canFetchPrev: false,
  error: undefined,
  isOptimistic: false,
};

function createPageQueryKey(
  path: string[],
  method: string,
  baseOptions: object,
  pageRequest: AnyInfiniteRequestOptions
): string {
  return JSON.stringify({
    path,
    method,
    baseOptions,
    pageRequest,
  });
}

function createInfiniteTrackerKey(
  path: string[],
  method: string,
  baseOptions: object
): string {
  return JSON.stringify({
    path,
    method,
    baseOptions,
    type: "infinite-tracker",
  });
}

function shallowMergeRequest(
  initial: AnyInfiniteRequestOptions,
  override: Partial<AnyInfiniteRequestOptions>
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

export function createUseInfiniteRead<
  TSchema,
  TDefaultError,
  TPlugins extends readonly EnlacePlugin<PluginTypeConfig>[],
>(options: CreateUseInfiniteReadOptions) {
  const { api, stateManager, eventEmitter, pluginExecutor } = options;

  type PluginOptions = MergePluginOptions<TPlugins>;
  type PluginResults = MergePluginResults<TPlugins>;

  return function useInfiniteRead<
    TData,
    TItem,
    TError = TDefaultError,
    TRequest extends AnyInfiniteRequestOptions = AnyInfiniteRequestOptions,
  >(
    readFn: (
      api: InfiniteReadApiClient<TSchema, TDefaultError>
    ) => Promise<EnlaceResponse<TData, TError>>,
    readOptions: BaseInfiniteReadOptions<TData, TItem, TRequest> &
      ResolveDataTypes<PluginOptions["infiniteRead"], TData, TError>
  ): BaseInfiniteReadResult<TData, TError, TItem> & PluginResults["read"] {
    const {
      enabled = true,
      tags,
      additionalTags,
      canFetchNext,
      nextPageRequest,
      merger,
      canFetchPrev,
      prevPageRequest,
      ...pluginOpts
    } = readOptions;

    const trackingResultRef = useRef<TrackingResult>({
      trackedCall: null,
      selectorPath: null,
      selectorMethod: null,
    });

    const trackingProxy = createTrackingProxy<TSchema>((result) => {
      trackingResultRef.current = result;
    });

    (readFn as (api: unknown) => unknown)(trackingProxy);

    const trackedCall = trackingResultRef.current.trackedCall;

    if (!trackedCall) {
      throw new Error(
        "useInfiniteRead requires calling an HTTP method ($get). " +
          "Example: useInfiniteRead((api) => api.posts.$get())"
      );
    }

    const requestOptions = trackedCall.options as
      | {
          params?: Record<string, string | number>;
          query?: Record<string, unknown>;
          body?: unknown;
        }
      | undefined;

    const initialRequest: AnyInfiniteRequestOptions = {
      query: requestOptions?.query,
      params: requestOptions?.params,
      body: requestOptions?.body,
    };

    const baseOptionsForKey = {
      ...(trackedCall.options as object),
      query: undefined,
      params: undefined,
      body: undefined,
    };

    const resolvedPath = resolvePath(trackedCall.path, requestOptions?.params);
    const resolvedTags = resolveTags({ tags, additionalTags }, resolvedPath);

    const trackerKey = createInfiniteTrackerKey(
      trackedCall.path,
      trackedCall.method,
      baseOptionsForKey
    );

    const existingTracker = stateManager.getCache(trackerKey);
    const trackerData = existingTracker?.state?.data as
      | {
          pageKeys: string[];
          pageRequests: Record<string, AnyInfiniteRequestOptions>;
        }
      | undefined;

    const pageKeysRef = useRef<string[]>(trackerData?.pageKeys ?? []);
    const pageRequestsRef = useRef<Map<string, AnyInfiniteRequestOptions>>(
      new Map(Object.entries(trackerData?.pageRequests ?? {}))
    );
    const [subscriptionVersion, setSubscriptionVersion] = useState(
      trackerData ? 1 : 0
    );

    const canFetchNextRef = useRef(canFetchNext);
    const canFetchPrevRef = useRef(canFetchPrev);
    const mergerRef = useRef(merger);
    canFetchNextRef.current = canFetchNext;
    canFetchPrevRef.current = canFetchPrev;
    mergerRef.current = merger;

    const initialRequestRef = useRef(initialRequest);
    initialRequestRef.current = initialRequest;

    const getCacheState = (): Partial<InfiniteState<TData, TItem>> => {
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
        const cached = stateManager.getCache(key);

        if (cached?.state?.error) {
          hasError = cached.state.error as TError;
        }

        if (cached?.state?.data !== undefined) {
          allResponses.push(cached.state.data as TData);
          allRequests.push(
            pageRequestsRef.current.get(key) ?? initialRequestRef.current
          );
        }

        if (cached?.state?.isOptimistic) {
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
        request: lastRequest as TRequest,
      });

      const canPrev = canFetchPrevRef.current
        ? canFetchPrevRef.current({
            response: firstResponse,
            allResponses,
            request: firstRequest as TRequest,
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
      infiniteReducer<TData, TItem>,
      null,
      () => ({
        ...(initialInfiniteState as InfiniteState<TData, TItem>),
        ...getCacheState(),
      })
    );

    const mountedRef = useRef(true);
    const abortControllerRef = useRef<AbortController | null>(null);
    const pendingFetchesRef = useRef<Set<string>>(new Set());

    const abort = useCallback(() => {
      abortControllerRef.current?.abort();
      abortControllerRef.current = null;
    }, []);

    const createContext = (pageKey: string): PluginContext<TData, TError> => {
      const initialState: OperationState<TData, TError> = {
        loading: true,
        fetching: true,
        data: undefined,
        error: undefined,
        isOptimistic: false,
        isStale: true,
        timestamp: 0,
      };

      return pluginExecutor.createContext<TData, TError>({
        operationType: "infiniteRead",
        path: trackedCall.path,
        method: trackedCall.method as "GET",
        queryKey: pageKey,
        tags: resolvedTags,
        requestTimestamp: Date.now(),
        requestOptions: trackedCall.options ?? {},
        state: initialState,
        metadata: new Map(),
        pluginOptions: pluginOpts,
        abort: () => abortControllerRef.current?.abort(),
        stateManager,
        eventEmitter,
      });
    };

    const saveTrackerState = () => {
      stateManager.setCache(trackerKey, {
        state: {
          loading: false,
          fetching: false,
          data: {
            pageKeys: pageKeysRef.current,
            pageRequests: Object.fromEntries(pageRequestsRef.current),
          },
          error: undefined,
          isOptimistic: false,
          isStale: false,
          timestamp: Date.now(),
        },
        tags: resolvedTags,
      });
    };

    const doFetch = useCallback(
      async (
        direction: FetchDirection,
        requestOverride: Partial<AnyInfiniteRequestOptions>
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

        const cached = stateManager.getCache(pageKey);

        if (cached?.promise || pendingFetchesRef.current.has(pageKey)) {
          return;
        }

        pendingFetchesRef.current.add(pageKey);

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

        let context = createContext(pageKey);

        const fetchPromise = (async () => {
          context = await pluginExecutor.execute(
            "beforeFetch",
            "infiniteRead",
            context
          );

          try {
            let current: unknown = api;

            for (const segment of resolvedPathForFetch) {
              current = (current as Record<string, unknown>)[segment];
            }

            const method = (current as Record<string, unknown>)[
              trackedCall.method
            ] as (opts?: unknown) => Promise<EnlaceResponse<TData, TError>>;

            const fetchOptions = {
              ...(trackedCall.options as object),
              query: mergedRequest.query,
              params: mergedRequest.params,
              body: mergedRequest.body,
              signal,
            };

            const res = await method(fetchOptions);
            context.response = res;

            context = await pluginExecutor.execute(
              "afterFetch",
              "infiniteRead",
              context
            );

            if (res.aborted || !mountedRef.current) return;

            if (res.error) {
              stateManager.setCache(pageKey, {
                state: {
                  loading: false,
                  fetching: false,
                  data: undefined,
                  error: res.error,
                  isOptimistic: false,
                  isStale: true,
                  timestamp: Date.now(),
                },
                tags: resolvedTags,
              });

              context = await pluginExecutor.execute(
                "onError",
                "infiniteRead",
                context
              );
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

              saveTrackerState();

              stateManager.setCache(pageKey, {
                state: {
                  loading: false,
                  fetching: false,
                  data: res.data,
                  error: undefined,
                  isOptimistic: false,
                  isStale: false,
                  timestamp: Date.now(),
                },
                tags: resolvedTags,
              });

              context = await pluginExecutor.execute(
                "onSuccess",
                "infiniteRead",
                context
              );

              setSubscriptionVersion((v) => v + 1);
            }
          } catch (err) {
            if (!mountedRef.current) return;

            context.response = {
              status: 0,
              error: err as TError,
              data: undefined,
            };

            stateManager.setCache(pageKey, {
              state: {
                loading: false,
                fetching: false,
                data: undefined,
                error: err,
                isOptimistic: false,
                isStale: true,
                timestamp: Date.now(),
              },
              tags: resolvedTags,
            });

            context = await pluginExecutor.execute(
              "onError",
              "infiniteRead",
              context
            );
          }
        })();

        stateManager.setCache(pageKey, {
          promise: fetchPromise,
          tags: resolvedTags,
        });

        await fetchPromise;
        pendingFetchesRef.current.delete(pageKey);
      },
      [trackedCall, baseOptionsForKey, resolvedTags, pluginOpts]
    );

    const fetchNext = useCallback(async () => {
      const pageKeys = pageKeysRef.current;

      if (pageKeys.length === 0) {
        return;
      }

      const allResponses: TData[] = [];
      const allRequests: AnyInfiniteRequestOptions[] = [];

      for (const key of pageKeys) {
        const cached = stateManager.getCache(key);

        if (cached?.state?.data !== undefined) {
          allResponses.push(cached.state.data as TData);
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
        request: lastRequest as TRequest,
      });

      if (!canNext) return;

      const nextRequest = nextPageRequest({
        response: lastResponse,
        allResponses,
        request: lastRequest as TRequest,
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
        const cached = stateManager.getCache(key);

        if (cached?.state?.data !== undefined) {
          allResponses.push(cached.state.data as TData);
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
        request: firstRequest as TRequest,
      });

      if (!canPrev) return;

      const prevRequest = prevPageRequest({
        response: firstResponse,
        allResponses,
        request: firstRequest as TRequest,
      });

      await doFetch("prev", prevRequest);
    }, [canFetchPrev, prevPageRequest, doFetch]);

    const refetch = useCallback(async () => {
      for (const key of pageKeysRef.current) {
        stateManager.deleteCache(key);
      }

      pageKeysRef.current = [];
      pageRequestsRef.current.clear();
      saveTrackerState();

      dispatch({ type: "FETCH_INITIAL_START" });
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

      if (!hasPages) {
        dispatch({ type: "FETCH_INITIAL_START" });
        doFetch("next", {});
      } else {
        dispatch({ type: "SYNC_CACHE", state: getCacheState() });
      }

      const context = createContext(trackerKey);
      pluginExecutor.execute("onMount", "infiniteRead", context);

      return () => {
        mountedRef.current = false;
        pluginExecutor.execute("onUnmount", "infiniteRead", context);
      };
    }, [enabled]);

    useEffect(() => {
      if (pageKeysRef.current.length === 0) return;

      dispatch({ type: "SYNC_CACHE", state: getCacheState() });

      const unsubscribers: (() => void)[] = [];

      for (const key of pageKeysRef.current) {
        const unsub = stateManager.subscribeCache(key, () => {
          if (mountedRef.current) {
            dispatch({ type: "SYNC_CACHE", state: getCacheState() });
          }
        });
        unsubscribers.push(unsub);
      }

      return () => {
        unsubscribers.forEach((unsub) => unsub());
      };
    }, [subscriptionVersion]);

    useEffect(() => {
      if (resolvedTags.length === 0) return;

      const unsubscribe = eventEmitter.on<string[]>(
        "invalidate",
        (invalidatedTags) => {
          const hasMatch = invalidatedTags.some((tag) =>
            resolvedTags.includes(tag)
          );

          if (hasMatch && mountedRef.current) {
            refetch();
          }
        }
      );

      return () => {
        unsubscribe();
      };
    }, [JSON.stringify(resolvedTags), refetch]);

    const pluginOptsKey = JSON.stringify(pluginOpts);

    useEffect(() => {
      if (!enabled) return;

      const context = createContext(trackerKey);
      pluginExecutor.execute("onOptionsUpdate", "infiniteRead", context);
    }, [pluginOptsKey]);

    const result = {
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
    };

    return result as unknown as BaseInfiniteReadResult<TData, TError, TItem> &
      PluginResults["read"];
  };
}
