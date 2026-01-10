import { useRef, useCallback, useState } from "react";
import {
  type EnlaceResponse,
  type PluginExecutor,
  type StateManager,
  type EventEmitter,
  type PluginContext,
  type OperationState,
  type MergePluginOptions,
  type MergePluginResults,
  type EnlacePlugin,
  type PluginTypeConfig,
} from "enlace";
import { createTrackingProxy, type TrackingResult } from "./trackingProxy";
import type {
  ResolveSchemaTypes,
  BaseWriteResult,
  WriteApiClient,
  ExtractMethodData,
  ExtractMethodError,
  ExtractMethodOptions,
} from "./types";
import { resolvePath, resolveTags } from "./utils";

export type CreateUseWriteOptions = {
  api: unknown;
  stateManager: StateManager;
  eventEmitter: EventEmitter;
  pluginExecutor: PluginExecutor;
};

export function createUseWrite<
  TSchema,
  TDefaultError,
  TPlugins extends readonly EnlacePlugin<PluginTypeConfig>[],
>(options: CreateUseWriteOptions) {
  const { api, stateManager, eventEmitter, pluginExecutor } = options;

  type PluginOptions = MergePluginOptions<TPlugins>;
  type PluginResults = MergePluginResults<TPlugins>;

  return function useWrite<
    TMethod extends (
      ...args: never[]
    ) => Promise<EnlaceResponse<unknown, unknown>>,
  >(
    writeFn: (api: WriteApiClient<TSchema, TDefaultError>) => TMethod
  ): BaseWriteResult<
    ExtractMethodData<TMethod>,
    ExtractMethodError<TMethod>,
    ExtractMethodOptions<TMethod> &
      ResolveSchemaTypes<PluginOptions["write"], TSchema>
  > &
    PluginResults["write"] {
    type TData = ExtractMethodData<TMethod>;
    type TError = ExtractMethodError<TMethod>;
    type TOptions = ExtractMethodOptions<TMethod> &
      ResolveSchemaTypes<PluginOptions["write"], TSchema>;

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
      async (
        triggerOptions?: TOptions
      ): Promise<EnlaceResponse<TData, TError>> => {
        setState((prev) => ({ ...prev, loading: true, error: undefined }));

        abortControllerRef.current = new AbortController();
        const signal = abortControllerRef.current.signal;

        const requestOptions = triggerOptions as
          | { params?: Record<string, string | number> }
          | undefined;
        const resolvedPath = resolvePath(selectorPath, requestOptions?.params);
        const tags = resolveTags(triggerOptions, resolvedPath);

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

          return pluginExecutor.createContext<TData, TError>({
            operationType: "write",
            path: selectorPath,
            method: selectorMethod as "POST" | "PUT" | "PATCH" | "DELETE",
            queryKey: JSON.stringify({
              path: selectorPath,
              method: selectorMethod,
              options: triggerOptions,
            }),
            tags,
            requestTimestamp: Date.now(),
            requestOptions: triggerOptions ?? {},
            state: initialState,
            metadata: new Map(),
            pluginOptions: triggerOptions,
            abort: () => abortControllerRef.current?.abort(),
            stateManager,
            eventEmitter,
          });
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
            ...(triggerOptions as Record<string, unknown>),
            signal,
          });
          context.response = response;

          context = await pluginExecutor.execute(
            "afterFetch",
            "write",
            context
          );

          if (response.error) {
            setState({
              loading: false,
              data: undefined,
              error: response.error,
            });
            context = await pluginExecutor.execute("onError", "write", context);
          } else {
            setState({ loading: false, data: response.data, error: undefined });
            context = await pluginExecutor.execute(
              "onSuccess",
              "write",
              context
            );
          }

          return response;
        } catch (err) {
          const errorResponse: EnlaceResponse<TData, TError> = {
            status: 0,
            error: err as TError,
            data: undefined,
          };

          context.response = errorResponse;
          setState({ loading: false, data: undefined, error: err as TError });
          context = await pluginExecutor.execute("onError", "write", context);

          return errorResponse;
        }
      },
      [selectorPath, selectorMethod]
    );

    const result = {
      trigger,
      loading: state.loading,
      data: state.data,
      error: state.error,
      reset,
      abort,
    };

    return result as unknown as BaseWriteResult<TData, TError, TOptions> &
      PluginResults["write"];
  };
}
