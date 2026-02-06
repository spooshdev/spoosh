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
  createInfiniteReadController,
  createSelectorProxy,
  resolvePath,
  resolveTags,
} from "@spoosh/core";
import type {
  BaseInfiniteReadOptions,
  BaseInfiniteReadResult,
  InfiniteReadApiClient as ReadApiClient,
  PageContext,
} from "./types";
import type { SpooshInstanceShape } from "../types/shared";

export type AnyInfiniteRequestOptions = InfiniteRequestOptions;

export function createInjectInfiniteRead<
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

  return function injectInfiniteRead<
    TReadFn extends (
      api: ReadApiClient<TSchema, TDefaultError>
    ) => Promise<SpooshResponse<unknown, unknown>>,
    TRequest extends AnyInfiniteRequestOptions = AnyInfiniteRequestOptions,
    TItem = unknown,
  >(
    readFn: TReadFn,
    readOptions: BaseInfiniteReadOptions<
      ExtractData<TReadFn>,
      TItem,
      TRequest
    > &
      ResolveTypes<
        PluginOptions["read"],
        ResolverContext<
          TSchema,
          ExtractData<TReadFn>,
          InferError<ExtractError<TReadFn>>
        >
      >
  ): BaseInfiniteReadResult<
    ExtractData<TReadFn>,
    InferError<ExtractError<TReadFn>>,
    TItem,
    PluginResults["read"]
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
          "injectInfiniteRead requires calling an HTTP method (GET). " +
            'Example: injectInfiniteRead((api) => api("posts").GET())'
        );
      }

      return selectorResult.call;
    };

    const hookId = `angular-${Math.random().toString(36).slice(2)}`;

    const dataSignal = signal<TItem[] | undefined>(undefined);
    const allResponsesSignal = signal<TData[] | undefined>(undefined);
    const errorSignal = signal<TError | undefined>(undefined);
    const loadingSignal = signal(false);
    const canFetchNextSignal = signal(false);
    const canFetchPrevSignal = signal(false);
    const metaSignal = signal<Record<string, unknown>>({});
    const fetchingNextSignal = signal(false);
    const fetchingPrevSignal = signal(false);

    let currentController: ReturnType<
      typeof createInfiniteReadController<TData, TItem, TError, TRequest>
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
      allResponsesSignal.set(state.allResponses);
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

      const baseOptionsForKey = {
        ...(capturedCall.options as object),
        query: undefined,
        params: undefined,
        body: undefined,
      };

      const initialRequest: InfiniteRequestOptions = {
        query: requestOptions?.query,
        params: requestOptions?.params,
        body: requestOptions?.body,
      };

      const controller = createInfiniteReadController<
        TData,
        TItem,
        TError,
        TRequest
      >({
        path: capturedCall.path,
        method: capturedCall.method as "GET",
        tags: resolvedTags,
        initialRequest,
        baseOptionsForKey,
        canFetchNext: (ctx: PageContext<TData, TRequest>) =>
          callbackRefs.canFetchNext(ctx),
        canFetchPrev: canFetchPrev
          ? (ctx: PageContext<TData, TRequest>) =>
              callbackRefs.canFetchPrev?.(ctx) ?? false
          : undefined,
        nextPageRequest: (ctx: PageContext<TData, TRequest>) =>
          callbackRefs.nextPageRequest(ctx),
        prevPageRequest: prevPageRequest
          ? (ctx: PageContext<TData, TRequest>) =>
              callbackRefs.prevPageRequest?.(ctx) ?? {}
          : undefined,
        merger: (responses: TData[]) =>
          callbackRefs.merger(responses) as TItem[],
        stateManager,
        eventEmitter,
        pluginExecutor,
        hookId,
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
            query: opts.query,
            params: opts.params,
            body: opts.body,
            signal: abortSignal,
          };

          return method(fetchOptions);
        },
      });

      controller.setPluginOptions(pluginOpts);

      currentSubscription = controller.subscribe(() => {
        const state = controller.getState();
        dataSignal.set(state.data);
        allResponsesSignal.set(state.allResponses);
        errorSignal.set(state.error);
        canFetchNextSignal.set(state.canFetchNext);
        canFetchPrevSignal.set(state.canFetchPrev);

        const entry = stateManager.getCache(queryKey);
        const newMeta = entry?.meta ? Object.fromEntries(entry.meta) : {};
        metaSignal.set(newMeta);
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
            currentController.refetch().finally(() => {
              updateSignalsFromState();
              loadingSignal.set(false);
            });
          }
        }
      );

      unsubRefetchAll = eventEmitter.on("refetchAll", () => {
        if (!getEnabled() || !currentController) return;

        loadingSignal.set(true);
        currentController.refetch().finally(() => {
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
    const initialBaseOptionsForKey = {
      ...(initialCapturedCall.options as object),
      query: undefined,
      params: undefined,
      body: undefined,
    };
    const initialQueryKey = stateManager.createQueryKey({
      path: initialCapturedCall.path,
      method: initialCapturedCall.method,
      options: initialBaseOptionsForKey,
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

        const baseOptionsForKey = {
          ...(capturedCall.options as object),
          query: undefined,
          params: undefined,
          body: undefined,
        };

        const queryKey = stateManager.createQueryKey({
          path: capturedCall.path,
          method: capturedCall.method,
          options: baseOptionsForKey,
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
            triggerFetch();
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

    const trigger = async () => {
      if (!currentController) return;

      // Mount if not already mounted (allows manual fetch when enabled: false)
      if (!isMounted) {
        currentController.mount();
        isMounted = true;
      }

      loadingSignal.set(true);

      try {
        await currentController.refetch();
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
      meta: metaSignal as unknown as Signal<PluginResults["read"]>,
      data: dataSignal as Signal<TItem[] | undefined>,
      allResponses: allResponsesSignal as Signal<TData[] | undefined>,
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

    return result as unknown as BaseInfiniteReadResult<
      TData,
      TError,
      TItem,
      PluginResults["read"]
    >;
  };
}
