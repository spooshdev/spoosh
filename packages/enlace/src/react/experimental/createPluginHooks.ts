import {
  useSyncExternalStore,
  useRef,
  useEffect,
  useCallback,
  useState,
} from "react";
import {
  enlace,
  type EnlaceOptions,
  type EnlacePlugin,
  type EnlaceResponse,
  type QueryOnlyClient,
  type CleanMutationOnlyClient,
  type PollingInterval,
  type DataAwareCallback,
  type DataAwareTransform,
  type PluginContext,
  type OperationState,
  createPluginExecutor,
  createStateManager,
  createOperationController,
  generateTags,
  type MergePluginOptions,
} from "enlace-core";
import { createTrackingProxy, type TrackingResult } from "../trackingProxy";
import type { ReactOptionsMap } from "../types/request.types";

export type PluginHooksConfig<
  TPlugins extends readonly EnlacePlugin<object, object, object>[],
> = {
  baseUrl: string;
  defaultOptions?: EnlaceOptions;
  plugins: TPlugins;
  autoGenerateTags?: boolean;
};

export type BaseReadOptions = {
  enabled?: boolean;
};

type ResolveDataTypes<TOptions, TData, TError> = {
  [K in keyof TOptions]: Extract<
    TOptions[K],
    (...args: never[]) => unknown
  > extends never
    ? TOptions[K]
    : TOptions[K] extends PollingInterval<unknown, unknown> | undefined
      ? PollingInterval<TData, TError> | undefined
      : TOptions[K] extends
            | DataAwareCallback<infer R, unknown, unknown>
            | undefined
        ? DataAwareCallback<R, TData, TError> | undefined
        : TOptions[K] extends DataAwareTransform<unknown, unknown> | undefined
          ? DataAwareTransform<TData, TError> | undefined
          : TOptions[K];
};

export type UseReadResult<TData, TError> = {
  loading: boolean;
  fetching: boolean;
  data: TData | undefined;
  error: TError | undefined;
  isOptimistic: boolean;
  isStale: boolean;
  abort: () => void;
};

export type UseWriteResult<TData, TError, TOptions> = {
  trigger: (options?: TOptions) => Promise<EnlaceResponse<TData, TError>>;
  loading: boolean;
  data: TData | undefined;
  error: TError | undefined;
  reset: () => void;
  abort: () => void;
};

type ReadApiClient<TSchema, TDefaultError> = QueryOnlyClient<
  TSchema,
  TDefaultError,
  ReactOptionsMap
>;

type WriteApiClient<TSchema, TDefaultError> = CleanMutationOnlyClient<
  TSchema,
  TDefaultError,
  ReactOptionsMap
>;

type ExtractMethodData<T> = T extends (
  ...args: never[]
) => Promise<EnlaceResponse<infer D, unknown>>
  ? D
  : unknown;

type ExtractMethodError<T> = T extends (
  ...args: never[]
) => Promise<EnlaceResponse<unknown, infer E>>
  ? E
  : unknown;

type ExtractMethodOptions<T> = T extends (...args: infer A) => unknown
  ? A[0]
  : never;

function resolvePath(
  path: string[],
  params: Record<string, string | number> | undefined
): string[] {
  if (!params) return path;

  return path.map((segment) => {
    if (segment.startsWith(":")) {
      const paramName = segment.slice(1);
      const value = params[paramName];

      if (value === undefined) {
        throw new Error(`Missing path parameter: ${paramName}`);
      }

      return String(value);
    }

    return segment;
  });
}

export function createPluginHooks<
  TSchema,
  TDefaultError = unknown,
  const TPlugins extends readonly EnlacePlugin<object, object, object>[] =
    readonly EnlacePlugin<object, object, object>[],
