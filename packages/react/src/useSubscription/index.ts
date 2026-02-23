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

interface SSETransportExtended extends SpooshTransport {
  releaseConnection?: (fullUrl: string) => void;
  getConnectionUrl?: (
    channel: string,
    options?: Record<string, unknown>
  ) => string;
  subscribe: (
    eventType: string,
    callback: (message: unknown) => void,
    url?: string
  ) => () => void;
  onDisconnect?: (fullUrl: string, callback: () => void) => () => void;
}

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
    ) as SSETransportExtended | null;

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

    const connectionUrlRef = useRef<string | null>(null);
    const subscriptionVersionRef = useRef(0);

    const getOrCreateController = useCallback(() => {
      if (controllerRef.current) {
        return controllerRef.current;
      }

      const baseAdapter = {
        subscribe: async (context: SubscriptionContext<TData, TError>) => {
          const thisVersion = subscriptionVersionRef.current;
          const unsubscribers: Array<() => void> = [];
          let currentData: TData | undefined = undefined;
          const currentError: TError | undefined = undefined;
          let disconnectedByServer = false;

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

              if (transportInstance.getConnectionUrl) {
                connectionUrlRef.current = transportInstance.getConnectionUrl(
                  parsed.channel,
                  transportOptions
                );
              }

              const sharedCallback = (message: unknown) => {
                if (subscriptionVersionRef.current !== thisVersion) {
                  return;
                }

                currentData = message as TData;

                if (context.onData) {
                  context.onData(currentData);
                }
              };

              if (Array.isArray(capturedEvents) && capturedEvents.length > 0) {
                for (const eventType of capturedEvents) {
                  const unsub = transportInstance.subscribe(
                    eventType,
                    sharedCallback,
                    connectionUrlRef.current || undefined
                  );
                  unsubscribers.push(unsub);
                }
              } else {
                const unsub = transportInstance.subscribe(
                  "*",
                  sharedCallback,
                  connectionUrlRef.current || undefined
                );
                unsubscribers.push(unsub);
              }

              await transportInstance.connect(parsed.channel, transportOptions);

              if (subscriptionVersionRef.current !== thisVersion) {
                unsubscribers.forEach((unsub) => unsub());

                if (
                  connectionUrlRef.current &&
                  transportInstance.releaseConnection
                ) {
                  transportInstance.releaseConnection(connectionUrlRef.current);
                }

                return {
                  unsubscribe: () => {},
                  getData: () => undefined,
                  getError: () => undefined,
                  onData: () => () => {},
                  onError: () => () => {},
                };
              }

              if (
                connectionUrlRef.current &&
                transportInstance.onDisconnect
              ) {
                const unsubDisconnect = transportInstance.onDisconnect(
                  connectionUrlRef.current,
                  () => {
                    disconnectedByServer = true;

                    if (context.onDisconnect) {
                      context.onDisconnect();
                    }
                  }
                );
                unsubscribers.push(unsubDisconnect);
              }
            }
          }

          return {
            unsubscribe: () => {
              unsubscribers.forEach((unsub) => unsub());
              unsubscribers.length = 0;

              if (
                !disconnectedByServer &&
                connectionUrlRef.current &&
                transportInstance?.releaseConnection
              ) {
                transportInstance.releaseConnection(connectionUrlRef.current);
              }
            },
            getData: () => currentData,
            getError: () => currentError,
            onData: () => () => {},
            onError: () => () => {},
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

      controllerRef.current = controller;
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
      isConnected: false,
    });

    const getSnapshot = useCallback(() => {
      if (!controllerRef.current) {
        return emptyStateRef.current;
      }

      return controllerRef.current.getState();
    }, []);

    const state = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

    const [requestState] = useState<{
      isPending: boolean;
      error: TError | undefined;
    }>(() => ({ isPending: enabled, error: undefined }));

    useEffect(() => {
      if (!enabled) {
        return;
      }

      const controller = getOrCreateController();
      controller.mount();
      controller.subscribe();

      return () => {
        subscriptionVersionRef.current++;
        controller.unsubscribe();
      };
    }, [queryKey, enabled, getOrCreateController]);

    const unsubscribe = useCallback(() => {
      subscriptionVersionRef.current++;

      if (controllerRef.current) {
        controllerRef.current.unsubscribe();
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

        subscriptionVersionRef.current++;
        const controller = getOrCreateController();
        controller.unsubscribe();
        controller.mount();
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
      isConnected: state.isConnected,
      trigger,
      unsubscribe,
    };
  }

  return useSubscription;
}

export * from "./types";
