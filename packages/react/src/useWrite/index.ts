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
  type ResolveResultTypes,
  type ResolverContext,
  createOperationController,
  createSelectorProxy,
  resolvePath,
  resolveTags,
} from "@spoosh/core";
import type {
  BaseWriteResult,
  WriteApiClient,
  ExtractMethodData,
  ExtractMethodError,
  ExtractMethodOptions,
  ExtractMethodQuery,
  ExtractMethodBody,
  ExtractMethodFormData,
  ExtractMethodUrlEncoded,
  ExtractResponseQuery,
  ExtractResponseBody,
  ExtractResponseFormData,
  ExtractResponseParamNames,
  WriteResponseInputFields,
} from "../types";
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
  type PluginResults = MergePluginResults<TPlugins>;

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
    ExtractParamsRecord<TMethod>,
    ExtractMethodFormData<TMethod>,
    ExtractMethodUrlEncoded<TMethod>
  >;

  type ResolvedWriteOptions<TMethod> = import("@spoosh/core").ResolveTypes<
    PluginOptions["write"],
    WriteResolverContext<TMethod>
  >;

  return function useWrite<
    TMethod extends (
      ...args: never[]
    ) => Promise<SpooshResponse<unknown, unknown>>,
  >(
    writeFn: (api: WriteApiClient<TSchema, TDefaultError>) => TMethod
  ): BaseWriteResult<
    ExtractMethodData<TMethod>,
    InferError<ExtractMethodError<TMethod>>,
    ExtractMethodOptions<TMethod> & ResolvedWriteOptions<TMethod>,
    ResolveResultTypes<
      PluginResults["write"],
      ExtractMethodOptions<TMethod> & ResolvedWriteOptions<TMethod>
    >
  > &
    WriteResponseInputFields<
      ExtractResponseQuery<TMethod>,
      ExtractResponseBody<TMethod>,
      ExtractResponseFormData<TMethod>,
      ExtractResponseParamNames<TMethod>
    > {
    type TData = ExtractMethodData<TMethod>;
    type TError = InferError<ExtractMethodError<TMethod>>;
    type TOptions = ExtractMethodOptions<TMethod> &
      ResolvedWriteOptions<TMethod>;

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
        "useWrite requires selecting an HTTP method ($post, $put, $patch, $delete). " +
          "Example: useWrite((api) => api.posts.$post)"
      );
    }

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
            const params = (
              fetchOpts as { params?: Record<string, string | number> }
            )?.params;
            const resolvedPath = resolvePath(selectedEndpoint.path, params);

            let current: unknown = api;

            for (const segment of resolvedPath) {
              current = (current as Record<string, unknown>)[segment];
            }

            const method = (current as Record<string, unknown>)[
              selectedEndpoint.method
            ] as (o?: unknown) => Promise<SpooshResponse<TData, TError>>;

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

    const reset = useCallback(() => {
      stateManager.deleteCache(queryKey);
      setRequestState({ isPending: false, error: undefined });
    }, [queryKey]);

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
        const resolvedPath = resolvePath(selectedEndpoint.path, params);
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
          throw err;
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

    if (opts?.formData !== undefined) {
      inputInner.formData = opts.formData;
    }

    if (opts?.params !== undefined) {
      inputInner.params = opts.params;
    }

    const inputField =
      Object.keys(inputInner).length > 0 ? { input: inputInner } : {};

    const loading = requestState.isPending;

    const result = {
      trigger,
      meta: pluginResultData,
      ...inputField,
      data: state.data as TData | undefined,
      error: requestState.error ?? (state.error as TError | undefined),
      loading,
      reset,
      abort,
    };

    return result as unknown as BaseWriteResult<
      TData,
      TError,
      TOptions,
      ResolveResultTypes<PluginResults["write"], TOptions>
    > &
      WriteResponseInputFields<
        ExtractResponseQuery<TMethod>,
        ExtractResponseBody<TMethod>,
        ExtractResponseFormData<TMethod>,
        ExtractResponseParamNames<TMethod>
      >;
  };
}
