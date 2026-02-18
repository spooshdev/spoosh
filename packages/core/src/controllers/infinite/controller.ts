import type { PluginContext } from "../../plugins/types";
import type { SpooshResponse } from "../../types/response.types";
import type {
  CreateInfiniteReadOptions,
  FetchDirection,
  InfiniteReadController,
  InfiniteReadState,
  InfiniteRequestOptions,
  InfiniteTriggerOptions,
} from "./types";
import {
  shallowMergeRequest,
  collectPageData,
  createInitialInfiniteState,
} from "./utils";

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
    canFetchNext = () => false,
    canFetchPrev,
    nextPageRequest = () => ({}) as Partial<TRequest>,
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
  let activeInitialRequest = initialRequest;

  let cachedState: InfiniteReadState<TData, TItem, TError> =
    createInitialInfiniteState();

  let pageSubscriptions: (() => void)[] = [];
  let refetchUnsubscribe: (() => void) | null = null;

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
      activeInitialRequest
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
    const lastRequest = allRequests.at(-1) ?? activeInitialRequest;
    const firstRequest = allRequests.at(0) ?? activeInitialRequest;

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
    const mergedRequest = shallowMergeRequest(
      activeInitialRequest,
      requestOverride
    );
    const pageKey = stateManager.createQueryKey({
      path,
      method,
      options: mergedRequest,
    });

    const pendingPromise = stateManager.getPendingPromise(pageKey);

    if (pendingPromise || pendingFetches.has(pageKey)) {
      return;
    }

    pendingFetches.add(pageKey);
    fetchingDirection = direction;
    latestError = undefined;
    notify();

    abortController = new AbortController();
    const signal = abortController.signal;

    const context = createContext(pageKey, mergedRequest);

    const coreFetch = async (): Promise<SpooshResponse<TData, TError>> => {
      try {
        const response = await fetchFn(context.request, signal);

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
      }
    };

    const middlewarePromise = pluginExecutor.executeMiddleware(
      "infiniteRead",
      context,
      coreFetch
    );

    stateManager.setPendingPromise(pageKey, middlewarePromise);

    const finalResponse = await middlewarePromise;

    pendingFetches.delete(pageKey);
    fetchingDirection = null;
    stateManager.setPendingPromise(pageKey, undefined);
    notify();

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
        activeInitialRequest
      );

      if (allResponses.length === 0) return;

      const lastResponse = allResponses.at(-1);
      const lastRequest = allRequests.at(-1) ?? activeInitialRequest;

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
        activeInitialRequest
      );

      if (allResponses.length === 0) return;

      const firstResponse = allResponses.at(0);
      const firstRequest = allRequests.at(0) ?? activeInitialRequest;

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

    async trigger(options?: InfiniteTriggerOptions) {
      const { force = true, ...requestOverride } = options ?? {};

      if (abortController) {
        abortController.abort();
        abortController = null;
      }

      for (const key of pageKeys) {
        stateManager.setPendingPromise(key, undefined);
      }

      if (force) {
        const allPathCaches = stateManager.getCacheEntriesBySelfTag(path);

        for (const { key } of allPathCaches) {
          stateManager.setCache(key, { stale: true });
        }
      }

      pendingFetches.clear();
      fetchingDirection = null;

      if (requestOverride && Object.keys(requestOverride).length > 0) {
        activeInitialRequest = shallowMergeRequest(
          initialRequest,
          requestOverride
        );
      } else {
        activeInitialRequest = initialRequest;
      }

      const newFirstPageKey = stateManager.createQueryKey({
        path,
        method,
        options: activeInitialRequest,
      });

      pageSubscriptions.forEach((unsub) => unsub());
      pageSubscriptions = [];
      pageKeys = [];
      pageRequests = new Map();
      latestError = undefined;

      fetchingDirection = "next";
      notify();

      abortController = new AbortController();
      const signal = abortController.signal;

      const context = createContext(newFirstPageKey, activeInitialRequest);

      if (force) {
        context.forceRefetch = true;
      }

      const coreFetch = async (): Promise<SpooshResponse<TData, TError>> => {
        try {
          const response = await fetchFn(context.request, signal);

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

          return {
            status: 0,
            error: err as TError,
            data: undefined,
          };
        }
      };

      const middlewarePromise = pluginExecutor.executeMiddleware(
        "infiniteRead",
        context,
        coreFetch
      );

      stateManager.setPendingPromise(newFirstPageKey, middlewarePromise);

      const finalResponse = await middlewarePromise;

      pendingFetches.delete(newFirstPageKey);
      fetchingDirection = null;
      stateManager.setPendingPromise(newFirstPageKey, undefined);

      if (finalResponse.data !== undefined && !finalResponse.error) {
        pageKeys = [newFirstPageKey];
        pageRequests = new Map([[newFirstPageKey, activeInitialRequest]]);

        stateManager.setCache(newFirstPageKey, {
          state: {
            data: finalResponse.data,
            error: undefined,
            timestamp: Date.now(),
          },
          tags,
          stale: false,
        });

        subscribeToPages();
        latestError = undefined;
      } else if (finalResponse.error) {
        latestError = finalResponse.error;
      }

      notify();
    },

    abort() {
      abortController?.abort();
      abortController = null;
    },

    mount() {
      cachedState = computeState();
      subscribeToPages();

      const firstPageKey = stateManager.createQueryKey({
        path,
        method,
        options: initialRequest,
      });

      const context = createContext(firstPageKey, initialRequest);
      pluginExecutor.executeLifecycle("onMount", "infiniteRead", context);

      refetchUnsubscribe = eventEmitter.on("refetch", (event) => {
        if (pageKeys.includes(event.queryKey)) {
          controller.trigger();
        }
      });
    },

    unmount() {
      const firstPageKey = stateManager.createQueryKey({
        path,
        method,
        options: initialRequest,
      });

      const context = createContext(firstPageKey, initialRequest);
      pluginExecutor.executeLifecycle("onUnmount", "infiniteRead", context);

      pageSubscriptions.forEach((unsub) => unsub());
      pageSubscriptions = [];
      refetchUnsubscribe?.();
      refetchUnsubscribe = null;
    },

    update(previousContext) {
      const firstPageKey = stateManager.createQueryKey({
        path,
        method,
        options: activeInitialRequest,
      });

      const context = createContext(firstPageKey, activeInitialRequest);
      pluginExecutor.executeUpdateLifecycle(
        "infiniteRead",
        context,
        previousContext
      );
    },

    getContext() {
      const firstPageKey = stateManager.createQueryKey({
        path,
        method,
        options: activeInitialRequest,
      });

      return createContext(firstPageKey, activeInitialRequest);
    },

    setPluginOptions(opts) {
      pluginOptions = opts;
    },
  };

  return controller;
}
