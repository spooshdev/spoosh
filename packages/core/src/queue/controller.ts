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

export function createQueueController<TData, TError>(
  config: QueueControllerConfig,
  context: QueueControllerContext
): QueueController<TData, TError> {
  const { path, method, operationType } = config;
  const concurrency = config.concurrency ?? DEFAULT_CONCURRENCY;
  const { api, stateManager, eventEmitter, pluginExecutor } = context;

  const semaphore = new Semaphore(concurrency);
  const queue: QueueItem<TData, TError>[] = [];
  const abortControllers = new Map<string, AbortController>();
  const subscribers = new Set<() => void>();
  const itemPromises = new Map<string, ItemPromiseHandlers<TData, TError>>();

  let cachedQueueSnapshot: QueueItem<TData, TError>[] = [];

  const notify = () => {
    cachedQueueSnapshot = [...queue];
    subscribers.forEach((cb) => cb());
  };

  const generateId = () =>
    `q-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  const updateItem = (
    id: string,
    update: Partial<QueueItem<TData, TError>>
  ) => {
    const item = queue.find((i) => i.id === id);

    if (item) {
      Object.assign(item, update);
    }
  };

  const executeItem = async (
    item: QueueItem<TData, TError>
  ): Promise<SpooshResponse<TData, TError>> => {
    await semaphore.acquire();

    if (item.status === "aborted") {
      semaphore.release();
      const response = {
        error: new Error("Aborted") as TError,
      } as SpooshResponse<TData, TError>;
      itemPromises.get(item.id)?.reject(response.error);
      itemPromises.delete(item.id);
      return response;
    }

    const abortController = new AbortController();
    abortControllers.set(item.id, abortController);

    try {
      updateItem(item.id, { status: "loading" });
      notify();

      const queryKey = stateManager.createQueryKey({
        path,
        method,
        options: { ...item.input, _queueId: item.id },
      });

      const pluginContext = pluginExecutor.createContext({
        operationType,
        path,
        method: method as HttpMethod,
        queryKey,
        tags: [],
        requestTimestamp: Date.now(),
        request: {
          headers: {},
          body: item.input?.body,
          query: item.input?.query as
            | Record<string, string | number | boolean | undefined>
            | undefined,
          params: item.input?.params,
          signal: abortController.signal,
        },
        temp: new Map(),
        pluginOptions: {},
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
        return methodFn({
          ...item.input,
          signal: abortController.signal,
        });
      };

      const response = await pluginExecutor.executeMiddleware<TData, TError>(
        operationType,
        pluginContext,
        coreFetch
      );

      if (response.error) {
        updateItem(item.id, { status: "error", error: response.error });
        itemPromises.get(item.id)?.resolve(response);
      } else {
        updateItem(item.id, { status: "success", data: response.data });
        itemPromises.get(item.id)?.resolve(response);
      }

      return response;
    } catch (err) {
      if (abortController.signal.aborted) {
        updateItem(item.id, { status: "aborted" });
      } else {
        updateItem(item.id, { status: "error", error: err as TError });
      }

      const errorResponse = { error: err as TError } as SpooshResponse<
        TData,
        TError
      >;
      itemPromises.get(item.id)?.reject(err);

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
      const item: QueueItem<TData, TError> = { id, status: "pending", input };
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

    getProgress: () => {
      const completed = queue.filter(
        (i) =>
          i.status === "success" ||
          i.status === "error" ||
          i.status === "aborted"
      ).length;

      return {
        completed,
        total: queue.length,
        percentage:
          queue.length > 0 ? Math.round((completed / queue.length) * 100) : 0,
      };
    },

    subscribe: (callback) => {
      subscribers.add(callback);
      return () => subscribers.delete(callback);
    },

    abort: (id) => {
      if (id) {
        const item = queue.find((i) => i.id === id);

        if (item && (item.status === "pending" || item.status === "loading")) {
          abortControllers.get(id)?.abort();
          updateItem(id, { status: "aborted" });
          notify();
        }
      } else {
        for (const item of queue) {
          if (item.status === "pending" || item.status === "loading") {
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
          (i) => i.status === "pending" || i.status === "loading"
        );
        queue.length = 0;
        queue.push(...active);
      }

      notify();
    },

    clear: () => {
      abortControllers.forEach((c) => c.abort());
      queue.length = 0;
      notify();
    },
  };
}
