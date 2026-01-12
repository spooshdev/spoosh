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

  /** Unique identifier for the hook instance. Persists across queryKey changes. */
  hookId?: string;
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
    hookId,
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

    const resolvedTags =
      (pluginOptions as { tags?: string[] } | undefined)?.tags ?? tags;

    return pluginExecutor.createContext<TData, TError>({
      operationType,
      path,
      method,
      queryKey,
      tags: resolvedTags,
      requestTimestamp,
      hookId,
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

      if (!isFirstExecute) {
        currentRequestTimestamp = Date.now();
      }
      isFirstExecute = false;

      const context = createContext(opts, currentRequestTimestamp);

      if (force) {
        context.forceRefetch = true;
      }

      const coreFetch = async (): Promise<EnlaceResponse<TData, TError>> => {
        const cached = stateManager.getCache<TData, TError>(queryKey);

        abortController = new AbortController();
        context.requestOptions.signal = abortController.signal;

        updateState({
          fetching: true,
          loading:
            operationType === "write" || cached?.state.data === undefined,
        });

        const fetchPromise = (async (): Promise<
          EnlaceResponse<TData, TError>
        > => {
          try {
            const response = await fetchFn(context.requestOptions);
            context.response = response;

            if (response.error) {
              updateState({
                fetching: false,
                loading: false,
                error: response.error,
              });
            } else {
              updateState({
                fetching: false,
                loading: false,
                data: response.data,
                error: undefined,
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

            updateState({
              fetching: false,
              loading: false,
              error: err as TError,
            });

            return errorResponse;
          }
        })();

        stateManager.setCache(queryKey, { promise: fetchPromise, tags });
        fetchPromise.finally(() => {
          stateManager.setCache(queryKey, { promise: undefined });
        });

        return fetchPromise;
      };

      return pluginExecutor.executeMiddleware(
        operationType,
        context,
        coreFetch
      );
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
      const context = createContext({}, currentRequestTimestamp);
      pluginExecutor.executeLifecycle("onMount", operationType, context);
    },

    unmount() {
      const context = createContext({}, currentRequestTimestamp);
      pluginExecutor.executeLifecycle("onUnmount", operationType, context);
    },

    updateOptions() {
      const context = createContext({}, currentRequestTimestamp);
      pluginExecutor.executeLifecycle(
        "onOptionsUpdate",
        operationType,
        context
      );
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
