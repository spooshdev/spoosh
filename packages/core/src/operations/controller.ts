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
import type { EventEmitter } from "../events/emitter";
import { CACHE_FORCE_REFETCH_KEY } from "../plugins/built-in/cache";
import { createInitialState } from "../state/manager";

export type ExecuteOptions = {
  force?: boolean;
};

export type OperationController<TData = unknown, TError = unknown> = {
  execute: (
    options?: AnyRequestOptions,
    executeOptions?: ExecuteOptions
  ) => Promise<EnlaceResponse<TData, TError>>;
  getState: () => OperationState<TData, TError>;
  subscribe: (callback: () => void) => () => void;
  abort: () => void;
  refetch: () => Promise<EnlaceResponse<TData, TError>>;
  mount: () => void;
  unmount: () => void;
  updateOptions: () => void;
  setPluginOptions: (options: unknown) => void;
  setMetadata: (key: string, value: unknown) => void;
};

export type CreateOperationOptions<TData, TError> = {
  operationType: OperationType;
  path: string[];
  method: HttpMethod;
  tags: string[];
  requestOptions?: AnyRequestOptions;
  stateManager: StateManager;
  eventEmitter: EventEmitter;
  pluginExecutor: PluginExecutor;
  fetchFn: (
    options: AnyRequestOptions
  ) => Promise<EnlaceResponse<TData, TError>>;
};

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
    eventEmitter,
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
  let pluginOptions: unknown = undefined;
  let cachedState: OperationState<TData, TError> = createInitialState<
    TData,
    TError
  >();
  let currentRequestTimestamp: number = Date.now();
  let isFirstExecute = true;

  const createContext = (
    requestOptions: AnyRequestOptions = {},
    requestTimestamp: number = Date.now()
  ): PluginContext<TData, TError> => {
    const cached = stateManager.getCache<TData, TError>(queryKey);
    const state = cached?.state ?? createInitialState<TData, TError>();

    return pluginExecutor.createContext<TData, TError>({
      operationType,
      path,
      method,
      queryKey,
      tags,
      requestTimestamp,
      requestOptions: { ...initialRequestOptions, ...requestOptions },
      state,
      metadata,
      pluginOptions,
      abort: () => abortController?.abort(),
      stateManager,
      eventEmitter,
    });
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
      opts?: AnyRequestOptions,
      executeOptions?: ExecuteOptions
    ): Promise<EnlaceResponse<TData, TError>> {
      const { force = false } = executeOptions ?? {};

      if (force) {
        metadata.set(CACHE_FORCE_REFETCH_KEY, true);
      }

      if (!isFirstExecute) {
        currentRequestTimestamp = Date.now();
      }
      isFirstExecute = false;

      let context = createContext(opts, currentRequestTimestamp);

      context = await pluginExecutor.execute(
        "beforeFetch",
        operationType,
        context
      );

      if (context.skipFetch && context.state.data !== undefined) {
        return { data: context.state.data as TData, status: 200 };
      }

      const cached = stateManager.getCache<TData, TError>(queryKey);

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
            updateState({
              fetching: false,
              loading: false,
              error: response.error,
            });

            context = await pluginExecutor.execute(
              "onError",
              operationType,
              context
            );
          } else {
            updateState({
              fetching: false,
              loading: false,
              data: response.data,
              error: undefined,
              isStale: false,
              timestamp: Date.now(),
            });

            context = await pluginExecutor.execute(
              "onSuccess",
              operationType,
              context
            );
          }

          return response;
        } catch (err) {
          const errorResponse: EnlaceResponse<TData, TError> = {
            status: 0,
            error: err as TError,
            data: undefined,
          };

          context.response = errorResponse;

          updateState({
            fetching: false,
            loading: false,
            error: err as TError,
          });

          context = await pluginExecutor.execute(
            "onError",
            operationType,
            context
          );

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
      currentRequestTimestamp = Date.now();
      isFirstExecute = true;
      metadata.set("execute", (force?: boolean) =>
        controller.execute(undefined, { force })
      );
      const context = createContext({}, currentRequestTimestamp);
      pluginExecutor.execute("onMount", operationType, context);
    },

    unmount() {
      const context = createContext({}, currentRequestTimestamp);
      pluginExecutor.execute("onUnmount", operationType, context);
      this.abort();
    },

    updateOptions() {
      const context = createContext({}, currentRequestTimestamp);
      pluginExecutor.execute("onOptionsUpdate", operationType, context);
    },

    setPluginOptions(options) {
      pluginOptions = options;
    },

    setMetadata(key, value) {
      metadata.set(key, value);
    },
  };

  return controller;
}
