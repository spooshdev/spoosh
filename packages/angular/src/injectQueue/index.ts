import { signal, DestroyRef, inject } from "@angular/core";
import {
  type SpooshResponse,
  type MergePluginOptions,
  type MergePluginResults,
  type SpooshPlugin,
  type PluginTypeConfig,
  type SelectorResult,
  type ResolverContext,
  type ResolveResultTypes,
  type ResolveTypes,
  type QueueControllerConfig,
  createSelectorProxy,
  createQueueController,
} from "@spoosh/core";

import type {
  BaseQueueResult,
  QueueApiClient,
  QueueTriggerInput,
  InjectQueueOptions,
} from "./types";
import type {
  ExtractMethodQuery,
  ExtractMethodBody,
  ExtractResponseParamNames,
} from "../types/extraction";
import type { SpooshInstanceShape } from "../types/shared";

export function createInjectQueue<
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

  type PluginOptions = MergePluginOptions<TPlugins>;
  type PluginResults = MergePluginResults<TPlugins>;

  type InferError<T> = [T] extends [unknown] ? TDefaultError : T;

  type SuccessResponse<T> = Extract<T, { data: unknown; error?: undefined }>;
  type ErrorResponse<T> = Extract<T, { error: unknown; data?: undefined }>;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  type ExtractMethodData<T> = T extends (...args: any[]) => infer R
    ? SuccessResponse<Awaited<R>> extends { data: infer D }
      ? D
      : unknown
    : unknown;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  type ExtractMethodError<T> = T extends (...args: any[]) => infer R
    ? ErrorResponse<Awaited<R>> extends { error: infer E }
      ? E
      : unknown
    : unknown;

  type ExtractParamsRecord<T> =
    ExtractResponseParamNames<T> extends never
      ? never
      : Record<ExtractResponseParamNames<T>, string | number>;

  type QueueResolverContext<TMethod> = ResolverContext<
    TSchema,
    ExtractMethodData<TMethod>,
    InferError<ExtractMethodError<TMethod>>,
    ExtractMethodQuery<TMethod>,
    ExtractMethodBody<TMethod>,
    ExtractParamsRecord<TMethod>
  >;

  type ResolvedQueueOptions<TQueueFn> = ResolveTypes<
    PluginOptions["queue"],
    QueueResolverContext<TQueueFn>
  >;

  type ResolvedQueueTriggerOptions<TQueueFn> = ResolveTypes<
    PluginOptions["queueTrigger"],
    QueueResolverContext<TQueueFn>
  >;

  function injectQueue<
    TQueueFn extends (
      api: QueueApiClient<TSchema, TDefaultError>
    ) => Promise<SpooshResponse<unknown, unknown>>,
  >(
    queueFn: TQueueFn,
    queueOptions?: ResolvedQueueOptions<TQueueFn> & InjectQueueOptions
  ): BaseQueueResult<
    ExtractMethodData<TQueueFn>,
    InferError<ExtractMethodError<TQueueFn>>,
    QueueTriggerInput<TQueueFn> & ResolvedQueueTriggerOptions<TQueueFn>,
    ResolveResultTypes<
      PluginResults["queue"],
      ResolvedQueueOptions<TQueueFn> & InjectQueueOptions
    >
  > {
    const destroyRef = inject(DestroyRef);

    type TData = ExtractMethodData<TQueueFn>;
    type TError = InferError<ExtractMethodError<TQueueFn>>;
    type TMeta = ResolveResultTypes<
      PluginResults["queue"],
      ResolvedQueueOptions<TQueueFn> & InjectQueueOptions
    >;

    const captureSelector = () => {
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

      (queueFn as (api: unknown) => unknown)(selectorProxy);

      const captured = selectorResult.call ?? selectorResult.selector;

      if (!captured) {
        throw new Error(
          "injectQueue requires selecting an HTTP method. " +
            'Example: injectQueue((api) => api("uploads").POST())'
        );
      }

      return captured;
    };

    const selectedEndpoint = captureSelector();
    const { concurrency, autoStart, ...hookOptions } = queueOptions ?? {};

    const config: QueueControllerConfig = {
      path: selectedEndpoint.path,
      method: selectedEndpoint.method,
      concurrency,
      autoStart,
      operationType: "queue",
      hookOptions,
    };

    const controller = createQueueController<TData, TError, TMeta>(config, {
      api,
      stateManager,
      eventEmitter,
      pluginExecutor,
    });

    const tasksSignal = signal(controller.getQueue());
    const statsSignal = signal(controller.getStats());
    const isStartedSignal = signal(controller.isStarted());

    const unsubscribe = controller.subscribe(() => {
      tasksSignal.set(controller.getQueue());
      statsSignal.set(controller.getStats());
      isStartedSignal.set(controller.isStarted());
    });

    destroyRef.onDestroy(() => {
      unsubscribe();
      controller.clear();
    });

    const trigger = (
      input?: QueueTriggerInput<TQueueFn> &
        ResolvedQueueTriggerOptions<TQueueFn>
    ): Promise<SpooshResponse<TData, TError>> => {
      return controller.trigger(input ?? {});
    };

    return {
      trigger,
      tasks: tasksSignal.asReadonly(),
      stats: statsSignal.asReadonly(),
      abort: controller.abort,
      retry: controller.retry,
      remove: controller.remove,
      clear: controller.clear,
      setConcurrency: controller.setConcurrency,
      start: controller.start,
      isStarted: isStartedSignal.asReadonly(),
    } as BaseQueueResult<
      TData,
      TError,
      QueueTriggerInput<TQueueFn> & ResolvedQueueTriggerOptions<TQueueFn>,
      TMeta
    >;
  }

  return injectQueue;
}
