import { useSyncExternalStore, useRef, useEffect, useCallback } from "react";
import {
  type EnlaceResponse,
  type PluginExecutor,
  type StateManager,
  type EventEmitter,
  type MergePluginOptions,
  type MergePluginResults,
  type EnlacePlugin,
  createOperationController,
} from "enlace";
import { createTrackingProxy, type TrackingResult } from "./trackingProxy";
import type {
  BaseReadOptions,
  ResolveDataTypes,
  BaseReadResult,
  ReadApiClient,
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
  TPlugins extends readonly EnlacePlugin<
    object,
    object,
    object,
    object,
    object
  >[],
>(options: CreateUseReadOptions) {
  const { api, stateManager, eventEmitter, pluginExecutor } = options;

  type PluginOptions = MergePluginOptions<TPlugins>;
  type PluginResults = MergePluginResults<TPlugins>;

  return function useRead<TData, TError = TDefaultError>(
    readFn: (
      api: ReadApiClient<TSchema, TDefaultError>
    ) => Promise<EnlaceResponse<TData, TError>>,
    readOptions?: BaseReadOptions &
      ResolveDataTypes<PluginOptions["read"], TData, TError>
  ): BaseReadResult<TData, TError> & PluginResults["read"] {
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

    const controllerRef = useRef<ReturnType<
      typeof createOperationController
    > | null>(null);

    if (!controllerRef.current) {
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

      controllerRef.current = controller;
    }

    const controller = controllerRef.current;

    controller.setMetadata("pluginOptions", pluginOpts);

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

      return () => {
        controller.unmount();
      };
    }, [queryKey, enabled]);

    useEffect(() => {
      if (!enabled) return;

      controller.updateOptions();
    }, [pluginOptsKey]);

    const abort = useCallback(() => {
      abortRef.current();
    }, []);

    const result = {
      ...state,
      data: state.data as TData | undefined,
      error: state.error as TError | undefined,
      abort,
    };

    return result as unknown as BaseReadResult<TData, TError> &
      PluginResults["read"];
  };
}