>(config: PluginHooksConfig<TPlugins>) {
  const {
    baseUrl,
    defaultOptions = {},
    plugins,
    autoGenerateTags = true,
  } = config;

  type PluginOptions = MergePluginOptions<TPlugins>;

  const api = enlace<TSchema, TDefaultError>(baseUrl, defaultOptions);
  const stateManager = createStateManager();
  const pluginExecutor = createPluginExecutor([...plugins]);

  function useRead<TData, TError = TDefaultError>(
    readFn: (
      api: ReadApiClient<TSchema, TDefaultError>
    ) => Promise<EnlaceResponse<TData, TError>>,
    options?: BaseReadOptions &
      ResolveDataTypes<PluginOptions["read"], TData, TError>
  ): UseReadResult<TData, TError> {
    const { enabled = true, ...pluginOpts } = options ?? {};

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
        "useRead requires calling an HTTP method ($get). " +
          "Example: useRead((api) => api.posts.$get())"
      );
    }

    const requestOptions = trackedCall.options as
      | { params?: Record<string, string | number> }
      | undefined;

    const resolvedPath = resolvePath(trackedCall.path, requestOptions?.params);
    const tags = autoGenerateTags ? generateTags(resolvedPath) : [];

    const queryKey = stateManager.createQueryKey({
      path: trackedCall.path,
      method: trackedCall.method,
      options: trackedCall.options,
    });

    const controllerRef = useRef<ReturnType<
      typeof createOperationController
    > | null>(null);

    if (!controllerRef.current) {
      const controller = createOperationController<TData, TError>({
        operationType: "read",
        path: trackedCall.path,
        method: trackedCall.method as "GET",
        tags,
        requestOptions: trackedCall.options as
          | Record<string, unknown>
          | undefined,
        stateManager,
        pluginExecutor,
        fetchFn: async (fetchOpts) => {
          let current: unknown = api;

          for (const segment of resolvedPath) {
            current = (current as Record<string, unknown>)[segment];
          }

          const method = (current as Record<string, unknown>)[
            trackedCall.method
          ] as (o?: unknown) => Promise<EnlaceResponse<TData, TError>>;

          return method(fetchOpts);
        },
      });

      controllerRef.current = controller;
    }

    const controller = controllerRef.current;

    // Update metadata on every render (options may change)
    controller.setMetadata("pluginOptions", pluginOpts);

    const state = useSyncExternalStore(
      controller.subscribe,
      controller.getState,
      controller.getState
    );

    const abortRef = useRef(controller.abort);
    abortRef.current = controller.abort;

    useEffect(() => {
      if (!enabled) return;

      controller.mount();
      controller.execute();

      return () => {
        controller.unmount();
      };
    }, [queryKey, enabled]);

    const abort = useCallback(() => {
      abortRef.current();
    }, []);

    return {
      loading: state.loading,
      fetching: state.fetching,
      data: state.data as TData | undefined,
      error: state.error as TError | undefined,
      isOptimistic: state.isOptimistic,
      isStale: state.isStale,
      abort,
    };
  }

  function useWrite<
    TMethod extends (
      ...args: never[]
    ) => Promise<EnlaceResponse<unknown, unknown>>,
  >(
    writeFn: (api: WriteApiClient<TSchema, TDefaultError>) => TMethod
  ): UseWriteResult<
    ExtractMethodData<TMethod>,
    ExtractMethodError<TMethod>,
    ExtractMethodOptions<TMethod> & PluginOptions["write"]
  > {
    type TData = ExtractMethodData<TMethod>;
    type TError = ExtractMethodError<TMethod>;
    type TOptions = ExtractMethodOptions<TMethod> & PluginOptions["write"];

    const trackingResultRef = useRef<TrackingResult>({
      trackedCall: null,
      selectorPath: null,
      selectorMethod: null,
    });

    const trackingProxy = createTrackingProxy<TSchema>((result) => {
      trackingResultRef.current = result;
    });

    (writeFn as (api: unknown) => unknown)(trackingProxy);

    const selectorPath = trackingResultRef.current.selectorPath;
    const selectorMethod = trackingResultRef.current.selectorMethod;

    if (!selectorPath || !selectorMethod) {
      throw new Error(
        "useWrite requires selecting an HTTP method ($post, $put, $patch, $delete). " +
          "Example: useWrite((api) => api.posts.$post)"
      );
    }

    const [state, setState] = useState<{
      loading: boolean;
      data: TData | undefined;
      error: TError | undefined;
    }>({
      loading: false,
      data: undefined,
      error: undefined,
    });

    const abortControllerRef = useRef<AbortController | null>(null);

    const reset = useCallback(() => {
      setState({ loading: false, data: undefined, error: undefined });
    }, []);

    const abort = useCallback(() => {
      abortControllerRef.current?.abort();
      abortControllerRef.current = null;
    }, []);

    const trigger = useCallback(
      async (options?: TOptions): Promise<EnlaceResponse<TData, TError>> => {
        setState((prev) => ({ ...prev, loading: true, error: undefined }));

        abortControllerRef.current = new AbortController();
        const signal = abortControllerRef.current.signal;

        const requestOptions = options as
          | { params?: Record<string, string | number> }
          | undefined;
        const resolvedPath = resolvePath(selectorPath, requestOptions?.params);
        const tags = autoGenerateTags ? generateTags(resolvedPath) : [];

        const createContext = (): PluginContext<TData, TError> => {
          const initialState: OperationState<TData, TError> = {
            loading: true,
            fetching: true,
            data: undefined,
            error: undefined,
            isOptimistic: false,
            isStale: true,
            timestamp: 0,
          };

          return {
            operationType: "write",
            path: selectorPath,
            method: selectorMethod as "POST" | "PUT" | "PATCH" | "DELETE",
            queryKey: JSON.stringify({
              path: selectorPath,
              method: selectorMethod,
              options,
            }),
            tags,
            requestOptions: options ?? {},
            state: initialState,
            metadata: new Map([["pluginOptions", options]]),
            abort: () => abortControllerRef.current?.abort(),
            getCache: () => undefined,
            setCache: () => {},
            invalidateTags: (t) => stateManager.invalidateByTags(t),
            subscribe: () => () => {},
            onInvalidate: (cb) => stateManager.onInvalidate(cb),
          };
        };

        let context = createContext();

        context = await pluginExecutor.execute("beforeFetch", "write", context);

        try {
          let current: unknown = api;

          for (const segment of resolvedPath) {
            current = (current as Record<string, unknown>)[segment];
          }

          const method = (current as Record<string, unknown>)[
            selectorMethod
          ] as (o?: unknown) => Promise<EnlaceResponse<TData, TError>>;

          const response = await method({
            ...(options as Record<string, unknown>),
            signal,
          });
          context.response = response;

          context = await pluginExecutor.execute(
            "afterFetch",
            "write",
            context
          );

          if (response.error) {
            context = await pluginExecutor.execute("onError", "write", context);
            setState({
              loading: false,
              data: undefined,
              error: response.error,
            });
          } else {
            context = await pluginExecutor.execute(
              "onSuccess",
              "write",
              context
            );
            setState({ loading: false, data: response.data, error: undefined });
          }

          return response;
        } catch (err) {
          const errorResponse: EnlaceResponse<TData, TError> = {
            status: 0,
            error: err as TError,
            data: undefined,
          };

          context.response = errorResponse;
          context = await pluginExecutor.execute("onError", "write", context);

          setState({ loading: false, data: undefined, error: err as TError });

          return errorResponse;
        }
      },
      [selectorPath, selectorMethod]
    );

    return {
      trigger,
      loading: state.loading,
      data: state.data,
      error: state.error,
      reset,
      abort,
    };
  }

  return {
    useRead,
    useWrite,
    api,
    stateManager,
    pluginExecutor,
  };
}
