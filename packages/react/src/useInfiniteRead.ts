import { useRef, useEffect, useSyncExternalStore, useId } from "react";
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
  type InfiniteRequestOptions,
  type SelectorResult,
  createInfiniteReadController,
  createSelectorProxy,
  resolvePath,
  resolveTags,
} from "enlace";
import type {
  BaseInfiniteReadOptions,
  BaseInfiniteReadResult,
  InfiniteReadApiClient,
  AnyInfiniteRequestOptions,
} from "./types";

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

    const hookId = useId();

    const selectorResultRef = useRef<SelectorResult>({
      call: null,
      selector: null,
    });

    const selectorProxy = createSelectorProxy<TSchema>((result) => {
      selectorResultRef.current = result;
    });

    (readFn as (api: unknown) => unknown)(selectorProxy);

    const capturedCall = selectorResultRef.current.call;

    if (!capturedCall) {
      throw new Error(
        "useInfiniteRead requires calling an HTTP method ($get). " +
          "Example: useInfiniteRead((api) => api.posts.$get())"
      );
    }

    const requestOptions = capturedCall.options as
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
      ...(capturedCall.options as object),
      query: undefined,
      params: undefined,
      body: undefined,
    };

    const resolvedPath = resolvePath(capturedCall.path, requestOptions?.params);
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
      path: capturedCall.path,
      method: capturedCall.method,
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
          path: capturedCall.path,
          method: capturedCall.method as "GET",
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
          hookId,
          fetchFn: async (opts, signal) => {
            const fetchPath = resolvePath(capturedCall.path, opts.params);

            let current: unknown = api;

            for (const segment of fetchPath) {
              current = (current as Record<string, unknown>)[segment];
            }

            const method = (current as Record<string, unknown>)[
              capturedCall.method
            ] as (opts?: unknown) => Promise<EnlaceResponse<TData, TError>>;

            const fetchOptions = {
              ...(capturedCall.options as object),
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

    const lifecycleRef = useRef<{
      initialized: boolean;
      prevContext: PluginContext | null;
    }>({
      initialized: false,
      prevContext: null,
    });

    // Unmount effect - runs on unmount (including StrictMode simulated unmount)
    useEffect(() => {
      return () => {
        controllerRef.current?.controller.unmount();
        lifecycleRef.current.initialized = false;
      };
    }, []);

    // Mount effect - runs once on first mount
    useEffect(() => {
      controller.mount();
      lifecycleRef.current.initialized = true;

      const unsubInvalidate = eventEmitter.on(
        "invalidate",
        (invalidatedTags) => {
          const hasMatch = invalidatedTags.some((tag) =>
            resolvedTags.includes(tag)
          );

          if (hasMatch) {
            controller.refetch();
          }
        }
      );

      return () => {
        unsubInvalidate();
      };
    }, []);

    useEffect(() => {
      if (!lifecycleRef.current.initialized) return;

      if (enabled) {
        const currentState = controller.getState();

        if (currentState.data === undefined && !currentState.fetching) {
          controller.fetchNext();
        }
      }
    }, [enabled]);

    useEffect(() => {
      if (!enabled || !lifecycleRef.current.initialized) return;

      const prevContext = controller.getContext();
      controller.update(prevContext);
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
