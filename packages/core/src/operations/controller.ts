import type { HttpMethod } from "../types/common.types";
import type {
  AnyRequestOptions,
  HeadersInitOrGetter,
} from "../types/request.types";
import type { SpooshResponse } from "../types/response.types";
import type {
  OperationState,
  OperationType,
  PluginContext,
} from "../plugins/types";
import type { PluginExecutor } from "../plugins/executor";
import type { StateManager } from "../state/manager";
import type { EventEmitter } from "../events/emitter";
import { createInitialState } from "../state/manager";
import { resolveHeadersToRecord } from "../utils";

export type ExecuteOptions = {
  force?: boolean;
};

export type OperationController<TData = unknown, TError = unknown> = {
  execute: (
    options?: AnyRequestOptions,
    executeOptions?: ExecuteOptions
  ) => Promise<SpooshResponse<TData, TError>>;
  getState: () => OperationState<TData, TError>;
  subscribe: (callback: () => void) => () => void;
  abort: () => void;
  refetch: () => Promise<SpooshResponse<TData, TError>>;

  /** Called once when hook first mounts */
  mount: () => void;

  /** Called once when hook finally unmounts */
  unmount: () => void;

  /** Called when options/query changes. Pass previous context for cleanup. */
  update: (previousContext: PluginContext) => void;

  /** Get current context (for passing to update as previousContext) */
  getContext: () => PluginContext;

  setPluginOptions: (options: unknown) => void;
  setMetadata: (key: string, value: unknown) => void;
};

export type CreateOperationOptions<TData, TError> = {
  operationType: OperationType;
  path: string;
  method: HttpMethod;
  tags: string[];
  requestOptions?: AnyRequestOptions;
  stateManager: StateManager;
  eventEmitter: EventEmitter;
  pluginExecutor: PluginExecutor;
  fetchFn: (
    options: AnyRequestOptions
  ) => Promise<SpooshResponse<TData, TError>>;

  /** Unique identifier for the hook instance. Persists across queryKey changes. */
  instanceId?: string;
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
    instanceId,
  } = options;

  const queryKey = stateManager.createQueryKey({
    path,
    method,
    options: initialRequestOptions,
  });

  let abortController: AbortController | null = null;
  const temp = new Map<string, unknown>();
  let pluginOptions: unknown = undefined;
  const initialState = createInitialState<TData, TError>();
  let cachedState: OperationState<TData, TError> = initialState;
  let currentRequestTimestamp: number = Date.now();
  let isFirstExecute = true;

  const createContext = (
    requestOptions: AnyRequestOptions = {},
    requestTimestamp: number = Date.now(),
    resolvedHeaders?: Record<string, string>
  ): PluginContext => {
    const resolvedTags =
      (pluginOptions as { tags?: string[] } | undefined)?.tags ?? tags;

    return pluginExecutor.createContext({
      operationType,
      path,
      method,
      queryKey,
      tags: resolvedTags,
      requestTimestamp,
      instanceId,
      request: {
        ...initialRequestOptions,
        ...requestOptions,
        headers: resolvedHeaders ?? {},
      },
      temp,
      pluginOptions,
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
        tags,
        stale: false,
      });
    } else {
      stateManager.setCache<TData, TError>(queryKey, {
        state: { ...createInitialState<TData, TError>(), ...updater },
        tags,
        stale: false,
      });
    }
  };

  const controller: OperationController<TData, TError> = {
    async execute(
      opts?: AnyRequestOptions,
      executeOptions?: ExecuteOptions
    ): Promise<SpooshResponse<TData, TError>> {
      const { force = false } = executeOptions ?? {};

      if (!isFirstExecute) {
        currentRequestTimestamp = Date.now();
      }
      isFirstExecute = false;

      const mergedOptions = { ...initialRequestOptions, ...opts };
      const resolvedHeaders = await resolveHeadersToRecord(
        mergedOptions.headers as HeadersInitOrGetter
      );

      const context = createContext(
        opts,
        currentRequestTimestamp,
        resolvedHeaders
      );

      if (force) {
        context.forceRefetch = true;
      }

      const coreFetch = async (): Promise<SpooshResponse<TData, TError>> => {
        abortController = new AbortController();
        context.request.signal = abortController.signal;

        const fetchPromise = (async (): Promise<
          SpooshResponse<TData, TError>
        > => {
          try {
            const response = await fetchFn(context.request);

            return response;
          } catch (err) {
            const errorResponse: SpooshResponse<TData, TError> = {
              status: 0,
              error: err as TError,
              data: undefined,
            };

            return errorResponse;
          }
        })();

        stateManager.setPendingPromise(queryKey, fetchPromise);

        fetchPromise.finally(() => {
          stateManager.setPendingPromise(queryKey, undefined);
        });

        return fetchPromise;
      };

      const finalResponse = await pluginExecutor.executeMiddleware(
        operationType,
        context,
        coreFetch
      );

      if (finalResponse.data !== undefined && !finalResponse.error) {
        updateState({
          data: finalResponse.data,
          error: undefined,
          timestamp: Date.now(),
        });
      }

      return finalResponse;
    },

    getState() {
      const cached = stateManager.getCache<TData, TError>(queryKey);

      if (cached) {
        cachedState = cached.state;
      } else {
        cachedState = initialState;
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

    update(previousContext) {
      const context = createContext({}, currentRequestTimestamp);
      pluginExecutor.executeUpdateLifecycle(
        operationType,
        context,
        previousContext
      );
    },

    getContext() {
      return createContext({}, currentRequestTimestamp);
    },

    setPluginOptions(options) {
      pluginOptions = options;
    },

    setMetadata(key, value) {
      temp.set(key, value);
    },
  };

  return controller;
}
