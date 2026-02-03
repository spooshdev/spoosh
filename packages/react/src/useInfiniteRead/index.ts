import {
  useRef,
  useEffect,
  useSyncExternalStore,
  useId,
  useState,
} from "react";
import {
  type SpooshResponse,
  type MergePluginOptions,
  type MergePluginResults,
  type SpooshPlugin,
  type PluginTypeConfig,
  type PluginContext,
  type InfiniteRequestOptions,
  type SelectorResult,
  createInfiniteReadController,
  createSelectorProxy,
  resolvePath,
  resolveTags,
} from "@spoosh/core";
import type {
  BaseInfiniteReadOptions,
  BaseInfiniteReadResult,
  InfiniteReadApiClient,
  AnyInfiniteRequestOptions,
} from "./types";
import type { SpooshInstanceShape } from "../createReactSpoosh/types";

export function createUseInfiniteRead<
  TSchema,
  TDefaultError,
  TPlugins extends readonly SpooshPlugin<PluginTypeConfig>[],
>(
  options: Omit<
    SpooshInstanceShape<unknown, TSchema, TDefaultError, TPlugins>,
    "_types"
  >
) {
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
    ) => Promise<SpooshResponse<TData, TError>>,
    readOptions: BaseInfiniteReadOptions<TData, TItem, TRequest> &
      PluginOptions["infiniteRead"]
  ): BaseInfiniteReadResult<TData, TError, TItem, PluginResults["read"]> {
    const {
      enabled = true,
      tags,
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
        "useInfiniteRead requires calling an HTTP method (GET). " +
          'Example: useInfiniteRead((api) => api("posts").GET())'
      );
    }

    const requestOptions = capturedCall.options as
      | {
          params?: Record<string, string | number>;
          query?: Record<string, unknown>;
          body?: unknown;
        }
      | undefined;

    const pathSegments = capturedCall.path.split("/").filter(Boolean);

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

    const resolvedPath = resolvePath(pathSegments, requestOptions?.params);
    const resolvedTags = resolveTags({ tags }, resolvedPath);

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
      path: pathSegments,
      method: capturedCall.method,
      options: baseOptionsForKey,
    });

    const controllerRef = useRef<{
      controller: ReturnType<
        typeof createInfiniteReadController<TData, TItem, TError, TRequest>
      >;
      queryKey: string;
    } | null>(null);

    if (!controllerRef.current || controllerRef.current.queryKey !== queryKey) {
      controllerRef.current = {
        controller: createInfiniteReadController<
          TData,
          TItem,
          TError,
          TRequest
        >({
          path: pathSegments,
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
            const pathMethods = (
              api as (path: string) => Record<string, unknown>
            )(capturedCall.path);
            const method = pathMethods[capturedCall.method] as (
              opts?: unknown
            ) => Promise<SpooshResponse<TData, TError>>;

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

    const [isPending, setIsPending] = useState(() => {
      return enabled && state.data === undefined;
    });

    const fetchingDirection = controller.getFetchingDirection();
    const fetching = fetchingDirection !== null;
    const fetchingNext = fetchingDirection === "next";
    const fetchingPrev = fetchingDirection === "prev";
    const hasData = state.data !== undefined;
    const loading = (isPending || fetching) && !hasData;

    const lifecycleRef = useRef<{
      initialized: boolean;
      prevContext: PluginContext | null;
    }>({
      initialized: false,
      prevContext: null,
    });

    const tagsKey = JSON.stringify(tags);

    useEffect(() => {
      return () => {
        controllerRef.current?.controller.unmount();
        lifecycleRef.current.initialized = false;
      };
    }, []);

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
            setIsPending(true);
            controller.refetch().finally(() => setIsPending(false));
          }
        }
      );

      return () => {
        unsubInvalidate();
      };
    }, [tagsKey]);

    useEffect(() => {
      if (!lifecycleRef.current.initialized) return;

      if (enabled) {
        const currentState = controller.getState();
        const isFetching = controller.getFetchingDirection() !== null;

        if (currentState.data === undefined && !isFetching) {
          setIsPending(true);
          controller.fetchNext().finally(() => setIsPending(false));
        }
      }
    }, [enabled]);

    useEffect(() => {
      if (!enabled || !lifecycleRef.current.initialized) return;

      const prevContext = controller.getContext();
      controller.update(prevContext);
    }, [JSON.stringify(pluginOpts)]);

    const entry = stateManager.getCache(queryKey);
    const pluginResultData = entry?.meta ? Object.fromEntries(entry.meta) : {};

    const result = {
      meta: pluginResultData,
      data: state.data,
      allResponses: state.allResponses,
      loading,
      fetching,
      fetchingNext,
      fetchingPrev,
      canFetchNext: state.canFetchNext,
      canFetchPrev: state.canFetchPrev,
      fetchNext: controller.fetchNext,
      fetchPrev: controller.fetchPrev,
      trigger: controller.refetch,
      abort: controller.abort,
      error: state.error,
    };

    return result as BaseInfiniteReadResult<
      TData,
      TError,
      TItem,
      PluginResults["read"]
    >;
  };
}
