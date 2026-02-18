import {
  signal,
  computed,
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
  type InfiniteRequestOptions,
  type SelectorResult,
  type ResolveTypes,
  type ResolverContext,
  type PluginContext,
  type InfiniteNextContext,
  type InfinitePrevContext,
  type InfinitePage,
  createInfiniteReadController,
  createSelectorProxy,
  resolvePath,
  resolveTags,
} from "@spoosh/core";
import type {
  BasePagesOptions,
  BasePagesResult,
  PagesApiClient as ReadApiClient,
  PagesTriggerOptions,
} from "./types";
import type { SpooshInstanceShape } from "../types/shared";

export function createInjectPages<
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

  type InferError<T> = [T] extends [unknown] ? TDefaultError : T;

  return function injectPages<
    TReadFn extends (
      api: ReadApiClient<TSchema, TDefaultError>
    ) => Promise<SpooshResponse<unknown, unknown>>,
    TRequest extends InfiniteRequestOptions = InfiniteRequestOptions,
    TItem = unknown,
  >(
    readFn: TReadFn,
    readOptions: BasePagesOptions<
      ExtractData<TReadFn>,
      TItem,
      InferError<ExtractError<TReadFn>>,
      TRequest,
      PluginResults["read"]
    > &
      ResolveTypes<
        PluginOptions["read"],
        ResolverContext<
          TSchema,
          ExtractData<TReadFn>,
          InferError<ExtractError<TReadFn>>
        >
      >
  ): BasePagesResult<
    ExtractData<TReadFn>,
    InferError<ExtractError<TReadFn>>,
    TItem,
    PluginResults["read"],
    PagesTriggerOptions<TReadFn>
  > {
    type TData = ExtractData<TReadFn>;
    type TError = InferError<ExtractError<TReadFn>>;

    const destroyRef = inject(DestroyRef);

    const {
      enabled: enabledOption = true,
      tags,
      canFetchNext,
      nextPageRequest,
      merger,
      canFetchPrev,
      prevPageRequest,
      ...pluginOpts
    } = readOptions;

    const getEnabled = (): boolean =>
      typeof enabledOption === "function" ? enabledOption() : enabledOption;

    const callbackRefs = {
      canFetchNext,
      canFetchPrev,
      nextPageRequest,
      prevPageRequest,
      merger,
    };

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

      if (!selectorResult.call) {
        throw new Error(
          "injectPages requires calling an HTTP method (GET). " +
            'Example: injectPages((api) => api("posts").GET())'
        );
      }

      return selectorResult.call;
    };

    const instanceId = `angular-${Math.random().toString(36).slice(2)}`;

    const dataSignal = signal<TItem[] | undefined>(undefined);
    const pagesSignal = signal<
      InfinitePage<TData, TError, PluginResults["read"]>[]
    >([]);
    const errorSignal = signal<TError | undefined>(undefined);
    const loadingSignal = signal(false);
    const canFetchNextSignal = signal(false);
    const canFetchPrevSignal = signal(false);
    const fetchingNextSignal = signal(false);
    const fetchingPrevSignal = signal(false);

    let currentController: ReturnType<
      typeof createInfiniteReadController<
        TData,
        TItem,
        TError,
        TRequest,
        PluginResults["read"]
      >
    > | null = null;
    let currentQueryKey: string | null = null;
    let currentSubscription: (() => void) | null = null;
    let currentResolvedTags: string[] = [];
    let prevContext: PluginContext | null = null;
    let isMounted = false;
    let unsubInvalidate: (() => void) | null = null;
    let unsubRefetchAll: (() => void) | null = null;

    const updateSignalsFromState = () => {
      if (!currentController) return;

      const state = currentController.getState();
      dataSignal.set(state.data);
      pagesSignal.set(
        state.pages as InfinitePage<TData, TError, PluginResults["read"]>[]
      );
      errorSignal.set(state.error);
      canFetchNextSignal.set(state.canFetchNext);
      canFetchPrevSignal.set(state.canFetchPrev);
    };

    const triggerFetch = () => {
      if (!currentController) return;

      const currentState = currentController.getState();
      const isFetching = untracked(
        () => fetchingNextSignal() || fetchingPrevSignal()
      );

      if (currentState.data === undefined && !isFetching) {
        loadingSignal.set(true);
        fetchingNextSignal.set(true);
        errorSignal.set(undefined);
        currentController.fetchNext().finally(() => {
          updateSignalsFromState();
          loadingSignal.set(false);
          fetchingNextSignal.set(false);
        });
      } else if (currentState.data !== undefined) {
        updateSignalsFromState();
      }
    };

    const createController = (
      capturedCall: NonNullable<SelectorResult["call"]>,
      resolvedTags: string[],
      queryKey: string
    ) => {
      if (currentSubscription) {
        currentSubscription();
      }

      if (unsubInvalidate) {
        unsubInvalidate();
      }

      if (unsubRefetchAll) {
        unsubRefetchAll();
      }

      const requestOptions = capturedCall.options as
        | {
            params?: Record<string, string | number>;
            query?: Record<string, unknown>;
            body?: unknown;
          }
        | undefined;

      const initialRequest: InfiniteRequestOptions = {
        query: requestOptions?.query,
        params: requestOptions?.params,
        body: requestOptions?.body,
      };

      const controller = createInfiniteReadController<
        TData,
        TItem,
        TError,
        TRequest,
        PluginResults["read"]
      >({
        path: capturedCall.path,
        method: capturedCall.method as "GET",
        tags: resolvedTags,
        initialRequest,
        canFetchNext: canFetchNext
          ? (
              ctx: InfiniteNextContext<
                TData,
                TError,
                TRequest,
                PluginResults["read"]
              >
            ) => callbackRefs.canFetchNext?.(ctx) ?? false
          : undefined,
        canFetchPrev: canFetchPrev
          ? (
              ctx: InfinitePrevContext<
                TData,
                TError,
                TRequest,
                PluginResults["read"]
              >
            ) => callbackRefs.canFetchPrev?.(ctx) ?? false
          : undefined,
        nextPageRequest: nextPageRequest
          ? (
              ctx: InfiniteNextContext<
                TData,
                TError,
                TRequest,
                PluginResults["read"]
              >
            ) => callbackRefs.nextPageRequest?.(ctx) ?? {}
          : undefined,
        prevPageRequest: prevPageRequest
          ? (
              ctx: InfinitePrevContext<
                TData,
                TError,
                TRequest,
                PluginResults["read"]
              >
            ) => callbackRefs.prevPageRequest?.(ctx) ?? {}
          : undefined,
        merger: (pages: InfinitePage<TData, TError, PluginResults["read"]>[]) =>
          callbackRefs.merger(pages) as TItem[],
        stateManager,
        eventEmitter,
        pluginExecutor,
        instanceId,
        fetchFn: async (
          opts: InfiniteRequestOptions,
          abortSignal: AbortSignal
        ) => {
          const pathMethods = (
            api as (path: string) => Record<string, unknown>
          )(capturedCall.path);
          const method = pathMethods[capturedCall.method] as (
            opts?: unknown
          ) => Promise<SpooshResponse<TData, TError>>;

          const fetchOptions = {
            ...(capturedCall.options as object),
            ...opts,
            signal: abortSignal,
          };

          return method(fetchOptions);
        },
      });

      controller.setPluginOptions(pluginOpts);

      currentSubscription = controller.subscribe(() => {
        const state = controller.getState();
        dataSignal.set(state.data);
        pagesSignal.set(
          state.pages as InfinitePage<TData, TError, PluginResults["read"]>[]
        );
        errorSignal.set(state.error);
        canFetchNextSignal.set(state.canFetchNext);
        canFetchPrevSignal.set(state.canFetchPrev);
      });

      currentController = controller;
      currentQueryKey = queryKey;
      currentResolvedTags = resolvedTags;

      unsubInvalidate = eventEmitter.on(
        "invalidate",
        (invalidatedTags: string[]) => {
          if (!getEnabled() || !currentController) return;

          const hasMatch = invalidatedTags.some((tag: string) =>
            currentResolvedTags.includes(tag)
          );

          if (hasMatch) {
            loadingSignal.set(true);
            currentController.trigger().finally(() => {
              updateSignalsFromState();
              loadingSignal.set(false);
            });
          }
        }
      );

      unsubRefetchAll = eventEmitter.on("refetchAll", () => {
        if (!getEnabled() || !currentController) return;

        loadingSignal.set(true);
        currentController.trigger().finally(() => {
          updateSignalsFromState();
          loadingSignal.set(false);
        });
      });

      return controller;
    };

    // Initialize controller synchronously so refetch/fetchNext/fetchPrev work immediately
    const initialCapturedCall = captureSelector();
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
      path: initialCapturedCall.path,
      method: initialCapturedCall.method,
      options: initialCapturedCall.options,
    });

    createController(initialCapturedCall, initialResolvedTags, initialQueryKey);

    effect(
      () => {
        const isEnabled = getEnabled();
        const capturedCall = captureSelector();

        const requestOptions = capturedCall.options as
          | {
              params?: Record<string, string | number>;
              query?: Record<string, unknown>;
              body?: unknown;
            }
          | undefined;

        const pathSegments = capturedCall.path.split("/").filter(Boolean);
        const resolvedPath = resolvePath(pathSegments, requestOptions?.params);
        const resolvedTags = resolveTags(
          tags !== undefined ? { tags } : undefined,
          resolvedPath
        );

        const queryKey = stateManager.createQueryKey({
          path: capturedCall.path,
          method: capturedCall.method,
          options: capturedCall.options,
        });

        const queryKeyChanged = queryKey !== currentQueryKey;

        if (!isEnabled) {
          if (isMounted && currentController) {
            currentController.unmount();
            isMounted = false;
          }

          loadingSignal.set(false);
          return;
        }

        if (queryKeyChanged) {
          if (currentController && isMounted) {
            prevContext = currentController.getContext();
            currentController.unmount();
            isMounted = false;
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

          controller.mount();
          isMounted = true;

          untracked(() => {
            loadingSignal.set(true);
            fetchingNextSignal.set(true);
            errorSignal.set(undefined);
            controller.trigger({ force: false }).finally(() => {
              updateSignalsFromState();
              loadingSignal.set(false);
              fetchingNextSignal.set(false);
            });
          });
        } else if (!isMounted && currentController) {
          currentController.mount();
          isMounted = true;

          untracked(() => {
            triggerFetch();
          });
        }
      },
      { allowSignalWrites: true }
    );

    destroyRef.onDestroy(() => {
      if (unsubInvalidate) {
        unsubInvalidate();
      }

      if (unsubRefetchAll) {
        unsubRefetchAll();
      }

      if (currentSubscription) {
        currentSubscription();
      }

      if (currentController && isMounted) {
        currentController.unmount();
      }
    });

    const fetchNext = async () => {
      if (!currentController) return;

      // Mount if not already mounted (allows manual fetch when enabled: false)
      if (!isMounted) {
        currentController.mount();
        isMounted = true;
      }

      fetchingNextSignal.set(true);

      try {
        await currentController.fetchNext();
        updateSignalsFromState();
      } finally {
        fetchingNextSignal.set(false);
      }
    };

    const fetchPrev = async () => {
      if (!currentController) return;

      // Mount if not already mounted (allows manual fetch when enabled: false)
      if (!isMounted) {
        currentController.mount();
        isMounted = true;
      }

      fetchingPrevSignal.set(true);

      try {
        await currentController.fetchPrev();
        updateSignalsFromState();
      } finally {
        fetchingPrevSignal.set(false);
      }
    };

    const trigger = async (
      options?: Partial<InfiniteRequestOptions> & { force?: boolean }
    ) => {
      if (!currentController) return;

      if (!isMounted) {
        currentController.mount();
        isMounted = true;
      }

      loadingSignal.set(true);

      try {
        await currentController.trigger(options);
        updateSignalsFromState();
      } finally {
        loadingSignal.set(false);
      }
    };

    const abort = () => {
      currentController?.abort();
    };

    const fetchingSignal = computed(
      () => fetchingNextSignal() || fetchingPrevSignal()
    );

    const result = {
      data: dataSignal as Signal<TItem[] | undefined>,
      pages: pagesSignal as Signal<
        InfinitePage<TData, TError, PluginResults["read"]>[]
      >,
      error: errorSignal as Signal<TError | undefined>,
      loading: loadingSignal,
      fetching: fetchingSignal,
      fetchingNext: fetchingNextSignal,
      fetchingPrev: fetchingPrevSignal,
      canFetchNext: canFetchNextSignal,
      canFetchPrev: canFetchPrevSignal,
      fetchNext,
      fetchPrev,
      trigger,
      abort,
    };

    return result as unknown as BasePagesResult<
      TData,
      TError,
      TItem,
      PluginResults["read"],
      PagesTriggerOptions<TReadFn>
    >;
  };
}
