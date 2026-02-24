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

  function useSubscription<TSubFn extends (api: unknown) => unknown>(
    subFn: TSubFn,
    subOptions: BaseSubscriptionOptions
  ): BaseSubscriptionResult<
    ExtractSubscriptionEvents<TSubFn>,
    TDefaultError,
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

    const controllerRef = useRef<ReturnType<
      typeof createSubscriptionController<TData, TError>
    > | null>(null);

    const subscriptionVersionRef = useRef(0);

    const getOrCreateController = useCallback(() => {
      if (controllerRef.current) {
        return controllerRef.current;
      }

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

      controllerRef.current = controller;
      return controller;
    }, [
      queryKey,
      adapter,
      operationType,
      capturedCall.path,
      capturedCall.method,
    ]);

    const subscribe = useCallback(
      (callback: () => void) => {
        const controller = getOrCreateController();
        return controller.subscribe(callback);
      },
      [getOrCreateController]
    );

    const emptyStateRef = useRef({
      data: undefined,
      error: undefined,
      isConnected: false,
    });

    const getSnapshot = useCallback(() => {
      if (!controllerRef.current) {
        return emptyStateRef.current;
      }

      return controllerRef.current.getState();
    }, []);

    const state = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

    const [isPending, setIsPending] = useState(enabled);

    useEffect(() => {
      if (!enabled) {
        return;
      }

      setIsPending(true);
      const controller = getOrCreateController();
      controller.mount();
      controller.subscribe();

      return () => {
        subscriptionVersionRef.current++;
        controller.unsubscribe();
      };
    }, [queryKey, enabled, getOrCreateController]);

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

      if (controllerRef.current) {
        controllerRef.current.unsubscribe();
      }
    }, []);

    const trigger = useCallback(async () => {
      setIsPending(true);
      subscriptionVersionRef.current++;
      const controller = getOrCreateController();
      controller.unsubscribe();
      controller.mount();
      await controller.subscribe();
    }, [getOrCreateController]);

    const loading = isPending;

    return {
      meta: {} as Record<string, never>,
      data: state.data as ExtractSubscriptionEvents<TSubFn> | undefined,
      error: state.error as TDefaultError | undefined,
      loading,
      isConnected: state.isConnected,
      _queryKey: queryKey,
      trigger,
      disconnect,
    };
  }

  return useSubscription;
}

export * from "./types";
