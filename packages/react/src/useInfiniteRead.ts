import { useRef, useEffect, useSyncExternalStore } from "react";
import {
  type EnlaceResponse,
  type PluginExecutor,
  type StateManager,
  type EventEmitter,
  type MergePluginOptions,
  type MergePluginResults,
  type EnlacePlugin,
  type PluginTypeConfig,
  type InfiniteRequestOptions,
  createInfiniteReadController,
} from "enlace";
import { createTrackingProxy, type TrackingResult } from "./trackingProxy";
import type {
  BaseInfiniteReadOptions,
  BaseInfiniteReadResult,
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
      PluginOptions["infiniteRead"]
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

    const initialRequest: InfiniteRequestOptions = {
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

    const canFetchNextRef = useRef(canFetchNext);
    const canFetchPrevRef = useRef(canFetchPrev);
    const nextPageRequestRef = useRef(nextPageRequest);
    const prevPageRequestRef = useRef(prevPageRequest);
    const mergerRef = useRef(merger);

    canFetchNextRef.current = canFetchNext;
    canFetchPrevRef.current = canFetchPrev;
    nextPageRequestRef.current = nextPageRequest;
    prevPageRequestRef.current = prevPageRequest;
    mergerRef.current = merger;

    const queryKey = stateManager.createQueryKey({
      path: trackedCall.path,
      method: trackedCall.method,
      options: baseOptionsForKey,
    });

    const controllerRef = useRef<{
      controller: ReturnType<
        typeof createInfiniteReadController<TData, TItem, TError, TRequest>
      >;
      queryKey: string;
    } | null>(null);

    // Recreate controller when queryKey changes
    if (!controllerRef.current || controllerRef.current.queryKey !== queryKey) {
      controllerRef.current = {
        controller: createInfiniteReadController<
          TData,
          TItem,
          TError,
          TRequest
        >({
          path: trackedCall.path,
          method: trackedCall.method as "GET",
          tags: resolvedTags,
          initialRequest,
          baseOptionsForKey,
          canFetchNext: (ctx) => canFetchNextRef.current(ctx),
          canFetchPrev: canFetchPrev
            ? (ctx) => canFetchPrevRef.current?.(ctx) ?? false
            : undefined,
          nextPageRequest: (ctx) => nextPageRequestRef.current(ctx),
          prevPageRequest: prevPageRequest
            ? (ctx) => prevPageRequestRef.current?.(ctx) ?? {}
            : undefined,
          merger: (responses) => mergerRef.current(responses),
          stateManager,
          eventEmitter,
          pluginExecutor,
          fetchFn: async (opts, signal) => {
            const fetchPath = resolvePath(trackedCall.path, opts.params);

            let current: unknown = api;

            for (const segment of fetchPath) {
              current = (current as Record<string, unknown>)[segment];
            }

            const method = (current as Record<string, unknown>)[
              trackedCall.method
            ] as (opts?: unknown) => Promise<EnlaceResponse<TData, TError>>;

            const fetchOptions = {
              ...(trackedCall.options as object),
              query: opts.query,
              params: opts.params,
              body: opts.body,
              signal,
            };

            return method(fetchOptions);
          },
        }),
        queryKey,
      };
    }

    const controller = controllerRef.current.controller;

    controller.setPluginOptions(pluginOpts);

    const state = useSyncExternalStore(
      controller.subscribe,
      controller.getState,
      controller.getState
    );

    const mountedRef = useRef(false);

    useEffect(() => {
      controller.mount();
      mountedRef.current = true;

      return () => {
        controller.unmount();
        mountedRef.current = false;
      };
    }, []);

    useEffect(() => {
      if (!mountedRef.current) return;

      if (enabled) {
        const currentState = controller.getState();

        if (currentState.data === undefined && !currentState.fetching) {
          controller.fetchNext();
        }
      }
    }, [enabled]);

    useEffect(() => {
      if (!enabled) return;

      controller.updateOptions();
    }, [JSON.stringify(pluginOpts)]);

    const result = {
      data: state.data,
      allResponses: state.allResponses,
      loading: state.loading,
      fetching: state.fetching,
      fetchingNext: state.fetchingNext,
      fetchingPrev: state.fetchingPrev,
      canFetchNext: state.canFetchNext,
      canFetchPrev: state.canFetchPrev,
      fetchNext: controller.fetchNext,
      fetchPrev: controller.fetchPrev,
      refetch: controller.refetch,
      abort: controller.abort,
      error: state.error,
    };

    return result as BaseInfiniteReadResult<TData, TError, TItem> &
      PluginResults["read"];
  };
}
