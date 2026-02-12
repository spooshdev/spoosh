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
  WriteResponseInputFields,
  WriteTriggerInput,
} from "./types";
import type {
  ExtractMethodQuery,
  ExtractMethodBody,
  ExtractResponseQuery,
  ExtractResponseBody,
  ExtractResponseParamNames,
} from "../types/extraction";
import type { SpooshInstanceShape } from "../types/shared";

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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  type ExtractMethodData<T> = T extends (...args: any[]) => infer R
    ? SuccessResponse<Awaited<R>> extends { data: infer D }
      ? D
      : unknown
    : unknown;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  type ExtractMethodError<T> = T extends (...args: any[]) => infer R
    ? ErrorResponse<Awaited<R>> extends { error: infer E }
      ? E
      : unknown
    : unknown;

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

  type ResolvedWriteOptions<TWriteFn> = import("@spoosh/core").ResolveTypes<
    PluginOptions["write"],
    WriteResolverContext<TWriteFn>
  >;

  type ResolvedWriteTriggerOptions<TWriteFn> =
    import("@spoosh/core").ResolveTypes<
      PluginOptions["writeTrigger"],
      WriteResolverContext<TWriteFn>
    >;

  function injectWrite<
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
    ResolveResultTypes<PluginResults["write"], TWriteOpts>
  > &
    WriteResponseInputFields<
      ExtractResponseQuery<TWriteFn>,
      ExtractResponseBody<TWriteFn>,
      ExtractResponseParamNames<TWriteFn>
    > {
    const destroyRef = inject(DestroyRef);

    type TData = ExtractMethodData<TWriteFn>;
    type TError = InferError<ExtractMethodError<TWriteFn>>;
    type TOptions = WriteTriggerInput<TWriteFn> &
      ResolvedWriteTriggerOptions<TWriteFn>;

    const captureSelector = () => {
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

      if (!selectorResult.call) {
        throw new Error(
          "injectWrite requires calling an HTTP method (POST, PUT, PATCH, DELETE). " +
            'Example: injectWrite((api) => api("posts").POST())'
        );
      }

      return selectorResult.call;
    };

    const instanceId = `angular-${Math.random().toString(36).slice(2)}`;
    let currentQueryKey: string | null = null;
    let currentController: ReturnType<
      typeof createOperationController<TData, TError>
    > | null = null;
    let currentSubscription: (() => void) | null = null;

    const dataSignal = signal<TData | undefined>(undefined);
    const errorSignal = signal<TError | undefined>(undefined);
    const loadingSignal = signal(false);
    const lastTriggerOptionsSignal = signal<TOptions | undefined>(undefined);
    const metaSignal = signal<Record<string, unknown>>({});

    destroyRef.onDestroy(() => {
      if (currentSubscription) {
        currentSubscription();
      }
    });

    const abort = () => {
      currentController?.abort();
    };

    const trigger = async (
      triggerOptions?: TOptions
    ): Promise<SpooshResponse<TData, TError>> => {
      const selectedEndpoint = captureSelector();

      const params = (
        triggerOptions as
          | { params?: Record<string, string | number> }
          | undefined
      )?.params;
      const pathSegments = selectedEndpoint.path.split("/").filter(Boolean);
      const resolvedPath = resolvePath(pathSegments, params);
      const tags = resolveTags(triggerOptions, resolvedPath);

      const queryKey = stateManager.createQueryKey({
        path: selectedEndpoint.path,
        method: selectedEndpoint.method,
        options: triggerOptions,
      });

      const needsNewController =
        !currentController || currentQueryKey !== queryKey;

      if (needsNewController) {
        if (currentSubscription) {
          currentSubscription();
        }

        const controller = createOperationController<TData, TError>({
          operationType: "write",
          path: selectedEndpoint.path,
          method: selectedEndpoint.method as
            | "POST"
            | "PUT"
            | "PATCH"
            | "DELETE",
          tags,
          stateManager,
          eventEmitter,
          pluginExecutor,
          instanceId,
          fetchFn: async (fetchOpts: unknown) => {
            const pathMethods = (
              api as (path: string) => Record<string, unknown>
            )(selectedEndpoint.path);
            const method = pathMethods[selectedEndpoint.method] as (
              o?: unknown
            ) => Promise<SpooshResponse<TData, TError>>;

            return method(fetchOpts);
          },
        });

        currentSubscription = controller.subscribe(() => {
          const state = controller.getState();
          dataSignal.set(state.data as TData | undefined);
          errorSignal.set(state.error as TError | undefined);

          const entry = stateManager.getCache(queryKey);
          const newMeta = entry?.meta ? Object.fromEntries(entry.meta) : {};
          metaSignal.set(newMeta);
        });

        currentController = controller;
        currentQueryKey = queryKey;
      }

      lastTriggerOptionsSignal.set(triggerOptions);
      loadingSignal.set(true);
      errorSignal.set(undefined);

      const mergedOptions = { ...writeOptions, ...triggerOptions, tags };
      currentController!.setPluginOptions(mergedOptions);

      try {
        const response = await currentController!.execute(triggerOptions, {
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
        return { error: err as TError } as SpooshResponse<TData, TError>;
      } finally {
        loadingSignal.set(false);
      }
    };

    const inputSignal = signal<{
      query?: unknown;
      body?: unknown;
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
        ResolveResultTypes<PluginResults["write"], TWriteOpts>
      >,
      input: inputSignal as Signal<{
        query?: ExtractResponseQuery<TWriteFn>;
        body?: ExtractResponseBody<TWriteFn>;
        params?: Record<ExtractResponseParamNames<TWriteFn>, string | number>;
      }>,
      data: dataSignal as Signal<TData | undefined>,
      error: errorSignal as Signal<TError | undefined>,
      loading: loadingSignal,
      abort,
    };

    return result as unknown as BaseWriteResult<
      TData,
      TError,
      TOptions,
      ResolveResultTypes<PluginResults["write"], TWriteOpts>
    > &
      WriteResponseInputFields<
        ExtractResponseQuery<TWriteFn>,
        ExtractResponseBody<TWriteFn>,
        ExtractResponseParamNames<TWriteFn>
      >;
  }

  return injectWrite;
}
