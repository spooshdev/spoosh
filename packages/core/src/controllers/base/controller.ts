import type {
  AnyRequestOptions,
  HeadersInitOrGetter,
} from "../../types/request.types";
import type { SpooshResponse } from "../../types/response.types";
import type { OperationState, PluginContext } from "../../plugins/types";
import { createInitialState } from "../../state";
import { resolveHeadersToRecord } from "../../utils";
import type {
  CreateOperationOptions,
  ExecuteOptions,
  OperationController,
} from "./types";

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
      };

      const middlewarePromise = pluginExecutor.executeMiddleware(
        operationType,
        context,
        coreFetch
      );

      stateManager.setPendingPromise(queryKey, middlewarePromise);

      const finalResponse = await middlewarePromise;

      stateManager.setPendingPromise(queryKey, undefined);

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
