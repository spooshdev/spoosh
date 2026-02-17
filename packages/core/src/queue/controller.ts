import type { SpooshResponse } from "../types/response.types";
import type { StateManager } from "../state/manager";
import type { EventEmitter } from "../events/emitter";
import type { InstancePluginExecutor } from "../plugins/types";
import type { HttpMethod } from "../types/common.types";

import type {
  QueueController,
  QueueControllerConfig,
  QueueItem,
  QueueTriggerInput,
} from "./types";
import { Semaphore } from "./semaphore";

const DEFAULT_CONCURRENCY = 3;

export interface QueueControllerContext {
  api: unknown;
  stateManager: StateManager;
  eventEmitter: EventEmitter;
  pluginExecutor: InstancePluginExecutor;
}

interface ItemPromiseHandlers<TData, TError> {
  resolve: (value: SpooshResponse<TData, TError>) => void;
  reject: (error: unknown) => void;
}

export function createQueueController<
  TData,
  TError,
  TMeta = Record<string, unknown>,
>(
  config: QueueControllerConfig,
  context: QueueControllerContext
): QueueController<TData, TError, TMeta> {
  const { path, method, operationType, hookOptions = {} } = config;
  const concurrency = config.concurrency ?? DEFAULT_CONCURRENCY;
  const { api, stateManager, eventEmitter, pluginExecutor } = context;

  const semaphore = new Semaphore(concurrency);
  const queue: QueueItem<TData, TError, TMeta>[] = [];
  const abortControllers = new Map<string, AbortController>();
  const subscribers = new Set<() => void>();
  const itemPromises = new Map<string, ItemPromiseHandlers<TData, TError>>();

  let cachedQueueSnapshot: QueueItem<TData, TError, TMeta>[] = [];

  const notify = () => {
    cachedQueueSnapshot = [...queue];
    subscribers.forEach((cb) => cb());
  };

  const generateId = () =>
    `q-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  const updateItem = (
    id: string,
    update: Partial<QueueItem<TData, TError, TMeta>>
  ) => {
    const item = queue.find((i) => i.id === id);

    if (item) {
      Object.assign(item, update);
    }
  };

  const executeItem = async (
    item: QueueItem<TData, TError, TMeta>
  ): Promise<SpooshResponse<TData, TError>> => {
    const acquired = await semaphore.acquire();

    if (!acquired || item.status === "aborted") {
      if (acquired) {
        semaphore.release();
      }

      const response = {
        error: new Error("Aborted") as TError,
        aborted: true,
      } as SpooshResponse<TData, TError>;

      itemPromises.get(item.id)?.resolve(response);
      itemPromises.delete(item.id);

      return response;
    }

    const abortController = new AbortController();
    abortControllers.set(item.id, abortController);

    try {
      updateItem(item.id, { status: "running" });
      notify();

      const queryKey = stateManager.createQueryKey({
        path,
        method,
        options: { ...item.input, _queueId: item.id },
      });

      const { body, query, params, ...triggerOptions } = item.input ?? {};

      const pluginContext = pluginExecutor.createContext({
        operationType,
        path,
        method: method as HttpMethod,
        queryKey,
        tags: [],
        requestTimestamp: Date.now(),
        request: {
          headers: {},
          body,
          query: query as
            | Record<string, string | number | boolean | undefined>
            | undefined,
          params,
          signal: abortController.signal,
        },
        temp: new Map(),
        pluginOptions: { ...hookOptions, ...triggerOptions },
        stateManager,
        eventEmitter,
      });

      const coreFetch = async (): Promise<SpooshResponse<TData, TError>> => {
        const pathMethods = (api as (p: string) => Record<string, unknown>)(
          path
        );
        const methodFn = pathMethods[method] as (
          o?: unknown
        ) => Promise<SpooshResponse<TData, TError>>;

        const { transport, transportOptions } = pluginContext.request as {
          transport?: string;
          transportOptions?: unknown;
        };

        return methodFn({
          body,
          query,
          params,
          signal: abortController.signal,
          transport,
          transportOptions,
        });
      };

      const response = await pluginExecutor.executeMiddleware<TData, TError>(
        operationType,
        pluginContext,
        coreFetch
      );

      const cacheEntry = stateManager.getCache(queryKey);
      const meta = (
        cacheEntry?.meta ? Object.fromEntries(cacheEntry.meta) : undefined
      ) as TMeta | undefined;

      if (response.error) {
        updateItem(item.id, { status: "error", error: response.error, meta });
        itemPromises.get(item.id)?.resolve(response);
      } else {
        updateItem(item.id, { status: "success", data: response.data, meta });
        itemPromises.get(item.id)?.resolve(response);
      }

      return response;
    } catch (err) {
      const isAborted = abortController.signal.aborted;

      if (isAborted) {
        updateItem(item.id, { status: "aborted" });
      } else {
        updateItem(item.id, { status: "error", error: err as TError });
      }

      const errorResponse = {
        error: err as TError,
        aborted: isAborted,
      } as SpooshResponse<TData, TError>;

      itemPromises.get(item.id)?.resolve(errorResponse);

      return errorResponse;
    } finally {
      abortControllers.delete(item.id);
      itemPromises.delete(item.id);
      notify();
      semaphore.release();
    }
  };

  return {
    trigger(input: QueueTriggerInput) {
      const id = generateId();
      const item: QueueItem<TData, TError, TMeta> = {
        id,
        status: "pending",
        input,
      };
      queue.push(item);
      notify();

      const promise = new Promise<SpooshResponse<TData, TError>>(
        (resolve, reject) => {
          itemPromises.set(id, { resolve, reject });
        }
      );

      executeItem(item);

      return promise;
    },

    getQueue: () => cachedQueueSnapshot,

    getStats: () => {
      let pending = 0;
      let running = 0;
      let success = 0;
      let failed = 0;

      for (const item of queue) {
        if (item.status === "pending") pending++;
        else if (item.status === "running") running++;
        else if (item.status === "success") success++;
        else if (item.status === "error" || item.status === "aborted") failed++;
      }

      const settled = success + failed;
      const total = queue.length;

      return {
        pending,
        running,
        settled,
        success,
        failed,
        total,
        percentage: total > 0 ? Math.round((settled / total) * 100) : 0,
      };
    },

    subscribe: (callback) => {
      subscribers.add(callback);
      return () => subscribers.delete(callback);
    },

    abort: (id) => {
      if (id) {
        const item = queue.find((i) => i.id === id);

        if (item && (item.status === "pending" || item.status === "running")) {
          abortControllers.get(id)?.abort();
          updateItem(id, { status: "aborted" });
          notify();
        }
      } else {
        for (const item of queue) {
          if (item.status === "pending" || item.status === "running") {
            abortControllers.get(item.id)?.abort();
            updateItem(item.id, { status: "aborted" });
          }
        }

        notify();
      }
    },

    retry: async (id) => {
      const items = id
        ? queue.filter(
            (i) =>
              i.id === id && (i.status === "error" || i.status === "aborted")
          )
        : queue.filter((i) => i.status === "error" || i.status === "aborted");

      for (const item of items) {
        updateItem(item.id, { status: "pending", error: undefined });

        itemPromises.set(item.id, {
          resolve: () => {},
          reject: () => {},
        });

        executeItem(item);
      }
    },

    remove: (id) => {
      if (id) {
        abortControllers.get(id)?.abort();
        const idx = queue.findIndex((i) => i.id === id);

        if (idx !== -1) {
          queue.splice(idx, 1);
        }
      } else {
        const active = queue.filter(
          (i) => i.status === "pending" || i.status === "running"
        );
        queue.length = 0;
        queue.push(...active);
      }

      notify();
    },

    clear: () => {
      const queryKeysToDiscard: string[] = [];

      for (const item of queue) {
        if (item.status === "pending" || item.status === "running") {
          abortControllers.get(item.id)?.abort();
          item.status = "aborted";

          const abortedResponse = {
            error: new Error("Aborted") as TError,
            aborted: true,
          } as SpooshResponse<TData, TError>;

          itemPromises.get(item.id)?.resolve(abortedResponse);
          itemPromises.delete(item.id);

          const queryKey = stateManager.createQueryKey({
            path,
            method,
            options: { ...item.input, _queueId: item.id },
          });
          queryKeysToDiscard.push(queryKey);
        }
      }

      if (queryKeysToDiscard.length > 0) {
        eventEmitter.emit("spoosh:queue-clear", {
          queryKeys: queryKeysToDiscard,
        });
      }

      queue.length = 0;
      semaphore.reset();
      notify();
    },

    setConcurrency: (newConcurrency: number) => {
      semaphore.setConcurrency(newConcurrency);
    },
  };
}
