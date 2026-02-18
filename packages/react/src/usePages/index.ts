import {
  useRef,
  useEffect,
  useSyncExternalStore,
  useId,
  useState,
  useCallback,
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
  type InfiniteNextContext,
  type InfinitePrevContext,
  type InfinitePage,
  createInfiniteReadController,
  createSelectorProxy,
  resolvePath,
  resolveTags,
} from "@spoosh/core";
import type {
  BasePagesOptions,
  BasePagesResult,
  PagesApiClient,
} from "./types";
import type { SpooshInstanceShape } from "../create/types";

export function createUsePages<
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

  return function usePages<
    TData,
    TItem,
    TError = TDefaultError,
    TRequest extends InfiniteRequestOptions = InfiniteRequestOptions,
  >(
    readFn: (
      api: PagesApiClient<TSchema, TDefaultError>
    ) => Promise<SpooshResponse<TData, TError>>,
    readOptions: BasePagesOptions<
      TData,
      TItem,
      TError,
      TRequest,
      PluginResults["read"]
    > &
      PluginOptions["pages"]
  ): BasePagesResult<TData, TError, TItem, PluginResults["read"]> {
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

    const instanceId = useId();

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
        "usePages requires calling an HTTP method (GET). " +
          'Example: usePages((api) => api("posts").GET())'
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
      path: capturedCall.path,
      method: capturedCall.method,
      options: capturedCall.options,
    });

    const lifecycleRef = useRef<{
      initialized: boolean;
      prevContext: PluginContext | null;
      lastQueryKey: string | null;
    }>({
      initialized: false,
      prevContext: null,
      lastQueryKey: null,
    });

    const controllerRef = useRef<{
      controller: ReturnType<
        typeof createInfiniteReadController<
          TData,
          TItem,
          TError,
          TRequest,
          PluginResults["read"]
        >
      >;
      queryKey: string;
    } | null>(null);

    const queryKeyChanged =
      controllerRef.current !== null &&
      controllerRef.current.queryKey !== queryKey;

    if (queryKeyChanged) {
      lifecycleRef.current.prevContext =
        controllerRef.current!.controller.getContext();
      lifecycleRef.current.initialized = false;
    }

    if (!controllerRef.current || queryKeyChanged) {
      controllerRef.current = {
        controller: createInfiniteReadController<
          TData,
          TItem,
          TError,
          TRequest,
          PluginResults["read"]
        >({
          path: capturedCall.path,
          method: capturedCall.method as "GET",
          tags: resolvedTags,
          initialRequest,
          canFetchNext: canFetchNext
            ? (
                ctx: InfiniteNextContext<
                  TData,
                  TError,
                  TRequest,
                  PluginResults["read"]
                >
              ) => canFetchNextRef.current?.(ctx) ?? false
            : undefined,
          canFetchPrev: canFetchPrev
            ? (
                ctx: InfinitePrevContext<
                  TData,
                  TError,
                  TRequest,
                  PluginResults["read"]
                >
              ) => canFetchPrevRef.current?.(ctx) ?? false
            : undefined,
          nextPageRequest: nextPageRequest
            ? (
                ctx: InfiniteNextContext<
                  TData,
                  TError,
                  TRequest,
                  PluginResults["read"]
                >
              ) => nextPageRequestRef.current?.(ctx) ?? {}
            : undefined,
          prevPageRequest: prevPageRequest
            ? (
                ctx: InfinitePrevContext<
                  TData,
                  TError,
                  TRequest,
                  PluginResults["read"]
                >
              ) => prevPageRequestRef.current?.(ctx) ?? {}
            : undefined,
          merger: (
            pages: InfinitePage<TData, TError, PluginResults["read"]>[]
          ) => mergerRef.current(pages),
          stateManager,
          eventEmitter,
          pluginExecutor,
          instanceId,
          fetchFn: async (opts, signal) => {
            const pathMethods = (
              api as (path: string) => Record<string, unknown>
            )(capturedCall.path);
            const method = pathMethods[capturedCall.method] as (
              opts?: unknown
            ) => Promise<SpooshResponse<TData, TError>>;

            const fetchOptions = {
              ...(capturedCall.options as object),
              ...opts,
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

    const subscribe = useCallback(
      (callback: () => void) => controller.subscribe(callback),
      [controller]
    );

    const getSnapshot = useCallback(() => controller.getState(), [controller]);

    const state = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

    const [isPending, setIsPending] = useState(() => {
      return enabled && state.data === undefined;
    });

    const fetchingDirection = controller.getFetchingDirection();
    const fetching = fetchingDirection !== null;
    const fetchingNext = fetchingDirection === "next";
    const fetchingPrev = fetchingDirection === "prev";
    const hasData = state.data !== undefined;
    const loading = (isPending || fetching) && !hasData;

    const tagsKey = JSON.stringify(tags);

    useEffect(() => {
      return () => {
        controllerRef.current?.controller.unmount();
        lifecycleRef.current.initialized = false;
      };
    }, []);

    useEffect(() => {
      if (!enabled) return;

      const { initialized, prevContext, lastQueryKey } = lifecycleRef.current;
      const isQueryKeyChange =
        lastQueryKey !== null && lastQueryKey !== queryKey;

      if (!initialized) {
        controller.mount();
        lifecycleRef.current.initialized = true;

        if (prevContext) {
          controller.update(prevContext);
          lifecycleRef.current.prevContext = null;
        }
      }

      lifecycleRef.current.lastQueryKey = queryKey;

      const currentState = controller.getState();
      const isFetching = controller.getFetchingDirection() !== null;

      if (isQueryKeyChange) {
        setIsPending(true);
        controller.trigger({ force: false }).finally(() => setIsPending(false));
      } else if (currentState.data === undefined && !isFetching) {
        setIsPending(true);
        controller.fetchNext().finally(() => setIsPending(false));
      }

      const unsubInvalidate = eventEmitter.on(
        "invalidate",
        (invalidatedTags) => {
          const hasMatch = invalidatedTags.some((tag) =>
            resolvedTags.includes(tag)
          );

          if (hasMatch) {
            setIsPending(true);
            controller.trigger().finally(() => setIsPending(false));
          }
        }
      );

      const unsubRefetchAll = eventEmitter.on("refetchAll", () => {
        setIsPending(true);
        controller.trigger().finally(() => setIsPending(false));
      });

      return () => {
        controller.unmount();
        unsubInvalidate();
        unsubRefetchAll();
      };
    }, [queryKey, enabled, tagsKey]);

    const pluginOptsKey = JSON.stringify(pluginOpts);

    useEffect(() => {
      if (!enabled || !lifecycleRef.current.initialized) return;

      const prevContext = controller.getContext();
      controller.update(prevContext);
    }, [pluginOptsKey]);

    const trigger = async (
      options?: Partial<InfiniteRequestOptions> & { force?: boolean }
    ) => {
      await controller.trigger(options);
    };

    const result = {
      data: state.data,
      pages: state.pages,
      loading,
      fetching,
      fetchingNext,
      fetchingPrev,
      canFetchNext: state.canFetchNext,
      canFetchPrev: state.canFetchPrev,
      fetchNext: controller.fetchNext,
      fetchPrev: controller.fetchPrev,
      trigger,
      abort: controller.abort,
      error: state.error,
    };

    return result as BasePagesResult<
      TData,
      TError,
      TItem,
      PluginResults["read"]
    >;
  };
}
