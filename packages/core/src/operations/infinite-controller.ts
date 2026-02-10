import type { PluginContext } from "../plugins/types";
import type { PluginExecutor } from "../plugins/executor";
import type { StateManager } from "../state/manager";
import type { EventEmitter } from "../events/emitter";
import type { SpooshResponse } from "../types/response.types";
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

export type FetchDirection = "next" | "prev";

export type InfiniteReadState<TData, TItem, TError> = {
  data: TItem[] | undefined;
  allResponses: TData[] | undefined;
  allRequests: InfiniteRequestOptions[] | undefined;
  canFetchNext: boolean;
  canFetchPrev: boolean;
  error: TError | undefined;
};

export type InfiniteReadController<TData, TItem, TError> = {
  getState: () => InfiniteReadState<TData, TItem, TError>;
  getFetchingDirection: () => FetchDirection | null;
  subscribe: (callback: () => void) => () => void;

  fetchNext: () => Promise<void>;
  fetchPrev: () => Promise<void>;
  refetch: () => Promise<void>;
  abort: () => void;

  mount: () => void;
  unmount: () => void;
  update: (previousContext: PluginContext) => void;
  getContext: () => PluginContext;
  setPluginOptions: (options: unknown) => void;
};

export type CreateInfiniteReadOptions<TData, TItem, TError, TRequest> = {
  path: string;
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
  ) => Promise<SpooshResponse<TData, TError>>;

  /** Unique identifier for the hook instance. Persists across queryKey changes. */
  instanceId?: string;
};

function createTrackerKey(
  path: string,
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
  path: string,
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

type PageData<TData> = {
  allResponses: TData[];
  allRequests: InfiniteRequestOptions[];
};

function collectPageData<TData>(
  pageKeys: string[],
  stateManager: StateManager,
  pageRequests: Map<string, InfiniteRequestOptions>,
  initialRequest: InfiniteRequestOptions
): PageData<TData> {
  const allResponses: TData[] = [];
  const allRequests: InfiniteRequestOptions[] = [];

  for (const key of pageKeys) {
    const cached = stateManager.getCache(key);

    if (cached?.state?.data !== undefined) {
      allResponses.push(cached.state.data as TData);
      allRequests.push(pageRequests.get(key) ?? initialRequest);
    }
  }

  return { allResponses, allRequests };
}

function createInitialInfiniteState<TData, TItem, TError>(): InfiniteReadState<
  TData,
  TItem,
  TError
> {
  return {
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
    instanceId,
  } = options;

  let pageKeys: string[] = [];
  let pageRequests = new Map<string, InfiniteRequestOptions>();
  const subscribers = new Set<() => void>();
  let abortController: AbortController | null = null;
  const pendingFetches = new Set<string>();
  let pluginOptions: unknown = undefined;
  let fetchingDirection: FetchDirection | null = null;
  let latestError: TError | undefined = undefined;

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
        error: latestError,
      };
    }

    const { allResponses, allRequests } = collectPageData<TData>(
      pageKeys,
      stateManager,
      pageRequests,
      initialRequest
    );

    if (allResponses.length === 0) {
      return {
        data: undefined,
        allResponses: undefined,
        allRequests: undefined,
        canFetchNext: false,
        canFetchPrev: false,
        error: latestError,
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
      data: mergedData,
      allResponses,
      allRequests,
      canFetchNext: canNext,
      canFetchPrev: canPrev,
      error: latestError,
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

  const createContext = (
    pageKey: string,
    requestOptions?: InfiniteRequestOptions
  ): PluginContext => {
    return pluginExecutor.createContext({
      operationType: "infiniteRead",
      path,
      method,
      queryKey: pageKey,
      tags,
      requestTimestamp: Date.now(),
      instanceId,
      request: {
        headers: {},
        query: requestOptions?.query as
          | Record<string, string | number | boolean | undefined>
          | undefined,
        params: requestOptions?.params,
        body: requestOptions?.body,
      },
      temp: new Map(),
      pluginOptions,
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

    const pendingPromise = stateManager.getPendingPromise(pageKey);

    if (pendingPromise || pendingFetches.has(pageKey)) {
      return;
    }

    pendingFetches.add(pageKey);
    fetchingDirection = direction;
    notify();

    abortController = new AbortController();
    const signal = abortController.signal;

    const context = createContext(pageKey, mergedRequest);

    const coreFetch = async (): Promise<SpooshResponse<TData, TError>> => {
      const fetchPromise = (async (): Promise<
        SpooshResponse<TData, TError>
      > => {
        try {
          const response = await fetchFn(mergedRequest, signal);

          if (signal.aborted) {
            return {
              status: 0,
              data: undefined,
              aborted: true,
            } as SpooshResponse<TData, TError>;
          }

          return response;
        } catch (err) {
          if (signal.aborted) {
            return {
              status: 0,
              data: undefined,
              aborted: true,
            } as SpooshResponse<TData, TError>;
          }

          const errorResponse: SpooshResponse<TData, TError> = {
            status: 0,
            error: err as TError,
            data: undefined,
          };

          latestError = err as TError;

          return errorResponse;
        } finally {
          pendingFetches.delete(pageKey);
          fetchingDirection = null;
          stateManager.setPendingPromise(pageKey, undefined);
          notify();
        }
      })();

      stateManager.setPendingPromise(pageKey, fetchPromise);

      return fetchPromise;
    };

    const finalResponse = await pluginExecutor.executeMiddleware(
      "infiniteRead",
      context,
      coreFetch
    );

    if (finalResponse.data !== undefined && !finalResponse.error) {
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
          data: finalResponse.data,
          error: undefined,
          timestamp: Date.now(),
        },
        tags,
        stale: false,
      });

      latestError = undefined;
    } else if (finalResponse.error) {
      latestError = finalResponse.error;
    }
  };

  const controller: InfiniteReadController<TData, TItem, TError> = {
    getState() {
      return cachedState;
    },

    getFetchingDirection() {
      return fetchingDirection;
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

      const { allResponses, allRequests } = collectPageData<TData>(
        pageKeys,
        stateManager,
        pageRequests,
        initialRequest
      );

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

      const { allResponses, allRequests } = collectPageData<TData>(
        pageKeys,
        stateManager,
        pageRequests,
        initialRequest
      );

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
      latestError = undefined;
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

      const context = createContext(trackerKey, initialRequest);
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
      const context = createContext(trackerKey, initialRequest);
      pluginExecutor.executeLifecycle("onUnmount", "infiniteRead", context);

      pageSubscriptions.forEach((unsub) => unsub());
      pageSubscriptions = [];
      refetchUnsubscribe?.();
      refetchUnsubscribe = null;
    },

    update(previousContext) {
      const context = createContext(trackerKey, initialRequest);
      pluginExecutor.executeUpdateLifecycle(
        "infiniteRead",
        context,
        previousContext
      );
    },

    getContext() {
      return createContext(trackerKey, initialRequest);
    },

    setPluginOptions(opts) {
      pluginOptions = opts;
    },
  };

  return controller;
}
