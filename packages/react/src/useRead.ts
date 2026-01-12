import {
  useSyncExternalStore,
  useRef,
  useEffect,
  useCallback,
  useId,
} from "react";
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
  type SelectorResult,
  createOperationController,
  createSelectorProxy,
  resolvePath,
  resolveTags,
} from "enlace";
import type {
  BaseReadOptions,
  BaseReadResult,
  ReadApiClient,
  ExtractResponseQuery,
  ExtractResponseBody,
  ExtractResponseFormData,
  ExtractResponseParamNames,
  ResponseInputFields,
} from "./types";

export type CreateUseReadOptions = {
  api: unknown;
  stateManager: StateManager;
  eventEmitter: EventEmitter;
  pluginExecutor: PluginExecutor;
};

export function createUseRead<
  TSchema,
  TDefaultError,
  TPlugins extends readonly EnlacePlugin<PluginTypeConfig>[],
>(options: CreateUseReadOptions) {
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
  >(
    readFn: TReadFn,
    readOptions?: BaseReadOptions & PluginOptions["read"]
  ): BaseReadResult<ExtractData<TReadFn>, InferError<ExtractError<TReadFn>>> &
    ResponseInputFields<
      ExtractResponseQuery<TReadFn>,
      ExtractResponseBody<TReadFn>,
      ExtractResponseFormData<TReadFn>,
      ExtractResponseParamNames<TReadFn>
    > &
    PluginResults["read"] {
    const {
      enabled = true,
      tags,
      additionalTags,
      ...pluginOpts
    } = readOptions ?? {};

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
        "useRead requires calling an HTTP method ($get). " +
          "Example: useRead((api) => api.posts.$get())"
      );
    }

    const requestOptions = capturedCall.options as
      | { params?: Record<string, string | number> }
      | undefined;

    const resolvedPath = resolvePath(capturedCall.path, requestOptions?.params);
    const resolvedTags = resolveTags({ tags, additionalTags }, resolvedPath);

    const queryKey = stateManager.createQueryKey({
      path: capturedCall.path,
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

    // Store previous context before creating new controller
    if (controllerRef.current && controllerRef.current.queryKey !== queryKey) {
      lifecycleRef.current.prevContext =
        controllerRef.current.controller.getContext();
    }

    // Recreate controller when queryKey changes
    if (!controllerRef.current || controllerRef.current.queryKey !== queryKey) {
      const controller = createOperationController<TData, TError>({
        operationType: "read",
        path: capturedCall.path,
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
          let current: unknown = api;

          for (const segment of resolvedPath) {
            current = (current as Record<string, unknown>)[segment];
          }

          const method = (current as Record<string, unknown>)[
            capturedCall.method
          ] as (o?: unknown) => Promise<EnlaceResponse<TData, TError>>;

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

    const abortRef = useRef(controller.abort);
    abortRef.current = controller.abort;

    const pluginOptsKey = JSON.stringify(pluginOpts);

    // Unmount effect - runs on unmount (including StrictMode simulated unmount)
    useEffect(() => {
      return () => {
        controllerRef.current?.controller.unmount();
        lifecycleRef.current.initialized = false;
      };
    }, []);

    // Main lifecycle effect
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

      controller.execute();

      const unsubRefetch = eventEmitter.on("refetch", (event) => {
        if (event.queryKey === queryKey) {
          controller.execute(undefined, { force: true });
        }
      });

      const unsubInvalidate = eventEmitter.on(
        "invalidate",
        (invalidatedTags) => {
          const hasMatch = invalidatedTags.some((tag) =>
            resolvedTags.includes(tag)
          );

          if (hasMatch) {
            controller.execute(undefined, { force: true });
          }
        }
      );

      return () => {
        unsubRefetch();
        unsubInvalidate();
      };
    }, [queryKey, enabled]);

    // Plugin options change effect
    useEffect(() => {
      if (!enabled || !lifecycleRef.current.initialized) return;

      const prevContext = controller.getContext();
      controller.update(prevContext);
    }, [pluginOptsKey]);

    const abort = useCallback(() => {
      abortRef.current();
    }, []);

    const refetch = useCallback(() => {
      return controller.execute(undefined, { force: true });
    }, []);

    const entry = stateManager.getCache(queryKey);
    const pluginResultData = entry?.pluginResult
      ? Object.fromEntries(entry.pluginResult)
      : {};

    const opts = capturedCall.options as Record<string, unknown> | undefined;
    const inputInner: Record<string, unknown> = {};

    if (opts?.query !== undefined) {
      inputInner.query = opts.query;
    }

    if (opts?.body !== undefined) {
      inputInner.body = opts.body;
    }

    if (opts?.formData !== undefined) {
      inputInner.formData = opts.formData;
    }

    if (opts?.params !== undefined) {
      inputInner.params = opts.params;
    }

    const inputField =
      Object.keys(inputInner).length > 0 ? { input: inputInner } : {};

    const result = {
      ...state,
      ...pluginResultData,
      ...inputField,
      data: state.data as TData | undefined,
      error: state.error as TError | undefined,
      abort,
      refetch,
    };

    return result as unknown as BaseReadResult<TData, TError> &
      ResponseInputFields<
        ExtractResponseQuery<TReadFn>,
        ExtractResponseBody<TReadFn>,
        ExtractResponseFormData<TReadFn>,
        ExtractResponseParamNames<TReadFn>
      > &
      PluginResults["read"];
  };
}
