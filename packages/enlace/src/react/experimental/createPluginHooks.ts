import { useSyncExternalStore, useRef, useEffect, useCallback } from "react";
import {
  enlace,
  type EnlaceOptions,
  type EnlacePlugin,
  type EnlaceResponse,
  type QueryOnlyClient,
  type PollingInterval,
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

export type UseReadOptions<TData = unknown, TError = unknown> = {
  enabled?: boolean;
  staleTime?: number;
  pollingInterval?: PollingInterval<TData, TError>;
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

type ReadApiClient<TSchema, TDefaultError> = QueryOnlyClient<
  TSchema,
  TDefaultError,
  ReactOptionsMap
>;

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
    options?: UseReadOptions<TData, TError>
  ): UseReadResult<TData, TError> {
    const opts = options ?? ({} as UseReadOptions<TData, TError>);
    const { enabled = true, staleTime = 0, pollingInterval } = opts;

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
    controller.setMetadata("staleTime", staleTime);
    controller.setMetadata("pluginOptions", { pollingInterval });

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

  return {
    useRead,
    api,
    stateManager,
    pluginExecutor,
  };
}
