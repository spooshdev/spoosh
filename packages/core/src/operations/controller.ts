import type { HttpMethod } from "../types/common.types";
import type { AnyRequestOptions } from "../types/request.types";
import type { EnlaceResponse } from "../types/response.types";
import type {
  OperationState,
  OperationType,
  PluginContext,
} from "../plugins/types";
import type { PluginExecutor } from "../plugins/executor";
import type { StateManager } from "../state/manager";

export type OperationController<TData = unknown, TError = unknown> = {
  execute: (
    options?: AnyRequestOptions
  ) => Promise<EnlaceResponse<TData, TError>>;
  getState: () => OperationState<TData, TError>;
  subscribe: (callback: () => void) => () => void;
  abort: () => void;
  refetch: () => Promise<EnlaceResponse<TData, TError>>;
  mount: () => void;
  unmount: () => void;
  setMetadata: (key: string, value: unknown) => void;
};

export type CreateOperationOptions<TData, TError> = {
  operationType: OperationType;
  path: string[];
  method: HttpMethod;
  tags: string[];
  requestOptions?: AnyRequestOptions;
  stateManager: StateManager;
  pluginExecutor: PluginExecutor;
  fetchFn: (
    options: AnyRequestOptions
  ) => Promise<EnlaceResponse<TData, TError>>;
};

function createInitialState<TData, TError>(): OperationState<TData, TError> {
  return {
    loading: false,
    fetching: false,
    data: undefined,
    error: undefined,
    isOptimistic: false,
    isStale: true,
    timestamp: 0,
  };
}

export function createOperationController<TData, TError>(
  options: CreateOperationOptions<TData, TError>
): OperationController<TData, TError> {
  const {
    operationType,
    path,
    method,
    tags,
    requestOptions: initialRequestOptions,
    stateManager,
    pluginExecutor,
    fetchFn,
  } = options;

  const queryKey = stateManager.createQueryKey({
    path,
    method,
    options: initialRequestOptions,
  });

  let abortController: AbortController | null = null;
  const metadata = new Map<string, unknown>();
  let cachedState: OperationState<TData, TError> = createInitialState<
    TData,
    TError
  >();

  const createContext = (
    requestOptions: AnyRequestOptions = {}
  ): PluginContext<TData, TError> => {
    const cached = stateManager.getCache<TData, TError>(queryKey);
    const state = cached?.state ?? createInitialState<TData, TError>();

    return {
      operationType,
      path,
      method,
      queryKey,
      tags,
      requestOptions: { ...initialRequestOptions, ...requestOptions },
      state,
      metadata,
      abort: () => abortController?.abort(),
      getCache: () => stateManager.getCache<TData, TError>(queryKey),
      setCache: (entry) => stateManager.setCache(queryKey, entry),
      invalidateTags: (t) => stateManager.invalidateByTags(t),
      subscribe: (cb) => stateManager.subscribeCache(queryKey, cb),
      onInvalidate: (cb) => stateManager.onInvalidate(cb),
    };
  };

  const updateState = (
    updater: Partial<OperationState<TData, TError>>
  ): void => {
    const cached = stateManager.getCache<TData, TError>(queryKey);

    if (cached) {
      stateManager.setCache<TData, TError>(queryKey, {
        state: { ...cached.state, ...updater },
      });
    } else {
      stateManager.setCache<TData, TError>(queryKey, {
        state: { ...createInitialState<TData, TError>(), ...updater },
        tags,
      });
    }
  };

  const controller: OperationController<TData, TError> = {
    async execute(
      opts?: AnyRequestOptions
    ): Promise<EnlaceResponse<TData, TError>> {
      let context = createContext(opts);

      context = await pluginExecutor.execute(
        "beforeFetch",
        operationType,
        context
      );

      if (context.skipFetch && context.state.data !== undefined) {
        return { data: context.state.data as TData, status: 200 };
      }

      const cached = context.getCache();

      if (cached?.state.data !== undefined && !cached.state.isStale) {
        context = await pluginExecutor.execute(
          "onCacheHit",
          operationType,
          context
        );

        if (context.skipFetch) {
          return { data: context.state.data as TData, status: 200 };
        }
      } else {
        context = await pluginExecutor.execute(
          "onCacheMiss",
          operationType,
          context
        );
      }

      // Request deduplication: reuse in-flight promise
      const existingPromise = cached?.promise as
        | Promise<EnlaceResponse<TData, TError>>
        | undefined;

      if (existingPromise) {
        return existingPromise;
      }

      abortController = new AbortController();
      context.requestOptions.signal = abortController.signal;

      updateState({
        fetching: true,
        loading: cached?.state.data === undefined,
      });

      const fetchPromise = (async (): Promise<
        EnlaceResponse<TData, TError>
      > => {
        try {
          const response = await fetchFn(context.requestOptions);
          context.response = response;

          context = await pluginExecutor.execute(
            "afterFetch",
            operationType,
            context
          );

          if (response.error) {
            context = await pluginExecutor.execute(
              "onError",
              operationType,
              context
            );

            updateState({
              fetching: false,
              loading: false,
              error: response.error,
            });
          } else {
            context = await pluginExecutor.execute(
              "onSuccess",
              operationType,
              context
            );

            updateState({
              fetching: false,
              loading: false,
              data: response.data,
              error: undefined,
              isStale: false,
              timestamp: Date.now(),
            });
          }

          return response;
        } catch (err) {
          const errorResponse: EnlaceResponse<TData, TError> = {
            status: 0,
            error: err as TError,
            data: undefined,
          };

          context.response = errorResponse;

          context = await pluginExecutor.execute(
            "onError",
            operationType,
            context
          );

          updateState({
            fetching: false,
            loading: false,
            error: err as TError,
          });

          return errorResponse;
        }
      })();

      // Store promise for deduplication
      stateManager.setCache(queryKey, { promise: fetchPromise, tags });

      return fetchPromise;
    },

    getState() {
      const cached = stateManager.getCache<TData, TError>(queryKey);
      const newState = cached?.state;

      if (newState) {
        cachedState = newState;
      }

      return cachedState;
    },

    subscribe(callback) {
      return stateManager.subscribeCache(queryKey, callback);
    },

    abort() {
      abortController?.abort();
      abortController = null;
    },

    async refetch() {
      return this.execute();
    },

    mount() {
      metadata.set("execute", () => controller.execute());
      const context = createContext();
      pluginExecutor.execute("onMount", operationType, context);
    },

    unmount() {
      const context = createContext();
      pluginExecutor.execute("onUnmount", operationType, context);
      this.abort();
    },

    setMetadata(key, value) {
      metadata.set(key, value);
    },
  };

  return controller;
}
