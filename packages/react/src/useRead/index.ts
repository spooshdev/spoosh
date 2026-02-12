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
  type ResolverContext,
  type ResolveTypes,
  createOperationController,
  createSelectorProxy,
  resolvePath,
  resolveTags,
} from "@spoosh/core";
import type {
  BaseReadOptions,
  BaseReadResult,
  ReadApiClient,
  ResponseInputFields,
  TriggerOptions,
} from "./types";
import type {
  ExtractResponseQuery,
  ExtractResponseBody,
  ExtractResponseParamNames,
} from "../types/extraction";
import type { SpooshInstanceShape } from "../create/types";

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

  type ResolvedReadOptions<TReadFn> = BaseReadOptions &
    ResolveTypes<
      PluginOptions["read"],
      ResolverContext<
        TSchema,
        ExtractData<TReadFn>,
        InferError<ExtractError<TReadFn>>,
        ExtractResponseQuery<TReadFn>,
        ExtractResponseBody<TReadFn>,
        ExtractResponseParamNames<TReadFn> extends never
          ? never
          : Record<ExtractResponseParamNames<TReadFn>, string | number>
      >
    >;

  function useRead<
    TReadFn extends (
      api: ReadApiClient<TSchema, TDefaultError>
    ) => Promise<SpooshResponse<unknown, unknown>>,
    TReadOpts extends ResolvedReadOptions<TReadFn> =
      ResolvedReadOptions<TReadFn>,
  >(
    readFn: TReadFn,
    readOptions?: TReadOpts
  ): BaseReadResult<
    ExtractData<TReadFn>,
    InferError<ExtractError<TReadFn>>,
    ResolveResultTypes<MergePluginResults<TPlugins>["read"], TReadOpts>,
    TriggerOptions<TReadFn>
  > &
    ResponseInputFields<
      ExtractResponseQuery<TReadFn>,
      ExtractResponseBody<TReadFn>,
      ExtractResponseParamNames<TReadFn>
    >;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function useRead(readFn: any, readOptions?: any): any {
    const {
      enabled = true,
      tags,
      ...pluginOpts
    } = (readOptions ?? {}) as BaseReadOptions & PluginOptions["read"];

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
      path: capturedCall.path,
      method: capturedCall.method,
      options: capturedCall.options,
    });

    type TData = unknown;
    type TError = unknown;

    const controllerRef = useRef<{
      controller: ReturnType<typeof createOperationController<TData, TError>>;
      queryKey: string;
      baseQueryKey: string;
    } | null>(null);

    const lifecycleRef = useRef<{
      initialized: boolean;
      prevContext: PluginContext | null;
    }>({
      initialized: false,
      prevContext: null,
    });

    const baseQueryKeyChanged =
      controllerRef.current && controllerRef.current.baseQueryKey !== queryKey;

    if (baseQueryKeyChanged) {
      lifecycleRef.current.prevContext =
        controllerRef.current!.controller.getContext();
    }

    if (!controllerRef.current || baseQueryKeyChanged) {
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
        instanceId,
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

      controllerRef.current = { controller, queryKey, baseQueryKey: queryKey };
    }

    const controller = controllerRef.current.controller;

    controller.setPluginOptions(pluginOpts);

    const subscribe = useCallback(
      (callback: () => void) => {
        return controller.subscribe(callback);
      },
      [controller]
    );

    const getSnapshot = useCallback(() => {
      return controller.getState();
    }, [controller]);

    const state = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

    const [requestState, setRequestState] = useState<{
      isPending: boolean;
      error: TError | undefined;
    }>(() => {
      const cachedEntry = stateManager.getCache(queryKey);
      const hasCachedData = cachedEntry?.state?.data !== undefined;
      return { isPending: enabled && !hasCachedData, error: undefined };
    });

    const [, forceUpdate] = useState(0);

    const abortRef = useRef(controller.abort);
    abortRef.current = controller.abort;

    const pluginOptsKey = JSON.stringify(pluginOpts);
    const tagsKey = JSON.stringify(tags);

    const executeWithTracking = useCallback(
      async (force = false, overrideOptions?: Record<string, unknown>) => {
        setRequestState({ isPending: true, error: undefined });

        try {
          const execOptions = overrideOptions
            ? { ...(capturedCall.options ?? {}), ...overrideOptions }
            : undefined;

          const response = await controller.execute(execOptions, { force });

          if (response.error) {
            setRequestState({ isPending: false, error: response.error });
          } else {
            setRequestState({ isPending: false, error: undefined });
          }

          return response;
        } catch (err) {
          setRequestState({ isPending: false, error: err as TError });
          return { error: err as TError } as SpooshResponse<TData, TError>;
        }
      },
      [controller, capturedCall.options]
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

      const unsubRefetchAll = eventEmitter.on("refetchAll", () => {
        executeWithTracking(true);
      });

      return () => {
        unsubRefetch();
        unsubInvalidate();
        unsubRefetchAll();
      };
    }, [queryKey, enabled, tagsKey]);

    useEffect(() => {
      if (!enabled || !lifecycleRef.current.initialized) return;

      const prevContext = controller.getContext();
      controller.update(prevContext);
    }, [pluginOptsKey]);

    const abort = useCallback(() => {
      abortRef.current();
    }, []);

    const trigger = useCallback(
      async (
        triggerOptions?: { force?: boolean } & Record<string, unknown>
      ) => {
        const { force = true, ...overrideOptions } = triggerOptions ?? {};
        const hasOverrides = Object.keys(overrideOptions).length > 0;

        if (!hasOverrides) {
          return executeWithTracking(force, undefined);
        }

        const mergedOptions = {
          ...(capturedCall.options ?? {}),
          ...overrideOptions,
        };

        const newQueryKey = stateManager.createQueryKey({
          path: capturedCall.path,
          method: capturedCall.method,
          options: mergedOptions,
        });

        if (newQueryKey === controllerRef.current?.queryKey) {
          return executeWithTracking(force, overrideOptions);
        }

        const params = (
          mergedOptions as { params?: Record<string, string | number> }
        )?.params;
        const newResolvedPath = resolvePath(pathSegments, params);
        const newResolvedTags = resolveTags({ tags }, newResolvedPath);

        const newController = createOperationController<TData, TError>({
          operationType: "read",
          path: capturedCall.path,
          method: capturedCall.method as "GET",
          tags: newResolvedTags,
          requestOptions: mergedOptions,
          stateManager,
          eventEmitter,
          pluginExecutor,
          instanceId,
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

        newController.setPluginOptions(pluginOpts);

        const currentBaseQueryKey =
          controllerRef.current?.baseQueryKey ?? queryKey;
        controllerRef.current = {
          controller: newController,
          queryKey: newQueryKey,
          baseQueryKey: currentBaseQueryKey,
        };
        forceUpdate((n) => n + 1);

        newController.mount();
        setRequestState({ isPending: true, error: undefined });

        try {
          const response = await newController.execute(mergedOptions, {
            force,
          });

          if (response.error) {
            setRequestState({ isPending: false, error: response.error });
          } else {
            setRequestState({ isPending: false, error: undefined });
          }

          return response;
        } catch (err) {
          setRequestState({ isPending: false, error: err as TError });
          return { error: err as TError } as SpooshResponse<TData, TError>;
        }
      },
      [
        executeWithTracking,
        capturedCall.options,
        capturedCall.method,
        capturedCall.path,
        pathSegments,
        tags,
        stateManager,
        eventEmitter,
        pluginExecutor,
        instanceId,
        pluginOpts,
        api,
      ]
    );

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

    return {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      meta: pluginResultData as any,
      ...inputField,
      data: state.data,
      error: requestState.error ?? state.error,
      loading,
      fetching,
      abort,
      trigger,
    };
  }

  return useRead;
}
