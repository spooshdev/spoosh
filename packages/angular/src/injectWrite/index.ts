import { signal, effect, DestroyRef, inject, type Signal } from "@angular/core";
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
  ExtractMethodQuery,
  ExtractMethodBody,
  ExtractMethodFormData,
  ExtractResponseQuery,
  ExtractResponseBody,
  ExtractResponseFormData,
  ExtractResponseParamNames,
  WriteResponseInputFields,
  SpooshInstanceShape,
} from "../types";

export function createInjectWrite<
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

  type SuccessResponse<T> = Extract<T, { data: unknown; error?: undefined }>;
  type ErrorResponse<T> = Extract<T, { error: unknown; data?: undefined }>;

  type ExtractMethodData<T> = T extends (...args: never[]) => infer R
    ? SuccessResponse<Awaited<R>> extends { data: infer D }
      ? D
      : unknown
    : unknown;

  type ExtractMethodError<T> = T extends (...args: never[]) => infer R
    ? ErrorResponse<Awaited<R>> extends { error: infer E }
      ? E
      : unknown
    : unknown;
  type ExtractMethodOptions<T> = T extends (...args: infer A) => unknown
    ? A[0]
    : never;

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
    never
  >;

  type ResolvedWriteOptions<TMethod> = import("@spoosh/core").ResolveTypes<
    PluginOptions["write"],
    WriteResolverContext<TMethod>
  >;

  return function injectWrite<
    TMethod extends (
      ...args: never[]
    ) => Promise<SpooshResponse<unknown, unknown>>,
    TWriteOpts extends ExtractMethodOptions<TMethod> &
      ResolvedWriteOptions<TMethod> = ExtractMethodOptions<TMethod> &
      ResolvedWriteOptions<TMethod>,
  >(
    writeFn: (api: WriteApiClient<TSchema, TDefaultError>) => TMethod
  ): BaseWriteResult<
    ExtractMethodData<TMethod>,
    InferError<ExtractMethodError<TMethod>>,
    TWriteOpts,
    ResolveResultTypes<PluginResults["write"], TWriteOpts>
  > &
    WriteResponseInputFields<
      ExtractResponseQuery<TMethod>,
      ExtractResponseBody<TMethod>,
      ExtractResponseFormData<TMethod>,
      ExtractResponseParamNames<TMethod>
    > {
    const destroyRef = inject(DestroyRef);

    type TData = ExtractMethodData<TMethod>;
    type TError = InferError<ExtractMethodError<TMethod>>;
    type TOptions = ExtractMethodOptions<TMethod> &
      ResolvedWriteOptions<TMethod>;

    const selectorResult: SelectorResult = {
      call: null,
      selector: null,
    };

    const selectorProxy = createSelectorProxy<TSchema>(
      (result: SelectorResult) => {
        selectorResult.call = result.call;
        selectorResult.selector = result.selector;
      }
    );

    (writeFn as (api: unknown) => unknown)(selectorProxy);

    const selectedEndpoint = selectorResult.selector;

    if (!selectedEndpoint) {
      throw new Error(
        "injectWrite requires selecting an HTTP method ($post, $put, $patch, $delete). " +
          "Example: injectWrite((api) => api.posts.$post)"
      );
    }

    const queryKey = stateManager.createQueryKey({
      path: selectedEndpoint.path,
      method: selectedEndpoint.method,
      options: undefined,
    });

    const controller = createOperationController<TData, TError>({
      operationType: "write",
      path: selectedEndpoint.path,
      method: selectedEndpoint.method as "POST" | "PUT" | "PATCH" | "DELETE",
      tags: [],
      stateManager,
      eventEmitter,
      pluginExecutor,
      hookId: `angular-${Math.random().toString(36).slice(2)}`,
      fetchFn: async (fetchOpts: unknown) => {
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
    });

    const dataSignal = signal<TData | undefined>(undefined);
    const errorSignal = signal<TError | undefined>(undefined);
    const loadingSignal = signal(false);
    const lastTriggerOptionsSignal = signal<TOptions | undefined>(undefined);
    const metaSignal = signal<Record<string, unknown>>({});

    const subscription = controller.subscribe(() => {
      const state = controller.getState();
      dataSignal.set(state.data as TData | undefined);
      errorSignal.set(state.error as TError | undefined);

      const entry = stateManager.getCache(queryKey);
      const newMeta = entry?.pluginResult
        ? Object.fromEntries(entry.pluginResult)
        : {};
      metaSignal.set(newMeta);
    });

    destroyRef.onDestroy(() => {
      subscription();
    });

    const reset = () => {
      stateManager.deleteCache(queryKey);
      errorSignal.set(undefined);
      loadingSignal.set(false);
    };

    const abort = () => {
      controller.abort();
    };

    const trigger = async (
      triggerOptions?: TOptions
    ): Promise<SpooshResponse<TData, TError>> => {
      lastTriggerOptionsSignal.set(triggerOptions);
      loadingSignal.set(true);

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
          errorSignal.set(response.error);
        } else {
          errorSignal.set(undefined);
        }

        return response;
      } catch (err) {
        errorSignal.set(err as TError);
        throw err;
      } finally {
        loadingSignal.set(false);
      }
    };

    const inputSignal = signal<{
      query?: unknown;
      body?: unknown;
      formData?: unknown;
      params?: unknown;
    }>({});

    effect(
      () => {
        const opts = lastTriggerOptionsSignal() as
          | Record<string, unknown>
          | undefined;
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

        inputSignal.set(inputInner);
      },
      { allowSignalWrites: true }
    );

    const result = {
      trigger,
      meta: metaSignal as unknown as Signal<
        ResolveResultTypes<PluginResults["write"], TOptions>
      >,
      input: inputSignal as Signal<{
        query?: ExtractResponseQuery<TMethod>;
        body?: ExtractResponseBody<TMethod>;
        formData?: ExtractResponseFormData<TMethod>;
        params?: Record<ExtractResponseParamNames<TMethod>, string | number>;
      }>,
      data: dataSignal as Signal<TData | undefined>,
      error: errorSignal as Signal<TError | undefined>,
      loading: loadingSignal,
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
