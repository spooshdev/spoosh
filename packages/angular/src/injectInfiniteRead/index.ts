import {
  signal,
  computed,
  effect,
  DestroyRef,
  inject,
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
  type ResolveResultTypes,
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

  type ExtractMergerItem<T> = T extends {
    merger: (...args: never[]) => (infer I)[];
  }
    ? I
    : unknown;

  return function injectInfiniteRead<
    TReadFn extends (
      api: ReadApiClient<TSchema, TDefaultError>
    ) => Promise<SpooshResponse<unknown, unknown>>,
    TRequest extends AnyInfiniteRequestOptions = AnyInfiniteRequestOptions,
    TReadOpts extends BaseInfiniteReadOptions<
      ExtractData<TReadFn>,
      unknown,
      TRequest
    > &
      PluginOptions["read"] = BaseInfiniteReadOptions<
      ExtractData<TReadFn>,
      unknown,
      TRequest
    > &
      PluginOptions["read"],
  >(
    readFn: TReadFn,
    readOptions: TReadOpts
  ): BaseInfiniteReadResult<
    ExtractData<TReadFn>,
    InferError<ExtractError<TReadFn>>,
    ExtractMergerItem<TReadOpts>
  > &
    ResolveResultTypes<PluginResults["read"], TReadOpts> {
    type TData = ExtractData<TReadFn>;
    type TError = InferError<ExtractError<TReadFn>>;
    type TItem = ExtractMergerItem<TReadOpts>;

    const destroyRef = inject(DestroyRef);

    const {
      enabled = true,
      tags,
      additionalTags,
      canFetchNext,
      nextPageRequest,
      merger,
      canFetchPrev,
      prevPageRequest,
      ...pluginOpts
    } = readOptions;

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
      canFetchNext,
      canFetchPrev,
      nextPageRequest,
      prevPageRequest,
      merger: merger as (responses: TData[]) => TItem[],
      stateManager,
      eventEmitter,
      pluginExecutor,
      hookId: `angular-${Math.random().toString(36).slice(2)}`,
      fetchFn: async (opts: InfiniteRequestOptions, signal: AbortSignal) => {
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
          signal,
        };

        return method(fetchOptions);
      },
    });

    controller.setPluginOptions(pluginOpts);

    const dataSignal = signal<TItem[] | undefined>(undefined);
    const allResponsesSignal = signal<TData[] | undefined>(undefined);
    const errorSignal = signal<TError | undefined>(undefined);
    const loadingSignal = signal(
      enabled && controller.getState().data === undefined
    );
    const canFetchNextSignal = signal(false);
    const canFetchPrevSignal = signal(false);

    const subscription = controller.subscribe(() => {
      const state = controller.getState();
      dataSignal.set(state.data);
      allResponsesSignal.set(state.allResponses);
      errorSignal.set(state.error);
      canFetchNextSignal.set(state.canFetchNext);
      canFetchPrevSignal.set(state.canFetchPrev);
    });

    const fetchingNextSignal = signal(false);
    const fetchingPrevSignal = signal(false);

    let prevContext: PluginContext<TData, TError> | null = null;

    controller.mount();

    if (enabled) {
      const currentState = controller.getState();

      if (currentState.data === undefined) {
        loadingSignal.set(true);
        fetchingNextSignal.set(true);
        controller.fetchNext().finally(() => {
          loadingSignal.set(false);
          fetchingNextSignal.set(false);
        });
      }

      effect(
        () => {
          if (prevContext) {
            controller.update(prevContext);
            prevContext = null;
          }
        },
        { allowSignalWrites: true }
      );

      const unsubInvalidate = eventEmitter.on(
        "invalidate",
        (invalidatedTags: string[]) => {
          const hasMatch = invalidatedTags.some((tag: string) =>
            resolvedTags.includes(tag)
          );

          if (hasMatch) {
            loadingSignal.set(true);
            controller.refetch().finally(() => loadingSignal.set(false));
          }
        }
      );

      destroyRef.onDestroy(() => {
        unsubInvalidate();
      });
    }

    destroyRef.onDestroy(() => {
      subscription();
      controller.unmount();
    });

    const fetchNext = async () => {
      fetchingNextSignal.set(true);

      try {
        await controller.fetchNext();
      } finally {
        fetchingNextSignal.set(false);
      }
    };

    const fetchPrev = async () => {
      fetchingPrevSignal.set(true);

      try {
        await controller.fetchPrev();
      } finally {
        fetchingPrevSignal.set(false);
      }
    };

    const refetch = async () => {
      loadingSignal.set(true);

      try {
        await controller.refetch();
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

    return result as unknown as BaseInfiniteReadResult<TData, TError, TItem> &
      ResolveResultTypes<PluginResults["read"], TReadOpts>;
  };
}
