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
  type ResolveResultTypes,
  createOperationController,
  createSelectorProxy,
  resolvePath,
  resolveTags,
} from "@spoosh/core";
import type {
  BaseWriteResult,
  WriteApiClient,
  WriteResponseInputFields,
  WriteTriggerInput,
} from "./types";
import type {
  ExtractMethodData,
  ExtractMethodError,
  ExtractResponseQuery,
  ExtractResponseBody,
  ExtractResponseParamNames,
} from "../types/extraction";
import type { SpooshInstanceShape } from "../create/types";

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

  type ExtractParamsRecord<TWriteFn> =
    ExtractResponseParamNames<TWriteFn> extends never
      ? never
      : Record<ExtractResponseParamNames<TWriteFn>, string | number>;

  type WriteResolverContext<TWriteFn> = ResolverContext<
    TSchema,
    ExtractMethodData<TWriteFn>,
    InferError<ExtractMethodError<TWriteFn>>,
    ExtractResponseQuery<TWriteFn>,
    ExtractResponseBody<TWriteFn>,
    ExtractParamsRecord<TWriteFn>
  >;

  type ResolvedWriteOptions<TWriteFn> = ResolveTypes<
    PluginOptions["write"],
    WriteResolverContext<TWriteFn>
  >;

  type ResolvedWriteTriggerOptions<TWriteFn> = ResolveTypes<
    PluginOptions["writeTrigger"],
    WriteResolverContext<TWriteFn>
  >;

  function useWrite<
    TWriteFn extends (
      api: WriteApiClient<TSchema, TDefaultError>
    ) => Promise<SpooshResponse<unknown, unknown>>,
    TWriteOpts extends ResolvedWriteOptions<TWriteFn> =
      ResolvedWriteOptions<TWriteFn>,
  >(
    writeFn: TWriteFn,
    writeOptions?: TWriteOpts
  ): BaseWriteResult<
    ExtractMethodData<TWriteFn>,
    InferError<ExtractMethodError<TWriteFn>>,
    WriteTriggerInput<TWriteFn> & ResolvedWriteTriggerOptions<TWriteFn>,
    ResolveResultTypes<MergePluginResults<TPlugins>["write"], TWriteOpts>
  > &
    WriteResponseInputFields<
      ExtractResponseQuery<TWriteFn>,
      ExtractResponseBody<TWriteFn>,
      ExtractResponseParamNames<TWriteFn>
    >;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function useWrite(writeFn: any, writeOptions?: any): any {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    type TData = any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    type TError = any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    type TOptions = any;

    const instanceId = useId();

    const selectorResultRef = useRef<SelectorResult>({
      call: null,
      selector: null,
    });

    const selectorProxy = createSelectorProxy<TSchema>((result) => {
      selectorResultRef.current = result;
    });

    (writeFn as (api: unknown) => unknown)(selectorProxy);

    const capturedCall = selectorResultRef.current.call;

    if (!capturedCall) {
      throw new Error(
        "useWrite requires calling an HTTP method (POST, PUT, PATCH, DELETE). " +
          'Example: useWrite((api) => api("posts").POST())'
      );
    }

    const pathSegments = capturedCall.path.split("/").filter(Boolean);

    const queryKey = stateManager.createQueryKey({
      path: capturedCall.path,
      method: capturedCall.method,
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
          path: capturedCall.path,
          method: capturedCall.method as "POST" | "PUT" | "PATCH" | "DELETE",
          tags: [],
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

        const mergedOptions = { ...writeOptions, ...triggerOptions, tags };
        controller.setPluginOptions(mergedOptions);

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
      [capturedCall.path]
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
