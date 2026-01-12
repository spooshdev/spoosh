import type { PluginContext, OperationState } from "../plugins/types";
import type { PluginExecutor } from "../plugins/executor";
import type { StateManager } from "../state/manager";
import type { EventEmitter } from "../events/emitter";
import type { EnlaceResponse } from "../types/response.types";
import type { HttpMethod } from "../types/common.types";

export type InfiniteRequestOptions = {
  query?: Record<string, unknown>;
  params?: Record<string, string | number>;
  body?: unknown;
};

export type PageContext<TData, TRequest = InfiniteRequestOptions> = {
  response: TData | undefined;
  allResponses: TData[];
  request: TRequest;
};

export type InfiniteReadState<TData, TItem, TError> = {
  loading: boolean;
  fetching: boolean;
  fetchingNext: boolean;
  fetchingPrev: boolean;
  data: TItem[] | undefined;
  allResponses: TData[] | undefined;
  allRequests: InfiniteRequestOptions[] | undefined;
  canFetchNext: boolean;
  canFetchPrev: boolean;
  error: TError | undefined;
};

export type InfiniteReadController<TData, TItem, TError> = {
  getState: () => InfiniteReadState<TData, TItem, TError>;
  subscribe: (callback: () => void) => () => void;

  fetchNext: () => Promise<void>;
  fetchPrev: () => Promise<void>;
  refetch: () => Promise<void>;
  abort: () => void;

  mount: () => void;
  unmount: () => void;
  update: (previousContext: PluginContext<TData, TError>) => void;
  getContext: () => PluginContext<TData, TError>;
  setPluginOptions: (options: unknown) => void;
};

export type CreateInfiniteReadOptions<TData, TItem, TError, TRequest> = {
  path: string[];
  method: HttpMethod;
  tags: string[];
  initialRequest: InfiniteRequestOptions;
  baseOptionsForKey: object;

  canFetchNext: (ctx: PageContext<TData, TRequest>) => boolean;
  canFetchPrev?: (ctx: PageContext<TData, TRequest>) => boolean;
  nextPageRequest: (ctx: PageContext<TData, TRequest>) => Partial<TRequest>;
  prevPageRequest?: (ctx: PageContext<TData, TRequest>) => Partial<TRequest>;
  merger: (responses: TData[]) => TItem[];

  stateManager: StateManager;
  eventEmitter: EventEmitter;
  pluginExecutor: PluginExecutor;
  fetchFn: (
    options: InfiniteRequestOptions,
    signal: AbortSignal
  ) => Promise<EnlaceResponse<TData, TError>>;

  /** Unique identifier for the hook instance. Persists across queryKey changes. */
  hookId?: string;
};

type FetchDirection = "next" | "prev";

