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
  ReadApiClient,
  SpooshInstanceShape,
  PageContext,
} from "../types";

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
      additionalTags,
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

    const capturedCall = selectorResult.call;

    if (!capturedCall) {
      throw new Error(
        "injectInfiniteRead requires calling an HTTP method ($get). " +
          "Example: injectInfiniteRead((api) => api.posts.$get())"
      );
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

    const baseOptionsForKey = {
      ...(capturedCall.options as object),
      query: undefined,
      params: undefined,
      body: undefined,
    };

    const resolvedPath = resolvePath(capturedCall.path, requestOptions?.params);
    const resolvedTags = resolveTags({ tags, additionalTags }, resolvedPath);

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
      merger: (responses: TData[]) => callbackRefs.merger(responses) as TItem[],
      stateManager,
      eventEmitter,
      pluginExecutor,
      hookId: `angular-${Math.random().toString(36).slice(2)}`,
      fetchFn: async (
        opts: InfiniteRequestOptions,
        abortSignal: AbortSignal
      ) => {
        const fetchPath = resolvePath(capturedCall.path, opts.params);

        let current: unknown = api;

        for (const segment of fetchPath) {
          current = (current as Record<string, unknown>)[segment];
        }

        const method = (current as Record<string, unknown>)[
          capturedCall.method
        ] as (opts?: unknown) => Promise<SpooshResponse<TData, TError>>;

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

    const dataSignal = signal<TItem[] | undefined>(undefined);
    const allResponsesSignal = signal<TData[] | undefined>(undefined);
    const errorSignal = signal<TError | undefined>(undefined);
    const loadingSignal = signal(false);
    const canFetchNextSignal = signal(false);
    const canFetchPrevSignal = signal(false);
    const metaSignal = signal<Record<string, unknown>>({});

    const queryKey = stateManager.createQueryKey({
      path: capturedCall.path,
      method: capturedCall.method,
      options: baseOptionsForKey,
    });

    const subscription = controller.subscribe(() => {
      const state = controller.getState();
      dataSignal.set(state.data);
      allResponsesSignal.set(state.allResponses);
      errorSignal.set(state.error);
      canFetchNextSignal.set(state.canFetchNext);
      canFetchPrevSignal.set(state.canFetchPrev);

      const entry = stateManager.getCache(queryKey);
      const newMeta = entry?.pluginResult
        ? Object.fromEntries(entry.pluginResult)
        : {};
      metaSignal.set(newMeta);
    });

    const fetchingNextSignal = signal(false);
    const fetchingPrevSignal = signal(false);

    let prevContext: PluginContext<TData, TError> | null = null;
    let hasDoneInitialFetch = false;
    let isMounted = false;

    const updateSignalsFromState = () => {
      const state = controller.getState();
      dataSignal.set(state.data);
      allResponsesSignal.set(state.allResponses);
      errorSignal.set(state.error);
      canFetchNextSignal.set(state.canFetchNext);
      canFetchPrevSignal.set(state.canFetchPrev);
    };

    const triggerFetch = () => {
      const currentState = controller.getState();
      const isFetching = untracked(
        () => fetchingNextSignal() || fetchingPrevSignal()
      );

      if (currentState.data === undefined && !isFetching) {
        loadingSignal.set(true);
        fetchingNextSignal.set(true);
        controller.fetchNext().finally(() => {
          updateSignalsFromState();
          loadingSignal.set(false);
          fetchingNextSignal.set(false);
        });
      } else if (currentState.data !== undefined) {
        updateSignalsFromState();
      }
    };

    const unsubInvalidate = eventEmitter.on(
      "invalidate",
      (invalidatedTags: string[]) => {
        if (!getEnabled()) return;

        const hasMatch = invalidatedTags.some((tag: string) =>
          resolvedTags.includes(tag)
        );

        if (hasMatch) {
          loadingSignal.set(true);
          controller.refetch().finally(() => {
            updateSignalsFromState();
            loadingSignal.set(false);
          });
        }
      }
    );

    effect(
      () => {
        const isEnabled = getEnabled();

        if (!isEnabled) {
          if (isMounted) {
            controller.unmount();
            isMounted = false;
          }

          return;
        }

        if (!isMounted) {
          controller.mount();
          isMounted = true;
        }

        if (!hasDoneInitialFetch) {
          hasDoneInitialFetch = true;
          untracked(() => {
            triggerFetch();
          });
        }

        if (prevContext) {
          untracked(() => {
            controller.update(prevContext!);
            prevContext = null;
          });
        }
      },
      { allowSignalWrites: true }
    );

    destroyRef.onDestroy(() => {
      unsubInvalidate();
    });

    destroyRef.onDestroy(() => {
      subscription();

      if (isMounted) {
        controller.unmount();
      }
    });

    const fetchNext = async () => {
      if (!getEnabled()) return;

      fetchingNextSignal.set(true);

      try {
        await controller.fetchNext();
        updateSignalsFromState();
      } finally {
        fetchingNextSignal.set(false);
      }
    };

    const fetchPrev = async () => {
      if (!getEnabled()) return;

      fetchingPrevSignal.set(true);

      try {
        await controller.fetchPrev();
        updateSignalsFromState();
      } finally {
        fetchingPrevSignal.set(false);
      }
    };

    const refetch = async () => {
      if (!getEnabled()) return;

      loadingSignal.set(true);

      try {
        await controller.refetch();
        updateSignalsFromState();
      } finally {
        loadingSignal.set(false);
      }
    };

    const abort = () => {
      controller.abort();
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
      refetch,
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
