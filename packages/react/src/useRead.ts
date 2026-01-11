import { useSyncExternalStore, useRef, useEffect, useCallback } from "react";
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
  BaseReadOptions,
  ResolveDataTypes,
  BaseReadResult,
  ReadApiClient,
  ExtractResponseQuery,
  ExtractResponseBody,
  ExtractResponseFormData,
  ExtractResponseParamNames,
  ResponseInputFields,
} from "./types";
import { resolvePath, resolveTags } from "./utils";

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
    readOptions?: BaseReadOptions &
      ResolveDataTypes<
        PluginOptions["read"],
        ExtractData<TReadFn>,
        InferError<ExtractError<TReadFn>>
      >
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
    const resolvedTags = resolveTags({ tags, additionalTags }, resolvedPath);

    const queryKey = stateManager.createQueryKey({
      path: trackedCall.path,
      method: trackedCall.method,
      options: trackedCall.options,
    });

    const controllerRef = useRef<{
      controller: ReturnType<typeof createOperationController>;
      queryKey: string;
    } | null>(null);

    type TData = ExtractData<TReadFn>;
    type TError = InferError<ExtractError<TReadFn>>;

    // Recreate controller when queryKey changes
    if (!controllerRef.current || controllerRef.current.queryKey !== queryKey) {
      const controller = createOperationController<TData, TError>({
        operationType: "read",
        path: trackedCall.path,
        method: trackedCall.method as "GET",
        tags: resolvedTags,
        requestOptions: trackedCall.options as
          | Record<string, unknown>
          | undefined,
        stateManager,
        eventEmitter,
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

    useEffect(() => {
      if (!enabled) return;

      controller.mount();
      controller.execute();

      const unsubscribe = eventEmitter.on("refetch", (event) => {
        if (event.queryKey === queryKey) {
          controller.execute(undefined, { force: true });
        }
      });

      return () => {
        controller.unmount();
        unsubscribe();
      };
    }, [queryKey, enabled]);

    useEffect(() => {
      if (!enabled) return;

      controller.updateOptions();
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

    const inputFields: Record<string, unknown> = {};
    const opts = trackedCall.options as Record<string, unknown> | undefined;

    if (opts?.query !== undefined) {
      inputFields.query = opts.query;
    }

    if (opts?.body !== undefined) {
      inputFields.body = opts.body;
    }

    if (opts?.formData !== undefined) {
      inputFields.formData = opts.formData;
    }

    if (opts?.params !== undefined) {
      inputFields.params = opts.params;
    }

    const result = {
      ...state,
      ...pluginResultData,
      ...inputFields,
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
