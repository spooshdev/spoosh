import {
  useSyncExternalStore,
  useRef,
  useCallback,
  useState,
  useId,
} from "react";
import {
  type SpooshResponse,
  type SpooshPlugin,
  type PluginTypeConfig,
  type SelectorResult,
  createOperationController,
  createSelectorProxy,
  resolvePath,
} from "@spoosh/core";
import type {
  BaseLazyReadResult,
  ReadApiClient,
  ExtractMethodData,
  ExtractMethodError,
  ExtractCoreMethodOptions,
  ExtractResponseQuery,
  ExtractResponseBody,
  ExtractResponseParamNames,
  WriteResponseInputFields,
} from "../types";
import type { SpooshInstanceShape } from "../createReactSpoosh/types";

export function createUseLazyRead<
  TSchema,
  TDefaultError,
  TPlugins extends readonly SpooshPlugin<PluginTypeConfig>[],
>(
  options: Omit<
    SpooshInstanceShape<unknown, TSchema, TDefaultError, TPlugins>,
    "_types"
  >
) {
  const { api, stateManager, pluginExecutor, eventEmitter } = options;

  type InferError<T> = [T] extends [unknown] ? TDefaultError : T;

  function useLazyRead<
    TMethod extends (
      ...args: never[]
    ) => Promise<SpooshResponse<unknown, unknown>>,
  >(
    readFn: (api: ReadApiClient<TSchema, TDefaultError>) => TMethod
  ): BaseLazyReadResult<
    ExtractMethodData<TMethod>,
    InferError<ExtractMethodError<TMethod>>,
    ExtractCoreMethodOptions<TMethod>
  > &
    WriteResponseInputFields<
      ExtractResponseQuery<TMethod>,
      ExtractResponseBody<TMethod>,
      ExtractResponseParamNames<TMethod>
    >;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function useLazyRead(readFn: any): any {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    type TData = any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    type TError = any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    type TOptions = any;

    const hookId = useId();

    const selectorResultRef = useRef<SelectorResult>({
      call: null,
      selector: null,
    });

    const selectorProxy = createSelectorProxy<TSchema>((result) => {
      selectorResultRef.current = result;
    });

    (readFn as (api: unknown) => unknown)(selectorProxy);

    const selectedEndpoint = selectorResultRef.current.selector;

    if (!selectedEndpoint) {
      throw new Error(
        "useLazyRead requires selecting an HTTP method (GET). " +
          'Example: useLazyRead((api) => api("posts").GET)'
      );
    }

    if (selectedEndpoint.method !== "GET") {
      throw new Error(
        "useLazyRead only supports GET method. " +
          "Use useWrite for POST, PUT, PATCH, DELETE methods."
      );
    }

    const pathSegments = selectedEndpoint.path.split("/").filter(Boolean);

    const controllerRef = useRef<{
      controller: ReturnType<typeof createOperationController<TData, TError>>;
      queryKey: string;
    } | null>(null);

    const emptyStateRef = useRef({ data: undefined, error: undefined });
    const [, setCurrentQueryKey] = useState<string | null>(null);
    const [, forceUpdate] = useState(0);

    const getOrCreateController = useCallback(
      (triggerOptions?: TOptions) => {
        const queryKey = stateManager.createQueryKey({
          path: pathSegments,
          method: selectedEndpoint.method,
          options: triggerOptions,
        });

        if (controllerRef.current?.queryKey === queryKey) {
          return { controller: controllerRef.current.controller, queryKey };
        }

        const controller = createOperationController<TData, TError>({
          operationType: "read",
          path: pathSegments,
          method: "GET",
          tags: [],
          stateManager,
          eventEmitter,
          pluginExecutor,
          hookId,
          requestOptions: triggerOptions,
          fetchFn: async (fetchOpts) => {
            const pathMethods = (
              api as (path: string) => Record<string, unknown>
            )(selectedEndpoint.path);
            const method = pathMethods[selectedEndpoint.method] as (
              o?: unknown
            ) => Promise<SpooshResponse<TData, TError>>;

            return method(fetchOpts);
          },
        });

        controllerRef.current = { controller, queryKey };
        setCurrentQueryKey(queryKey);
        forceUpdate((n) => n + 1);

        return { controller, queryKey };
      },
      [pathSegments, selectedEndpoint.method, selectedEndpoint.path, hookId]
    );

    const controller = controllerRef.current?.controller;

    const subscribe = useCallback(
      (callback: () => void) => {
        if (!controller) return () => {};
        return controller.subscribe(callback);
      },
      [controller]
    );

    const getSnapshot = useCallback(() => {
      if (!controller) return emptyStateRef.current;
      return controller.getState();
    }, [controller]);

    const state = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

    const [lastTriggerOptions, setLastTriggerOptions] = useState<
      TOptions | undefined
    >(undefined);

    const [requestState, setRequestState] = useState<{
      isPending: boolean;
      error: TError | undefined;
    }>({ isPending: false, error: undefined });

    const abort = useCallback(() => {
      controllerRef.current?.controller.abort();
    }, []);

    const trigger = useCallback(
      async (
        triggerOptions?: TOptions
      ): Promise<SpooshResponse<TData, TError>> => {
        setLastTriggerOptions(triggerOptions);
        setRequestState((prev) => ({ ...prev, isPending: true }));

        const params = (
          triggerOptions as
            | { params?: Record<string, string | number> }
            | undefined
        )?.params;
        resolvePath(pathSegments, params);

        const { controller: ctrl } = getOrCreateController(triggerOptions);

        ctrl.setPluginOptions(triggerOptions);

        try {
          const response = await ctrl.execute(triggerOptions);

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
      [pathSegments, getOrCreateController]
    );

    const opts = lastTriggerOptions as Record<string, unknown> | undefined;
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

    const loading = requestState.isPending;

    return {
      trigger,
      ...inputField,
      data: state.data as TData | undefined,
      error: requestState.error ?? (state.error as TError | undefined),
      loading,
      abort,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any;
  }

  return useLazyRead;
}
