import {
  useSyncExternalStore,
  useRef,
  useCallback,
  useState,
  useId,
} from "react";
import {
  type SpooshResponse,
  type MergePluginOptions,
  type MergePluginResults,
  type SpooshPlugin,
  type PluginTypeConfig,
  type SelectorResult,
  type ResolverContext,
  type ResolveTypes,
  createOperationController,
  createSelectorProxy,
  resolvePath,
  resolveTags,
} from "@spoosh/core";
import type {
  BaseWriteResult,
  WriteApiClient,
  WriteResponseInputFields,
} from "./types";
import type {
  ExtractMethodData,
  ExtractMethodError,
  ExtractMethodOptions,
  ExtractMethodQuery,
  ExtractMethodBody,
  ExtractResponseQuery,
  ExtractResponseBody,
  ExtractResponseParamNames,
} from "../types/extraction";
import type { SpooshInstanceShape } from "../createReactSpoosh/types";

export function createUseWrite<
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

  type PluginOptions = MergePluginOptions<TPlugins>;

  type InferError<T> = [T] extends [unknown] ? TDefaultError : T;

  type ExtractParamsRecord<T> =
    ExtractResponseParamNames<T> extends never
      ? never
      : Record<ExtractResponseParamNames<T>, string | number>;

  type WriteResolverContext<TMethod> = ResolverContext<
    TSchema,
    ExtractMethodData<TMethod>,
    InferError<ExtractMethodError<TMethod>>,
    ExtractMethodQuery<TMethod>,
    ExtractMethodBody<TMethod>,
    ExtractParamsRecord<TMethod>
  >;

  type ResolvedWriteOptions<TMethod> = ResolveTypes<
    PluginOptions["write"],
    WriteResolverContext<TMethod>
  >;

  function useWrite<
    TMethod extends (
      ...args: never[]
    ) => Promise<SpooshResponse<unknown, unknown>>,
  >(
    writeFn: (api: WriteApiClient<TSchema, TDefaultError>) => TMethod
  ): BaseWriteResult<
    ExtractMethodData<TMethod>,
    InferError<ExtractMethodError<TMethod>>,
    ExtractMethodOptions<TMethod> & ResolvedWriteOptions<TMethod>,
    MergePluginResults<TPlugins>["write"]
  > &
    WriteResponseInputFields<
      ExtractResponseQuery<TMethod>,
      ExtractResponseBody<TMethod>,
      ExtractResponseParamNames<TMethod>
    >;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function useWrite(writeFn: any): any {
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

    (writeFn as (api: unknown) => unknown)(selectorProxy);

    const selectedEndpoint = selectorResultRef.current.selector;

    if (!selectedEndpoint) {
      throw new Error(
        "useWrite requires selecting an HTTP method (POST, PUT, PATCH, DELETE). " +
          'Example: useWrite((api) => api("posts").POST)'
      );
    }

    const pathSegments = selectedEndpoint.path.split("/").filter(Boolean);

    const queryKey = stateManager.createQueryKey({
      path: selectedEndpoint.path,
      method: selectedEndpoint.method,
      options: undefined,
    });

    const controllerRef = useRef<{
      controller: ReturnType<typeof createOperationController<TData, TError>>;
      queryKey: string;
    } | null>(null);

    if (!controllerRef.current || controllerRef.current.queryKey !== queryKey) {
      controllerRef.current = {
        controller: createOperationController<TData, TError>({
          operationType: "write",
          path: selectedEndpoint.path,
          method: selectedEndpoint.method as
            | "POST"
            | "PUT"
            | "PATCH"
            | "DELETE",
          tags: [],
          stateManager,
          eventEmitter,
          pluginExecutor,
          hookId,
          fetchFn: async (fetchOpts) => {
            const pathMethods = (
              api as (path: string) => Record<string, unknown>
            )(selectedEndpoint.path);
            const method = pathMethods[selectedEndpoint.method] as (
              o?: unknown
            ) => Promise<SpooshResponse<TData, TError>>;

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

    const [requestState, setRequestState] = useState<{
      isPending: boolean;
      error: TError | undefined;
    }>({ isPending: false, error: undefined });

    const abort = useCallback(() => {
      controller.abort();
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
        const resolvedPath = resolvePath(pathSegments, params);
        const tags = resolveTags(triggerOptions, resolvedPath);

        controller.setPluginOptions({ ...triggerOptions, tags });

        try {
          const response = await controller.execute(triggerOptions, {
            force: true,
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
      [selectedEndpoint.path]
    );

    const entry = stateManager.getCache(queryKey);
    const pluginResultData = entry?.meta ? Object.fromEntries(entry.meta) : {};

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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      meta: pluginResultData as any,
      ...inputField,
      data: state.data as TData | undefined,
      error: requestState.error ?? (state.error as TError | undefined),
      loading,
      abort,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any;
  }

  return useWrite;
}
