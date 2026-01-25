import {
  useSyncExternalStore,
  useRef,
  useEffect,
  useCallback,
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
  type SelectorResult,
  type ResolveResultTypes,
  createOperationController,
  createSelectorProxy,
  resolvePath,
  resolveTags,
} from "@spoosh/core";
import type {
  BaseReadOptions,
  BaseReadResult,
  ReadApiClient,
  ExtractResponseQuery,
  ExtractResponseBody,
  ExtractResponseParamNames,
  ResponseInputFields,
} from "../types";
import type { SpooshInstanceShape } from "../createReactSpoosh/types";

export function createUseRead<
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

  type InferError<T> = [T] extends [unknown] ? TDefaultError : T;
  type ExtractData<T> = T extends (
    ...args: unknown[]
  ) => Promise<{ data: infer D }>
    ? D
    : unknown;
  type ExtractError<T> = T extends (
    ...args: unknown[]
  ) => Promise<{ error: infer E }>
    ? E
    : unknown;

  return function useRead<
    TReadFn extends (
      api: ReadApiClient<TSchema, TDefaultError>
    ) => Promise<{ data?: unknown; error?: unknown }>,
    TReadOpts extends BaseReadOptions & PluginOptions["read"] =
      BaseReadOptions & PluginOptions["read"],
  >(
    readFn: TReadFn,
    readOptions?: TReadOpts
  ): BaseReadResult<
    ExtractData<TReadFn>,
    InferError<ExtractError<TReadFn>>,
    ResolveResultTypes<PluginResults["read"], TReadOpts>
  > &
    ResponseInputFields<
      ExtractResponseQuery<TReadFn>,
      ExtractResponseBody<TReadFn>,
      ExtractResponseParamNames<TReadFn>
    > {
    const { enabled = true, tags, ...pluginOpts } = readOptions ?? {};

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
        "useRead requires calling an HTTP method (GET). " +
          'Example: useRead((api) => api("posts").GET())'
      );
    }

    const requestOptions = capturedCall.options as
      | { params?: Record<string, string | number> }
      | undefined;

    const pathSegments = capturedCall.path.split("/").filter(Boolean);
    const resolvedPath = resolvePath(pathSegments, requestOptions?.params);
    const resolvedTags = resolveTags({ tags }, resolvedPath);

    const queryKey = stateManager.createQueryKey({
      path: pathSegments,
      method: capturedCall.method,
      options: capturedCall.options,
    });

    type TData = ExtractData<TReadFn>;
    type TError = InferError<ExtractError<TReadFn>>;

    const controllerRef = useRef<{
      controller: ReturnType<typeof createOperationController<TData, TError>>;
      queryKey: string;
    } | null>(null);

    const lifecycleRef = useRef<{
      initialized: boolean;
      prevContext: PluginContext<TData, TError> | null;
    }>({
      initialized: false,
      prevContext: null,
    });

    if (controllerRef.current && controllerRef.current.queryKey !== queryKey) {
      lifecycleRef.current.prevContext =
        controllerRef.current.controller.getContext();
    }

    if (!controllerRef.current || controllerRef.current.queryKey !== queryKey) {
      const controller = createOperationController<TData, TError>({
        operationType: "read",
        path: pathSegments,
        method: capturedCall.method as "GET",
        tags: resolvedTags,
        requestOptions: capturedCall.options as
          | Record<string, unknown>
          | undefined,
        stateManager,
        eventEmitter,
        pluginExecutor,
        hookId,
        fetchFn: async (fetchOpts) => {
          const pathMethods = (
            api as (path: string) => Record<string, unknown>
          )(capturedCall.path);
          const method = pathMethods[capturedCall.method] as (
            o?: unknown
          ) => Promise<SpooshResponse<TData, TError>>;

          return method(fetchOpts);
        },
      });

      controllerRef.current = { controller, queryKey };
    }

    const controller = controllerRef.current.controller;

    controller.setPluginOptions(pluginOpts);

    const state = useSyncExternalStore(
      controller.subscribe,
      controller.getState,
      controller.getState
    );

    const [requestState, setRequestState] = useState<{
      isPending: boolean;
      error: TError | undefined;
    }>(() => {
      const cachedEntry = stateManager.getCache(queryKey);
      const hasCachedData = cachedEntry?.state?.data !== undefined;
      return { isPending: enabled && !hasCachedData, error: undefined };
    });

    const abortRef = useRef(controller.abort);
    abortRef.current = controller.abort;

    const pluginOptsKey = JSON.stringify(pluginOpts);

    const executeWithTracking = useCallback(
      async (force = false) => {
        setRequestState((prev) => ({ ...prev, isPending: true }));

        try {
          const response = await controller.execute(undefined, { force });

          if (response.error) {
            setRequestState({ isPending: false, error: response.error });
          } else {
            setRequestState({ isPending: false, error: undefined });
          }

          return response;
        } catch (err) {
          setRequestState({ isPending: false, error: err as TError });
          throw err;
        }
      },
      [controller]
    );

    useEffect(() => {
      return () => {
        controllerRef.current?.controller.unmount();
        lifecycleRef.current.initialized = false;
      };
    }, []);

    useEffect(() => {
      if (!enabled) return;

      const { initialized, prevContext } = lifecycleRef.current;

      if (!initialized) {
        controller.mount();
        lifecycleRef.current.initialized = true;
      } else if (prevContext) {
        controller.update(prevContext);
        lifecycleRef.current.prevContext = null;
      }

      executeWithTracking(false);

      const unsubRefetch = eventEmitter.on("refetch", (event) => {
        if (event.queryKey === queryKey) {
          executeWithTracking(true);
        }
      });

      const unsubInvalidate = eventEmitter.on(
        "invalidate",
        (invalidatedTags) => {
          const hasMatch = invalidatedTags.some((tag) =>
            resolvedTags.includes(tag)
          );

          if (hasMatch) {
            executeWithTracking(true);
          }
        }
      );

      return () => {
        unsubRefetch();
        unsubInvalidate();
      };
    }, [queryKey, enabled]);

    useEffect(() => {
      if (!enabled || !lifecycleRef.current.initialized) return;

      const prevContext = controller.getContext();
      controller.update(prevContext);
    }, [pluginOptsKey]);

    const abort = useCallback(() => {
      abortRef.current();
    }, []);

    const refetch = useCallback(() => {
      return executeWithTracking(true);
    }, [executeWithTracking]);

    const entry = stateManager.getCache(queryKey);
    const pluginResultData = entry?.meta ? Object.fromEntries(entry.meta) : {};

    const opts = capturedCall.options as Record<string, unknown> | undefined;
    const inputInner: Record<string, unknown> = {};

    if (opts?.query !== undefined) {
      inputInner.query = opts.query;
    }

    if (opts?.body !== undefined) {
      inputInner.body = opts.body;
    }

    if (opts?.params !== undefined) {
      inputInner.params = opts.params;
    }

    const inputField =
      Object.keys(inputInner).length > 0 ? { input: inputInner } : {};

    const hasData = state.data !== undefined;
    const loading = requestState.isPending && !hasData;
    const fetching = requestState.isPending;

    const result = {
      meta: pluginResultData,
      ...inputField,
      data: state.data as TData | undefined,
      error: requestState.error ?? (state.error as TError | undefined),
      loading,
      fetching,
      abort,
      refetch,
    };

    return result as unknown as BaseReadResult<
      TData,
      TError,
      ResolveResultTypes<PluginResults["read"], TReadOpts>
    > &
      ResponseInputFields<
        ExtractResponseQuery<TReadFn>,
        ExtractResponseBody<TReadFn>,
        ExtractResponseParamNames<TReadFn>
      >;
  };
}
