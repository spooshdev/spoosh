import {
  useSyncExternalStore,
  useRef,
  useEffect,
  useCallback,
  useState,
} from "react";
import {
  type SpooshPlugin,
  type PluginTypeConfig,
  type SelectorResult,
  createSelectorProxy,
  createSubscriptionController,
} from "@spoosh/core";
import type {
  BaseSubscriptionOptions,
  BaseSubscriptionResult,
  SubscriptionTriggerInput,
} from "./types";
import type {
  ExtractSubscriptionEvents,
  ExtractSubscriptionQuery,
  ExtractSubscriptionBody,
  ExtractSubscriptionError,
} from "../types/extraction";
import type { SpooshInstanceShape } from "../create/types";

export function createUseSubscription<
  TSchema,
  TDefaultError,
  TPlugins extends readonly SpooshPlugin<PluginTypeConfig>[],
>(
  options: Omit<
    SpooshInstanceShape<unknown, TSchema, TDefaultError, TPlugins>,
    "_types"
  >
) {
  const { stateManager, eventEmitter, pluginExecutor } = options;

  type InferSubError<T> = unknown extends T ? TDefaultError : T;

  function useSubscription<TSubFn extends (api: unknown) => unknown>(
    subFn: TSubFn,
    subOptions: BaseSubscriptionOptions
  ): BaseSubscriptionResult<
    ExtractSubscriptionEvents<TSubFn>,
    InferSubError<ExtractSubscriptionError<TSubFn>>,
    Record<string, never>,
    SubscriptionTriggerInput<
      ExtractSubscriptionQuery<TSubFn>,
      ExtractSubscriptionBody<TSubFn>,
      never
    >
  > {
    const { enabled = true, adapter, operationType } = subOptions;

    const selectorResultRef = useRef<SelectorResult>({
      call: null,
      selector: null,
    });

    const selectorProxy = createSelectorProxy<TSchema>((result) => {
      selectorResultRef.current = result;
    });

    (subFn as (api: unknown) => unknown)(selectorProxy);

    const capturedCall = selectorResultRef.current.call;

    if (!capturedCall) {
      throw new Error("useSubscription requires calling a method");
    }

    const queryKey = stateManager.createQueryKey({
      path: capturedCall.path,
      method: capturedCall.method,
      options: capturedCall.options,
    });

    type TData = unknown;
    type TError = unknown;

    const controllerRef = useRef<{
      controller: ReturnType<
        typeof createSubscriptionController<TData, TError>
      >;
      queryKey: string;
    } | null>(null);

    const subscriptionVersionRef = useRef(0);

    const queryKeyChanged =
      controllerRef.current && controllerRef.current.queryKey !== queryKey;

    if (!controllerRef.current || queryKeyChanged) {
      const controller = createSubscriptionController<TData, TError>({
        channel: capturedCall.path,
        baseAdapter: adapter as unknown as Parameters<
          typeof createSubscriptionController<TData, TError>
        >[0]["baseAdapter"],
        stateManager,
        eventEmitter,
        pluginExecutor,
        queryKey,
        operationType,
        path: capturedCall.path,
        method: capturedCall.method,
      });

      controllerRef.current = { controller, queryKey };
    }

    const controller = controllerRef.current.controller;

    const subscribe = useCallback(
      (callback: () => void) => {
        return controller.subscribe(callback);
      },
      [controller]
    );

    const getSnapshot = useCallback(() => {
      return controller.getState();
    }, [controller]);

    const state = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

    const [isPending, setIsPending] = useState(enabled);

    useEffect(() => {
      if (!enabled) {
        return;
      }

      setIsPending(true);
      controller.mount();
      controller.subscribe();

      return () => {
        subscriptionVersionRef.current++;
        controller.unsubscribe();
      };
    }, [queryKey, enabled, controller]);

    useEffect(() => {
      if (
        state.isConnected ||
        state.data !== undefined ||
        state.error !== undefined
      ) {
        setIsPending(false);
      }
    }, [state.isConnected, state.data, state.error]);

    const disconnect = useCallback(() => {
      subscriptionVersionRef.current++;
      controller.unsubscribe();
    }, [controller]);

    const trigger = useCallback(async () => {
      setIsPending(true);
      subscriptionVersionRef.current++;
      controller.unsubscribe();
      controller.mount();
      await controller.subscribe();
    }, [controller]);

    const loading = isPending;

    return {
      meta: {} as Record<string, never>,
      data: state.data as ExtractSubscriptionEvents<TSubFn> | undefined,
      error: state.error as
        | InferSubError<ExtractSubscriptionError<TSubFn>>
        | undefined,
      loading,
      isConnected: state.isConnected,
      _queryKey: queryKey,
      _subscriptionVersion: subscriptionVersionRef.current,
      trigger,
      disconnect,
    };
  }

  return useSubscription;
}

export * from "./types";
