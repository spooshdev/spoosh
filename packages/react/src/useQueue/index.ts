import { useSyncExternalStore, useRef, useId, useEffect } from "react";
import {
  type SpooshResponse,
  type SpooshPlugin,
  type PluginTypeConfig,
  type SelectorResult,
  type QueueController,
  type QueueControllerConfig,
  createSelectorProxy,
  createQueueController,
} from "@spoosh/core";

import type {
  UseQueueOptions,
  UseQueueResult,
  QueueApiClient,
  QueueTriggerInput,
} from "./types";
import type {
  ExtractMethodData,
  ExtractMethodError,
} from "../types/extraction";
import type { SpooshInstanceShape } from "../create/types";

export function createUseQueue<
  TSchema,
  TDefaultError,
  TPlugins extends readonly SpooshPlugin<PluginTypeConfig>[],
>(
  options: Omit<
    SpooshInstanceShape<unknown, TSchema, TDefaultError, TPlugins>,
    "_types"
  >
) {
  const { api, stateManager, pluginExecutor, eventEmitter } = options;

  type InferError<T> = [T] extends [unknown] ? TDefaultError : T;

  function useQueue<
    TQueueFn extends (
      api: QueueApiClient<TSchema, TDefaultError>
    ) => Promise<SpooshResponse<unknown, unknown>>,
  >(
    queueFn: TQueueFn,
    queueOptions?: UseQueueOptions
  ): UseQueueResult<
    ExtractMethodData<TQueueFn>,
    InferError<ExtractMethodError<TQueueFn>>,
    QueueTriggerInput<TQueueFn>
  >;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function useQueue(queueFn: any, queueOptions?: UseQueueOptions): any {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    type TData = any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    type TError = any;

    useId();

    const selectorResultRef = useRef<SelectorResult>({
      call: null,
      selector: null,
    });

    const selectorProxy = createSelectorProxy<TSchema>((result) => {
      selectorResultRef.current = result;
    });

    (queueFn as (api: unknown) => unknown)(selectorProxy);

    const capturedCall = selectorResultRef.current.call;
    const capturedSelector = selectorResultRef.current.selector;
    const captured = capturedCall ?? capturedSelector;

    if (!captured) {
      throw new Error(
        "useQueue requires selecting an HTTP method. " +
          'Example: useQueue((api) => api("uploads").POST())'
      );
    }

    const { concurrency, ...hookOptions } = queueOptions ?? {};

    const controllerRef = useRef<QueueController<TData, TError> | null>(null);

    if (!controllerRef.current) {
      const config: QueueControllerConfig = {
        path: captured.path,
        method: captured.method,
        concurrency,
        operationType: "queue",
        hookOptions,
      };

      controllerRef.current = createQueueController<TData, TError>(config, {
        api,
        stateManager,
        eventEmitter,
        pluginExecutor,
      });
    }

    const controller = controllerRef.current;

    useEffect(() => {
      if (concurrency !== undefined) {
        controller.setConcurrency(concurrency);
      }
    }, [concurrency, controller]);

    const tasks = useSyncExternalStore(
      controller.subscribe,
      controller.getQueue,
      controller.getQueue
    );

    return {
      trigger: (input?: unknown) => controller.trigger(input ?? {}),
      tasks,
      stats: controller.getStats(),
      abort: controller.abort,
      retry: controller.retry,
      remove: controller.remove,
      clear: controller.clear,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any;
  }

  return useQueue;
}
