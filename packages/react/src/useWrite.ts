import { useSyncExternalStore, useRef, useCallback, useState } from "react";
import {
  type EnlaceResponse,
  type PluginExecutor,
  type StateManager,
  type EventEmitter,
  type MergePluginOptions,
  type MergePluginResults,
  type EnlacePlugin,
  type PluginTypeConfig,
  createOperationController,
} from "enlace";
import { createTrackingProxy, type TrackingResult } from "./trackingProxy";
import type {
  ResolveSchemaTypes,
  BaseWriteResult,
  WriteApiClient,
  ExtractMethodData,
  ExtractMethodError,
  ExtractMethodOptions,
  ExtractResponseQuery,
  ExtractResponseBody,
  ExtractResponseFormData,
  ExtractResponseParamNames,
  WriteResponseInputFields,
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
  const { api, stateManager, pluginExecutor, eventEmitter } = options;

  type PluginOptions = MergePluginOptions<TPlugins>;
  type PluginResults = MergePluginResults<TPlugins>;

  type InferError<T> = [T] extends [unknown] ? TDefaultError : T;

  return function useWrite<
    TMethod extends (
      ...args: never[]
    ) => Promise<EnlaceResponse<unknown, unknown>>,
  >(
    writeFn: (api: WriteApiClient<TSchema, TDefaultError>) => TMethod
  ): BaseWriteResult<
    ExtractMethodData<TMethod>,
    InferError<ExtractMethodError<TMethod>>,
    ExtractMethodOptions<TMethod> &
      ResolveSchemaTypes<PluginOptions["write"], TSchema>
  > &
    WriteResponseInputFields<
      ExtractResponseQuery<TMethod>,
      ExtractResponseBody<TMethod>,
      ExtractResponseFormData<TMethod>,
      ExtractResponseParamNames<TMethod>
    > &
    PluginResults["write"] {
    type TData = ExtractMethodData<TMethod>;
    type TError = InferError<ExtractMethodError<TMethod>>;
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

    const queryKey = stateManager.createQueryKey({
      path: selectorPath,
      method: selectorMethod,
      options: undefined,
    });

    const controllerRef = useRef<{
      controller: ReturnType<typeof createOperationController<TData, TError>>;
      queryKey: string;
    } | null>(null);

    // Recreate controller when path changes (e.g., api.posts[postId].$delete)
    if (!controllerRef.current || controllerRef.current.queryKey !== queryKey) {
      controllerRef.current = {
        controller: createOperationController<TData, TError>({
          operationType: "write",
          path: selectorPath,
          method: selectorMethod as "POST" | "PUT" | "PATCH" | "DELETE",
          tags: [],
          stateManager,
          eventEmitter,
          pluginExecutor,
          fetchFn: async (fetchOpts) => {
            const params = (
              fetchOpts as { params?: Record<string, string | number> }
            )?.params;
            const resolvedPath = resolvePath(selectorPath, params);

            let current: unknown = api;

            for (const segment of resolvedPath) {
              current = (current as Record<string, unknown>)[segment];
            }

            const method = (current as Record<string, unknown>)[
              selectorMethod
            ] as (o?: unknown) => Promise<EnlaceResponse<TData, TError>>;

            return method(fetchOpts);
          },
        }),
        queryKey,
      };
    }

    const controller = controllerRef.current.controller;

    const state = useSyncExternalStore(
      controller.subscribe,
      controller.getState,
      controller.getState
    );

    const [lastTriggerOptions, setLastTriggerOptions] = useState<
      TOptions | undefined
    >(undefined);

    const reset = useCallback(() => {
      stateManager.deleteCache(queryKey);
    }, [queryKey]);

    const abort = useCallback(() => {
      controller.abort();
    }, []);

    const trigger = useCallback(
      async (
        triggerOptions?: TOptions
      ): Promise<EnlaceResponse<TData, TError>> => {
        setLastTriggerOptions(triggerOptions);

        const params = (
          triggerOptions as
            | { params?: Record<string, string | number> }
            | undefined
        )?.params;
        const resolvedPath = resolvePath(selectorPath, params);
        const tags = resolveTags(triggerOptions, resolvedPath);

        controller.setPluginOptions({ ...triggerOptions, tags });

        return controller.execute(triggerOptions, { force: true });
      },
      [selectorPath]
    );

    const entry = stateManager.getCache(queryKey);
    const pluginResultData = entry?.pluginResult
      ? Object.fromEntries(entry.pluginResult)
      : {};

    const opts = lastTriggerOptions as Record<string, unknown> | undefined;
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
      trigger,
      ...state,
      ...pluginResultData,
      ...inputField,
      data: state.data as TData | undefined,
      error: state.error as TError | undefined,
      reset,
      abort,
    };

    return result as unknown as BaseWriteResult<TData, TError, TOptions> &
      WriteResponseInputFields<
        ExtractResponseQuery<TMethod>,
        ExtractResponseBody<TMethod>,
        ExtractResponseFormData<TMethod>,
        ExtractResponseParamNames<TMethod>
      > &
      PluginResults["write"];
  };
}
