import {
  signal,
  effect,
  DestroyRef,
  inject,
  untracked,
  type Signal,
} from "@angular/core";
import {
  type SpooshResponse,
  type MergePluginOptions,
  type MergePluginResults,
  type SpooshPlugin,
  type PluginTypeConfig,
  type PluginContext,
  type SelectorResult,
  type ResolveTypes,
  type ResolveResultTypes,
  type ResolverContext,
  createOperationController,
  createSelectorProxy,
  resolvePath,
  resolveTags,
} from "@spoosh/core";
import type {
  BaseReadOptions,
  BaseReadResult,
  ReadApiClient,
  ExtractResponseQuery,
  ExtractResponseBody,
  ExtractResponseFormData,
  ExtractResponseParamNames,
  ResponseInputFields,
  SpooshInstanceShape,
} from "../types";

export function createInjectRead<
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
  type PluginResults = MergePluginResults<TPlugins>;

  type InferError<T> = [T] extends [unknown] ? TDefaultError : T;

  type SuccessResponse<T> = Extract<T, { data: unknown; error?: undefined }>;
  type ErrorResponse<T> = Extract<T, { error: unknown; data?: undefined }>;

  type ExtractData<T> = T extends (...args: never[]) => infer R
    ? SuccessResponse<Awaited<R>> extends { data: infer D }
      ? D
      : unknown
    : unknown;

  type ExtractError<T> = T extends (...args: never[]) => infer R
    ? ErrorResponse<Awaited<R>> extends { error: infer E }
      ? E
      : unknown
    : unknown;

  type ResolvedReadOptions<TReadFn> = BaseReadOptions &
    ResolveTypes<
      PluginOptions["read"],
      ResolverContext<
        TSchema,
        ExtractData<TReadFn>,
        InferError<ExtractError<TReadFn>>
      >
    >;

  return function injectRead<
    TReadFn extends (
      api: ReadApiClient<TSchema, TDefaultError>
    ) => Promise<{ data?: unknown; error?: unknown }>,
    TReadOpts extends ResolvedReadOptions<TReadFn> =
      ResolvedReadOptions<TReadFn>,
  >(
    readFn: TReadFn,
    readOptions?: TReadOpts
  ): BaseReadResult<
    ExtractData<TReadFn>,
    InferError<ExtractError<TReadFn>>,
    ResolveResultTypes<PluginResults["read"], TReadOpts>
  > &
    ResponseInputFields<
      ExtractResponseQuery<TReadFn>,
      ExtractResponseBody<TReadFn>,
      ExtractResponseFormData<TReadFn>,
      ExtractResponseParamNames<TReadFn>
    > {
    const destroyRef = inject(DestroyRef);

    type TData = ExtractData<TReadFn>;
    type TError = InferError<ExtractError<TReadFn>>;

    const {
      enabled: enabledOption = true,
      tags = undefined,
      additionalTags = undefined,
      ...pluginOpts
    } = (readOptions ?? {}) as BaseReadOptions & Record<string, unknown>;

    const getEnabled = (): boolean =>
      typeof enabledOption === "function" ? enabledOption() : enabledOption;

    const dataSignal = signal<TData | undefined>(undefined);
    const errorSignal = signal<TError | undefined>(undefined);
    const loadingSignal = signal(true);
    const fetchingSignal = signal(false);
    const inputSignal = signal<Record<string, unknown>>({});
    const metaSignal = signal<Record<string, unknown>>({});

    let currentController: ReturnType<
      typeof createOperationController<TData, TError>
    > | null = null;
    let currentQueryKey: string | null = null;
    let currentSubscription: (() => void) | null = null;
    let currentResolvedTags: string[] = [];
    let prevContext: PluginContext<TData, TError> | null = null;
    let isMounted = false;

    const hookId = `angular-${Math.random().toString(36).slice(2)}`;

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

      (readFn as (api: unknown) => unknown)(selectorProxy);

      return selectorResult;
    };

    const createController = (
      capturedCall: NonNullable<SelectorResult["call"]>,
      resolvedPath: string[],
      resolvedTags: string[],
      queryKey: string
    ) => {
      if (currentSubscription) {
        currentSubscription();
      }

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
        hookId,
        fetchFn: async (fetchOpts: unknown) => {
          let current: unknown = api;

          for (const segment of resolvedPath) {
            current = (current as Record<string, unknown>)[segment];
          }

          const method = (current as Record<string, unknown>)[
            capturedCall.method
          ] as (o?: unknown) => Promise<SpooshResponse<TData, TError>>;

          return method(fetchOpts);
        },
      });

      controller.setPluginOptions(pluginOpts);

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
      currentResolvedTags = resolvedTags;

      return controller;
    };

    const executeWithTracking = async (
      controller: ReturnType<typeof createOperationController<TData, TError>>,
      force = false
    ) => {
      const hasData = dataSignal() !== undefined;
      loadingSignal.set(!hasData);
      fetchingSignal.set(true);

      try {
        const response = await controller.execute(undefined, { force });

        if (response.error) {
          errorSignal.set(response.error);
        } else {
          errorSignal.set(undefined);
        }

        if (response.data !== undefined) {
          dataSignal.set(response.data as TData);
        }

        return response;
      } catch (err) {
        errorSignal.set(err as TError);
        throw err;
      } finally {
        loadingSignal.set(false);
        fetchingSignal.set(false);
      }
    };

    // Initialize controller synchronously so refetch() works immediately
    const initialSelectorResult = captureSelector();
    const initialCapturedCall = initialSelectorResult.call;

    if (!initialCapturedCall) {
      throw new Error(
        "injectRead requires calling an HTTP method ($get). " +
          "Example: injectRead((api) => api.posts.$get())"
      );
    }

    const initialRequestOptions = initialCapturedCall.options as
      | { params?: Record<string, string | number> }
      | undefined;

    const initialResolvedPath = resolvePath(
      initialCapturedCall.path,
      initialRequestOptions?.params
    );
    const initialResolvedTags = resolveTags(
      { tags, additionalTags },
      initialResolvedPath
    );
    const initialQueryKey = stateManager.createQueryKey({
      path: initialCapturedCall.path,
      method: initialCapturedCall.method,
      options: initialCapturedCall.options,
    });

    createController(
      initialCapturedCall,
      initialResolvedPath,
      initialResolvedTags,
      initialQueryKey
    );
    loadingSignal.set(false);

    let wasEnabled = false;

    effect(
      () => {
        const isEnabled = getEnabled();
        const selectorResult = captureSelector();
        const capturedCall = selectorResult.call;

        if (!capturedCall) {
          throw new Error(
            "injectRead requires calling an HTTP method ($get). " +
              "Example: injectRead((api) => api.posts.$get())"
          );
        }

        const requestOptions = capturedCall.options as
          | { params?: Record<string, string | number> }
          | undefined;

        const resolvedPath = resolvePath(
          capturedCall.path,
          requestOptions?.params
        );
        const resolvedTags = resolveTags(
          { tags, additionalTags },
          resolvedPath
        );

        const queryKey = stateManager.createQueryKey({
          path: capturedCall.path,
          method: capturedCall.method,
          options: capturedCall.options,
        });

        const opts = capturedCall.options as
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

        const queryKeyChanged = queryKey !== currentQueryKey;
        const enabledChanged = isEnabled !== wasEnabled;
        wasEnabled = isEnabled;

        if (queryKeyChanged) {
          if (currentController) {
            prevContext = currentController.getContext();

            if (isMounted) {
              currentController.unmount();
              isMounted = false;
            }
          }

          const controller = createController(
            capturedCall,
            resolvedPath,
            resolvedTags,
            queryKey
          );

          if (prevContext) {
            controller.update(prevContext);
            prevContext = null;
          }

          if (isEnabled) {
            controller.mount();
            isMounted = true;

            untracked(() => {
              executeWithTracking(controller, false);
            });
          } else {
            loadingSignal.set(false);
          }
        } else if (enabledChanged && currentController) {
          if (isEnabled && !isMounted) {
            currentController.mount();
            isMounted = true;

            untracked(() => {
              executeWithTracking(currentController!, false);
            });
          } else if (!isEnabled && isMounted) {
            currentController.unmount();
            isMounted = false;
          }
        }

        if (!isEnabled) {
          loadingSignal.set(false);
          return;
        }

        const unsubRefetch = eventEmitter.on(
          "refetch",
          (event: { queryKey: string }) => {
            if (event.queryKey === currentQueryKey && currentController) {
              untracked(() => {
                executeWithTracking(currentController!, true);
              });
            }
          }
        );

        const unsubInvalidate = eventEmitter.on(
          "invalidate",
          (invalidatedTags: string[]) => {
            const hasMatch = invalidatedTags.some((tag: string) =>
              currentResolvedTags.includes(tag)
            );

            if (hasMatch && currentController) {
              untracked(() => {
                executeWithTracking(currentController!, true);
              });
            }
          }
        );

        return () => {
          unsubRefetch();
          unsubInvalidate();
        };
      },
      { allowSignalWrites: true }
    );

    destroyRef.onDestroy(() => {
      if (currentSubscription) {
        currentSubscription();
      }

      if (currentController && isMounted) {
        currentController.unmount();
      }
    });

    const abort = () => {
      currentController?.abort();
    };

    const refetch = () => {
      if (currentController) {
        // Mount if not already mounted (allows manual fetch when enabled: false)
        if (!isMounted) {
          currentController.mount();
          isMounted = true;
        }

        return executeWithTracking(currentController, true);
      }

      return Promise.resolve({ data: undefined, error: undefined });
    };

    const result = {
      meta: metaSignal as unknown as Signal<
        ResolveResultTypes<PluginResults["read"], TReadOpts>
      >,
      get input() {
        return inputSignal();
      },
      data: dataSignal as Signal<TData | undefined>,
      error: errorSignal as Signal<TError | undefined>,
      loading: loadingSignal,
      fetching: fetchingSignal,
      abort,
      refetch,
    };

    return result as unknown as BaseReadResult<
      TData,
      TError,
      ResolveResultTypes<PluginResults["read"], TReadOpts>
    > &
      ResponseInputFields<
        ExtractResponseQuery<TReadFn>,
        ExtractResponseBody<TReadFn>,
        ExtractResponseFormData<TReadFn>,
        ExtractResponseParamNames<TReadFn>
      >;
  };
}