function createTrackerKey(
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

function createPageKey(
  path: string[],
  method: string,
  baseOptions: object,
  pageRequest: InfiniteRequestOptions
): string {
  return JSON.stringify({
    path,
    method,
    baseOptions,
    pageRequest,
  });
}

function shallowMergeRequest(
  initial: InfiniteRequestOptions,
  override: Partial<InfiniteRequestOptions>
): InfiniteRequestOptions {
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

function createInitialInfiniteState<TData, TItem, TError>(): InfiniteReadState<
  TData,
  TItem,
  TError
> {
  return {
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
  };
}

export function createInfiniteReadController<
  TData,
  TItem,
  TError,
  TRequest extends InfiniteRequestOptions = InfiniteRequestOptions,
>(
  options: CreateInfiniteReadOptions<TData, TItem, TError, TRequest>
): InfiniteReadController<TData, TItem, TError> {
  const {
    path,
    method,
    tags,
    initialRequest,
    baseOptionsForKey,
    canFetchNext,
    canFetchPrev,
    nextPageRequest,
    prevPageRequest,
    merger,
    stateManager,
    eventEmitter,
    pluginExecutor,
    fetchFn,
    hookId,
  } = options;

  let pageKeys: string[] = [];
  let pageRequests = new Map<string, InfiniteRequestOptions>();
  const subscribers = new Set<() => void>();
  let abortController: AbortController | null = null;
  const pendingFetches = new Set<string>();
  let pluginOptions: unknown = undefined;
  let fetchingDirection: FetchDirection | null = null;

  let cachedState: InfiniteReadState<TData, TItem, TError> =
    createInitialInfiniteState();

  const trackerKey = createTrackerKey(path, method, baseOptionsForKey);

  let pageSubscriptions: (() => void)[] = [];
  let refetchUnsubscribe: (() => void) | null = null;

  const loadFromTracker = (): void => {
    const cached = stateManager.getCache(trackerKey);
    const trackerData = cached?.state?.data as
      | {
          pageKeys: string[];
          pageRequests: Record<string, InfiniteRequestOptions>;
        }
      | undefined;

    if (trackerData) {
      pageKeys = trackerData.pageKeys;
      pageRequests = new Map(Object.entries(trackerData.pageRequests));
    }
  };

  const saveToTracker = (): void => {
    stateManager.setCache(trackerKey, {
      state: {
        loading: false,
        fetching: false,
        data: {
          pageKeys,
          pageRequests: Object.fromEntries(pageRequests),
        },
        error: undefined,
        timestamp: Date.now(),
      },
      tags,
    });
  };

  const computeState = (): InfiniteReadState<TData, TItem, TError> => {
    if (pageKeys.length === 0) {
      return {
        ...createInitialInfiniteState<TData, TItem, TError>(),
        loading: fetchingDirection !== null,
        fetching: fetchingDirection !== null,
        fetchingNext: fetchingDirection === "next",
        fetchingPrev: fetchingDirection === "prev",
      };
    }

    const allResponses: TData[] = [];
    const allRequests: InfiniteRequestOptions[] = [];
    let hasError: TError | undefined;

    for (const key of pageKeys) {
      const cached = stateManager.getCache(key);

      if (cached?.state?.error) {
        hasError = cached.state.error as TError;
      }

      if (cached?.state?.data !== undefined) {
        allResponses.push(cached.state.data as TData);
        allRequests.push(pageRequests.get(key) ?? initialRequest);
      }
    }

    if (allResponses.length === 0) {
      return {
        loading: fetchingDirection !== null,
        fetching: fetchingDirection !== null,
        fetchingNext: fetchingDirection === "next",
        fetchingPrev: fetchingDirection === "prev",
        data: undefined,
        allResponses: undefined,
        allRequests: undefined,
        canFetchNext: false,
        canFetchPrev: false,
        error: hasError,
      };
    }

    const lastResponse = allResponses.at(-1);
    const firstResponse = allResponses.at(0);
    const lastRequest = allRequests.at(-1) ?? initialRequest;
    const firstRequest = allRequests.at(0) ?? initialRequest;

    const canNext = canFetchNext({
      response: lastResponse,
      allResponses,
      request: lastRequest as TRequest,
    });

    const canPrev = canFetchPrev
      ? canFetchPrev({
          response: firstResponse,
          allResponses,
          request: firstRequest as TRequest,
        })
      : false;

    const mergedData = merger(allResponses);

    return {
      loading: false,
      fetching: fetchingDirection !== null,
      fetchingNext: fetchingDirection === "next",
      fetchingPrev: fetchingDirection === "prev",
      data: mergedData,
      allResponses,
      allRequests,
      canFetchNext: canNext,
      canFetchPrev: canPrev,
      error: hasError,
    };
  };

  const notify = (): void => {
    cachedState = computeState();
    subscribers.forEach((cb) => cb());
  };

  const subscribeToPages = (): void => {
    pageSubscriptions.forEach((unsub) => unsub());
    pageSubscriptions = pageKeys.map((key) =>
      stateManager.subscribeCache(key, notify)
    );
  };

  const createContext = (pageKey: string): PluginContext<TData, TError> => {
    const initialState: OperationState<TData, TError> = {
      loading: true,
      fetching: true,
      data: undefined,
      error: undefined,
      timestamp: 0,
    };

    return pluginExecutor.createContext<TData, TError>({
      operationType: "infiniteRead",
      path,
      method,
      queryKey: pageKey,
      tags,
      requestTimestamp: Date.now(),
      hookId,
      requestOptions: {},
      state: initialState,
      metadata: new Map(),
      pluginOptions,
      abort: () => abortController?.abort(),
      stateManager,
      eventEmitter,
    });
  };

  const doFetch = async (
    direction: FetchDirection,
    requestOverride: Partial<InfiniteRequestOptions>
  ): Promise<void> => {
    const mergedRequest = shallowMergeRequest(initialRequest, requestOverride);
    const pageKey = createPageKey(
      path,
      method,
      baseOptionsForKey,
      mergedRequest
    );

    const cached = stateManager.getCache(pageKey);

    if (cached?.promise || pendingFetches.has(pageKey)) {
      return;
    }

    pendingFetches.add(pageKey);
    fetchingDirection = direction;
    notify();

    abortController = new AbortController();
    const signal = abortController.signal;

    const context = createContext(pageKey);

    const coreFetch = async (): Promise<EnlaceResponse<TData, TError>> => {
      const fetchPromise = (async (): Promise<
        EnlaceResponse<TData, TError>
      > => {
        try {
          const response = await fetchFn(mergedRequest, signal);
          context.response = response;

          if (signal.aborted) {
            return {
              status: 0,
              data: undefined,
              aborted: true,
            } as EnlaceResponse<TData, TError>;
          }

          if (response.error) {
            stateManager.setCache(pageKey, {
              state: {
                loading: false,
                fetching: false,
                data: undefined,
                error: response.error,
                timestamp: Date.now(),
              },
              tags,
            });
          } else if (response.data !== undefined) {
            pageRequests.set(pageKey, mergedRequest);

            if (direction === "next") {
              if (!pageKeys.includes(pageKey)) {
                pageKeys = [...pageKeys, pageKey];
              }
            } else {
              if (!pageKeys.includes(pageKey)) {
                pageKeys = [pageKey, ...pageKeys];
              }
            }

            saveToTracker();
            subscribeToPages();

            stateManager.setCache(pageKey, {
              state: {
                loading: false,
                fetching: false,
                data: response.data,
                error: undefined,
                timestamp: Date.now(),
              },
              tags,
              stale: false,
            });
          }

          return response;
        } catch (err) {
          if (signal.aborted) {
            return {
              status: 0,
              data: undefined,
              aborted: true,
            } as EnlaceResponse<TData, TError>;
          }

          const errorResponse: EnlaceResponse<TData, TError> = {
            status: 0,
            error: err as TError,
            data: undefined,
          };

          context.response = errorResponse;

          stateManager.setCache(pageKey, {
            state: {
              loading: false,
              fetching: false,
              data: undefined,
              error: err,
              timestamp: Date.now(),
            },
            tags,
          });

          return errorResponse;
        } finally {
          pendingFetches.delete(pageKey);
          fetchingDirection = null;
          stateManager.setCache(pageKey, { promise: undefined });
          notify();
        }
      })();

      stateManager.setCache(pageKey, { promise: fetchPromise, tags });

      return fetchPromise;
    };

    await pluginExecutor.executeMiddleware("infiniteRead", context, coreFetch);
  };

  const controller: InfiniteReadController<TData, TItem, TError> = {
    getState() {
      return cachedState;
    },

    subscribe(callback) {
      subscribers.add(callback);
      return () => subscribers.delete(callback);
    },

    async fetchNext() {
      if (pageKeys.length === 0) {
        await doFetch("next", {});
        return;
      }

      const allResponses: TData[] = [];
      const allRequests: InfiniteRequestOptions[] = [];

      for (const key of pageKeys) {
        const cached = stateManager.getCache(key);

        if (cached?.state?.data !== undefined) {
          allResponses.push(cached.state.data as TData);
          allRequests.push(pageRequests.get(key) ?? initialRequest);
        }
      }

      if (allResponses.length === 0) return;

      const lastResponse = allResponses.at(-1);
      const lastRequest = allRequests.at(-1) ?? initialRequest;

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
    },

    async fetchPrev() {
      if (!canFetchPrev || !prevPageRequest) return;

      if (pageKeys.length === 0) return;

      const allResponses: TData[] = [];
      const allRequests: InfiniteRequestOptions[] = [];

      for (const key of pageKeys) {
        const cached = stateManager.getCache(key);

        if (cached?.state?.data !== undefined) {
          allResponses.push(cached.state.data as TData);
          allRequests.push(pageRequests.get(key) ?? initialRequest);
        }
      }

      if (allResponses.length === 0) return;

      const firstResponse = allResponses.at(0);
      const firstRequest = allRequests.at(0) ?? initialRequest;

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
    },

    async refetch() {
      for (const key of pageKeys) {
        stateManager.deleteCache(key);
      }

      pageKeys = [];
      pageRequests.clear();
      pageSubscriptions.forEach((unsub) => unsub());
      pageSubscriptions = [];
      saveToTracker();

      fetchingDirection = "next";
      notify();

      await doFetch("next", {});
    },

    abort() {
      abortController?.abort();
      abortController = null;
    },

    mount() {
      loadFromTracker();
      cachedState = computeState();
      subscribeToPages();

      const context = createContext(trackerKey);
      pluginExecutor.executeLifecycle("onMount", "infiniteRead", context);

      refetchUnsubscribe = eventEmitter.on("refetch", (event) => {
        const isRelevant =
          event.queryKey === trackerKey || pageKeys.includes(event.queryKey);

        if (isRelevant) {
          controller.refetch();
        }
      });

      const isStale = pageKeys.some((key) => {
        const cached = stateManager.getCache(key);
        return cached?.stale === true;
      });

      if (isStale) {
        controller.refetch();
      }
    },

    unmount() {
      const context = createContext(trackerKey);
      pluginExecutor.executeLifecycle("onUnmount", "infiniteRead", context);

      pageSubscriptions.forEach((unsub) => unsub());
      pageSubscriptions = [];
      refetchUnsubscribe?.();
      refetchUnsubscribe = null;
    },

    update(previousContext: PluginContext<TData, TError>) {
      const context = createContext(trackerKey);
      pluginExecutor.executeUpdateLifecycle(
        "infiniteRead",
        context,
        previousContext
      );
    },

    getContext() {
      return createContext(trackerKey);
    },

    setPluginOptions(opts) {
      pluginOptions = opts;
    },
  };

  return controller;
}
