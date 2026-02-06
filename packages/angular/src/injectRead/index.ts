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
  ResponseInputFields,
  TriggerOptions,
} from "./types";
import type {
  ExtractResponseQuery,
  ExtractResponseBody,
  ExtractResponseParamNames,
} from "../types/extraction";
import type { SpooshInstanceShape } from "../types/shared";

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
    ResolveResultTypes<PluginResults["read"], TReadOpts>,
    TriggerOptions<TReadFn>
  > &
    ResponseInputFields<
      ExtractResponseQuery<TReadFn>,
      ExtractResponseBody<TReadFn>,
      ExtractResponseParamNames<TReadFn>
    > {
    const destroyRef = inject(DestroyRef);

    type TData = ExtractData<TReadFn>;
    type TError = InferError<ExtractError<TReadFn>>;

    const {
      enabled: enabledOption = true,
      tags,
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
    let baseQueryKey: string | null = null;
    let currentSubscription: (() => void) | null = null;
    let currentResolvedTags: string[] = [];
    let prevContext: PluginContext | null = null;
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
      resolvedTags: string[],
      queryKey: string
    ) => {
      if (currentSubscription) {
        currentSubscription();
      }

      const pathSegments = capturedCall.path.split("/").filter(Boolean);

      const controller = createOperationController<TData, TError>({
        operationType: "read",
        path: pathSegments,
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
          const pathMethods = (
            api as (path: string) => Record<string, unknown>
          )(capturedCall.path);
          const method = pathMethods[capturedCall.method] as (
            o?: unknown
          ) => Promise<SpooshResponse<TData, TError>>;

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
      force = false,
      overrideOptions?: Record<string, unknown>
    ) => {
      const hasData = dataSignal() !== undefined;
      loadingSignal.set(!hasData);
      fetchingSignal.set(true);

      try {
        const execOptions = overrideOptions
          ? {
              ...currentController?.getContext().request,
              ...overrideOptions,
            }
          : undefined;

        const response = await controller.execute(execOptions, { force });

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
        return { error: err as TError } as SpooshResponse<TData, TError>;
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
        "injectRead requires calling an HTTP method (GET). " +
          'Example: injectRead((api) => api("posts").GET())'
      );
    }

    const initialRequestOptions = initialCapturedCall.options as
      | { params?: Record<string, string | number> }
      | undefined;

    const initialPathSegments = initialCapturedCall.path
      .split("/")
      .filter(Boolean);
    const initialResolvedPath = resolvePath(
      initialPathSegments,
      initialRequestOptions?.params
    );
    const initialResolvedTags = resolveTags(
      tags !== undefined ? { tags } : undefined,
      initialResolvedPath
    );
    const initialQueryKey = stateManager.createQueryKey({
      path: initialPathSegments,
      method: initialCapturedCall.method,
      options: initialCapturedCall.options,
    });

    createController(initialCapturedCall, initialResolvedTags, initialQueryKey);
    baseQueryKey = initialQueryKey;
    loadingSignal.set(false);

    let wasEnabled = false;

    effect(
      () => {
        const isEnabled = getEnabled();
        const selectorResult = captureSelector();
        const capturedCall = selectorResult.call;

        if (!capturedCall) {
          throw new Error(
            "injectRead requires calling an HTTP method (GET). " +
              'Example: injectRead((api) => api("posts").GET())'
          );
        }

        const requestOptions = capturedCall.options as
          | { params?: Record<string, string | number> }
          | undefined;

        const pathSegments = capturedCall.path.split("/").filter(Boolean);
        const resolvedPath = resolvePath(pathSegments, requestOptions?.params);
        const resolvedTags = resolveTags(
          tags !== undefined ? { tags } : undefined,
          resolvedPath
        );

        const queryKey = stateManager.createQueryKey({
          path: pathSegments,
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

        if (opts?.params !== undefined) {
          inputInner.params = opts.params;
        }

        inputSignal.set(inputInner);

        const baseQueryKeyChanged = queryKey !== baseQueryKey;
        const enabledChanged = isEnabled !== wasEnabled;
        wasEnabled = isEnabled;

        if (baseQueryKeyChanged) {
          baseQueryKey = queryKey;
          if (currentController) {
            prevContext = currentController.getContext();

            if (isMounted) {
              currentController.unmount();
              isMounted = false;
            }
          }

          const controller = createController(
            capturedCall,
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

        const unsubRefetchAll = eventEmitter.on("refetchAll", () => {
          if (currentController) {
            untracked(() => {
              executeWithTracking(currentController!, true);
            });
          }
        });

        return () => {
          unsubRefetch();
          unsubInvalidate();
          unsubRefetchAll();
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

    const trigger = async (
      triggerOptions?: { force?: boolean } & Record<string, unknown>
    ) => {
      const { force = true, ...overrideOptions } = triggerOptions ?? {};
      const hasOverrides = Object.keys(overrideOptions).length > 0;

      if (!hasOverrides) {
        if (!currentController) {
          return Promise.resolve({ data: undefined, error: undefined });
        }

        return executeWithTracking(currentController, force, undefined);
      }

      const selectorResult = captureSelector();
      const capturedCall = selectorResult.call;

      if (!capturedCall) {
        return Promise.resolve({ data: undefined, error: undefined });
      }

      const mergedOptions = {
        ...(capturedCall.options ?? {}),
        ...overrideOptions,
      };

      const pathSegments = capturedCall.path.split("/").filter(Boolean);
      const newQueryKey = stateManager.createQueryKey({
        path: pathSegments,
        method: capturedCall.method,
        options: mergedOptions,
      });

      if (newQueryKey === currentQueryKey && currentController) {
        return executeWithTracking(currentController, force, overrideOptions);
      }

      const params = (
        mergedOptions as { params?: Record<string, string | number> }
      )?.params;
      const newResolvedPath = resolvePath(pathSegments, params);
      const newResolvedTags = resolveTags(
        tags !== undefined ? { tags } : undefined,
        newResolvedPath
      );

      const newController = createController(
        { ...capturedCall, options: mergedOptions },
        newResolvedTags,
        newQueryKey
      );

      newController.mount();
      isMounted = true;

      return executeWithTracking(newController, force, undefined);
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
      trigger,
    };

    return result as unknown as BaseReadResult<
      TData,
      TError,
      ResolveResultTypes<PluginResults["read"], TReadOpts>
    > &
      ResponseInputFields<
        ExtractResponseQuery<TReadFn>,
        ExtractResponseBody<TReadFn>,
        ExtractResponseParamNames<TReadFn>
      >;
  };
}
