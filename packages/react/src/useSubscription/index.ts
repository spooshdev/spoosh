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
  type SpooshTransport,
  type SubscriptionContext,
  createSelectorProxy,
  parseTransportPath,
  isTransportPath,
} from "@spoosh/core";
import { createSubscriptionController } from "@spoosh/core";
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
  const { config, transports, stateManager, eventEmitter, pluginExecutor } =
    options;

  function useSubscription<TSubFn extends (api: unknown) => unknown>(
    subFn: TSubFn,
    subOptions?: BaseSubscriptionOptions
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
    const { enabled = true } = subOptions ?? {};
    const currentOptionsRef = useRef<Record<string, unknown> | undefined>(
      undefined
    );
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

    currentOptionsRef.current = capturedCall.options as
      | Record<string, unknown>
      | undefined;

    const isTransport = isTransportPath(capturedCall.path);
    const transportName = isTransport
      ? parseTransportPath(capturedCall.path)?.transport
      : null;
    const transportInstance = (
      transportName ? transports.get(transportName) : null
    ) as SpooshTransport | null;

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

    const lifecycleRef = useRef<{
      initialized: boolean;
    }>({
      initialized: false,
    });

    const getOrCreateController = useCallback(() => {
      if (controllerRef.current?.queryKey === queryKey) {
        return controllerRef.current.controller;
      }

      const baseAdapter = {
        subscribe: async (context: SubscriptionContext<TData, TError>) => {
          let currentData: TData | undefined = undefined;
          const currentError: TError | undefined = undefined;
          const unsubscribers: Array<() => void> = [];

          if (transportInstance) {
            const parsed = parseTransportPath(capturedCall.path);
            if (parsed) {
              const requestOptions = currentOptionsRef.current;
              const capturedEvents = requestOptions?.events;

              const transportOptions = {
                baseUrl: config.baseUrl,
                path: parsed.channel,
                method: capturedCall.method,
                body: requestOptions?.body,
                query: requestOptions?.query,
                headers: requestOptions?.headers,
                globalHeaders: config.defaultOptions.headers,
                parse: requestOptions?.parse,
                accumulate: requestOptions?.accumulate,
              };

              const sharedCallback = (message: unknown) => {
                currentData = message as TData;

                if (context.onData) {
                  context.onData(currentData);
                }
              };

              if (Array.isArray(capturedEvents) && capturedEvents.length > 0) {
                for (const eventType of capturedEvents) {
                  const unsub = transportInstance.subscribe(
                    eventType,
                    sharedCallback
                  );
                  unsubscribers.push(unsub);
                }
              } else {
                const unsub = transportInstance.subscribe("*", sharedCallback);
                unsubscribers.push(unsub);
              }

              await transportInstance.connect(parsed.channel, transportOptions);
            }
          }

          return {
            unsubscribe: () => {
              unsubscribers.forEach((unsub) => unsub());
            },
            getData: () => {
              return currentData;
            },
            getError: () => currentError,
            onData: () => {
              return () => {};
            },
            onError: () => {
              return () => {};
            },
          };
        },
        emit: async () => ({ success: true }),
      };

      const parsed = parseTransportPath(capturedCall.path);
      const controller = createSubscriptionController<TData, TError>({
        channel: parsed?.channel || capturedCall.path,
        baseAdapter,
        stateManager,
        eventEmitter,
        pluginExecutor,
        queryKey,
        operationType: transportName || "subscription",
        path: capturedCall.path,
        method: capturedCall.method,
      });

      controllerRef.current = { controller, queryKey };
      return controller;
    }, [queryKey, transportInstance, capturedCall.path, capturedCall.method]);

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
      isSubscribed: false,
    });

    const getSnapshot = useCallback(() => {
      if (!controllerRef.current) {
        return emptyStateRef.current;
      }
      return controllerRef.current.controller.getState();
    }, []);

    const state = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

    const [requestState] = useState<{
      isPending: boolean;
      error: TError | undefined;
    }>(() => {
      return { isPending: enabled, error: undefined };
    });

    useEffect(() => {
      return () => {
        controllerRef.current?.controller.unmount();
      };
    }, []);

    useEffect(() => {
      if (!enabled) {
        return;
      }

      const { initialized } = lifecycleRef.current;

      if (!initialized) {
        const controller = getOrCreateController();
        controller.mount();
        lifecycleRef.current.initialized = true;
        controller.subscribe();
      }
    }, [queryKey, enabled, getOrCreateController]);

    const unsubscribe = useCallback(() => {
      if (controllerRef.current) {
        controllerRef.current.controller.unsubscribe();
      }
    }, []);

    const trigger = useCallback(
      async (
        newOptions?: SubscriptionTriggerInput<
          ExtractSubscriptionQuery<TSubFn>,
          ExtractSubscriptionBody<TSubFn>,
          never
        >
      ) => {
        currentOptionsRef.current = {
          ...currentOptionsRef.current,
          ...(newOptions as Record<string, unknown> | undefined),
        };

        const controller = getOrCreateController();
        controller.unsubscribe();
        lifecycleRef.current.initialized = false;

        controller.mount();
        lifecycleRef.current.initialized = true;
        await controller.subscribe();
      },
      [getOrCreateController]
    );

    const hasData = state.data !== undefined;
    const loading = requestState.isPending && !hasData;

    return {
      meta: {} as Record<string, never>,
      data: state.data as ExtractSubscriptionEvents<TSubFn> | undefined,
      error: state.error as TDefaultError | undefined,
      loading,
      isSubscribed: state.isSubscribed,
      trigger,
      unsubscribe,
    };
  }

  return useSubscription;
}

export * from "./types";
