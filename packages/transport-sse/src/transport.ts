import { fetchEventSource } from "@microsoft/fetch-event-source";
import type {
  SubscriptionAdapter,
  SubscriptionHandle,
  DevtoolEvents,
  EventEmitter,
} from "@spoosh/core";
import { sortObjectKeys } from "@spoosh/core";
import type {
  SSETransportOptions,
  SSETransportConfig,
  SSEMessage,
  SSEAdapterOptions,
  SSETransport,
} from "./types";
import { resolveParser } from "./parsers";
import { resolveAccumulator } from "./accumulators";

interface ConnectionState {
  abortController: AbortController;
  refCount: number;
  connectPromise: Promise<void> | null;
  isConnecting: boolean;
  isAborted: boolean;
  error: Error | null;
  disconnectCallbacks: Set<() => void>;
  subscriptionIds: Set<string>;
  retryCount: number;
}

export function sse(config: SSETransportConfig = {}): SSETransport {
  const disconnectDelay = config.disconnectDelay ?? 100;
  const throttleConfig = config.throttle ?? false;
  const defaultMaxRetries = config.maxRetries ?? 3;
  const defaultRetryDelay = config.retryDelay ?? 1000;
  const openWhenHidden = config.openWhenHidden ?? true;
  const customFetch = config.fetch;
  let eventEmitter: EventEmitter | undefined;

  const connections = new Map<string, ConnectionState>();
  const disconnectTimers = new Map<string, ReturnType<typeof setTimeout>>();
  const pendingNotifications = new Map<string, boolean>();
  const subscriptionToUrl = new Map<string, string>();

  interface UrlSubscriptions {
    subscriptions: Map<string, Set<(message: SSEMessage) => void>>;
    callbackEventMap: Map<(message: SSEMessage) => void, Set<string>>;
  }

  const urlSubscriptionsMap = new Map<string, UrlSubscriptions>();

  const getOrCreateUrlSubscriptions = (url: string): UrlSubscriptions => {
    let subs = urlSubscriptionsMap.get(url);

    if (!subs) {
      subs = {
        subscriptions: new Map(),
        callbackEventMap: new Map(),
      };
      urlSubscriptionsMap.set(url, subs);
    }

    return subs;
  };

  const cleanupUrlSubscriptions = (url: string): void => {
    urlSubscriptionsMap.delete(url);
    pendingNotifications.delete(url);
  };

  const buildUrl = (channel: string, options?: SSETransportOptions): string => {
    const baseUrl = options?.baseUrl || "";
    const path = options?.path || channel;
    let fullUrl = `${baseUrl}/${path}`;

    if (options?.query) {
      const sortedQuery = sortObjectKeys(options.query) as Record<
        string,
        string
      >;
      const queryString = new URLSearchParams(sortedQuery).toString();

      if (queryString) {
        fullUrl = `${fullUrl}?${queryString}`;
      }
    }

    return fullUrl;
  };

  const resolveHeaders = async (
    headers:
      | HeadersInit
      | (() => HeadersInit | Promise<HeadersInit>)
      | undefined
  ): Promise<Record<string, string>> => {
    if (!headers) return {};

    const resolved = typeof headers === "function" ? await headers() : headers;

    if (resolved instanceof Headers) {
      const result: Record<string, string> = {};
      resolved.forEach((value, key) => {
        result[key] = value;
      });
      return result;
    }

    if (Array.isArray(resolved)) {
      const result: Record<string, string> = {};
      resolved.forEach(([key, value]) => {
        result[key] = value;
      });
      return result;
    }

    return resolved as Record<string, string>;
  };

  const createConnection = (
    fullUrl: string,
    options?: SSETransportOptions
  ): ConnectionState => {
    const abortController = new AbortController();

    const state: ConnectionState = {
      abortController,
      refCount: 0,
      connectPromise: null,
      isConnecting: false,
      isAborted: false,
      error: null,
      disconnectCallbacks: new Set(),
      subscriptionIds: new Set(),
      retryCount: 0,
    };

    const startConnection = (): Promise<void> => {
      return new Promise((resolve, reject) => {
        if (state.isAborted) {
          resolve();
          return;
        }

        state.isConnecting = true;
        let retries = 0;
        const maxRetries = options?.maxRetries ?? defaultMaxRetries;
        const retryDelay = options?.retryDelay ?? defaultRetryDelay;
        let resolved = false;

        const runConnection = async () => {
          const globalHeaders = await resolveHeaders(options?.globalHeaders);
          const requestHeaders = await resolveHeaders(options?.headers);

          const headers: Record<string, string> = {
            ...globalHeaders,
            ...requestHeaders,
          };

          const method = options?.method || "GET";
          let body: string | undefined;

          if (options?.body) {
            body = JSON.stringify(options.body);
            headers["Content-Type"] = "application/json";
          }

          try {
            await fetchEventSource(fullUrl, {
              method,
              headers,
              body,
              credentials: options?.credentials,
              signal: abortController.signal,
              openWhenHidden: options?.openWhenHidden ?? openWhenHidden,
              fetch: customFetch,

              onopen: async (response) => {
                if (state.isAborted) {
                  throw new Error("Connection aborted");
                }

                if (response.ok) {
                  retries = 0;
                  state.retryCount = 0;
                  state.isConnecting = false;

                  if (!resolved) {
                    resolved = true;
                    resolve();
                  }

                  for (const subscriptionId of state.subscriptionIds) {
                    eventEmitter?.emit<
                      DevtoolEvents["spoosh:subscription:connected"]
                    >("spoosh:subscription:connected", {
                      subscriptionId,
                      timestamp: Date.now(),
                    });
                  }

                  return;
                }

                let errorResponse: unknown;

                try {
                  const contentType = response.headers.get("content-type");
                  const isJson = contentType?.includes("application/json");

                  if (isJson) {
                    errorResponse = await response.json();
                  } else {
                    const text = await response.text();
                    errorResponse = text || { status: response.status, statusText: response.statusText };
                  }
                } catch {
                  errorResponse = { status: response.status, statusText: response.statusText };
                }

                if (!resolved) {
                  resolved = true;
                  reject(errorResponse);
                }

                throw errorResponse;
              },

              onmessage: (event) => {
                if (state.isAborted) {
                  return;
                }

                if (!urlSubscriptionsMap.has(fullUrl)) {
                  return;
                }

                const eventType = event.event || "message";

                const sseMessage: SSEMessage = {
                  event: eventType,
                  data: event.data,
                  timestamp: Date.now(),
                };

                for (const subscriptionId of state.subscriptionIds) {
                  eventEmitter?.emit<
                    DevtoolEvents["spoosh:subscription:message"]
                  >("spoosh:subscription:message", {
                    subscriptionId,
                    messageId: crypto.randomUUID(),
                    eventType,
                    rawData: event.data,
                    accumulatedData: {},
                    timestamp: sseMessage.timestamp,
                  });
                }

                const notifySubscribers = () => {
                  const currentUrlSubs = urlSubscriptionsMap.get(fullUrl);

                  if (!currentUrlSubs || state.isAborted) {
                    return;
                  }

                  const currentSubscriptions = currentUrlSubs.subscriptions;
                  const specificCallbacks =
                    currentSubscriptions.get(eventType) || new Set();
                  const wildcardCallbacks =
                    currentSubscriptions.get("*") || new Set();
                  const allCallbacks = new Set([
                    ...specificCallbacks,
                    ...wildcardCallbacks,
                  ]);

                  if (allCallbacks.size === 0) return;

                  allCallbacks.forEach((cb) => {
                    cb(sseMessage);
                  });
                };

                if (!throttleConfig) {
                  notifySubscribers();
                  return;
                }

                if (pendingNotifications.get(fullUrl)) {
                  return;
                }

                pendingNotifications.set(fullUrl, true);

                const scheduleNotification = () => {
                  pendingNotifications.delete(fullUrl);
                  notifySubscribers();
                };

                if (throttleConfig === true) {
                  requestAnimationFrame(scheduleNotification);
                } else {
                  setTimeout(scheduleNotification, throttleConfig);
                }
              },

              onerror: (error) => {
                if (state.isAborted) {
                  throw error;
                }

                state.retryCount++;

                if (retries >= maxRetries) {
                  if (!resolved) {
                    resolved = true;
                    state.error =
                      error instanceof Error ? error : new Error(String(error));

                    for (const subscriptionId of state.subscriptionIds) {
                      eventEmitter?.emit<
                        DevtoolEvents["spoosh:subscription:error"]
                      >("spoosh:subscription:error", {
                        subscriptionId,
                        error: state.error,
                        retryCount: state.retryCount,
                        timestamp: Date.now(),
                      });
                    }

                    reject(state.error);
                  }

                  throw error;
                }

                retries++;
                return retryDelay;
              },

              onclose: () => {
                state.isConnecting = false;

                if (!state.isAborted) {
                  for (const subscriptionId of state.subscriptionIds) {
                    eventEmitter?.emit<
                      DevtoolEvents["spoosh:subscription:disconnect"]
                    >("spoosh:subscription:disconnect", {
                      subscriptionId,
                      reason: "server_closed",
                      timestamp: Date.now(),
                    });
                  }

                  state.disconnectCallbacks.forEach((cb) => cb());
                  state.disconnectCallbacks.clear();
                  connections.delete(fullUrl);
                  cleanupUrlSubscriptions(fullUrl);
                }
              },
            });
          } catch (err) {
            state.isConnecting = false;
            state.error = err instanceof Error ? err : new Error(String(err));

            if (!state.isAborted) {
              connections.delete(fullUrl);
            }

            if (!resolved) {
              resolved = true;
              reject(state.error);
            }
          }
        };

        runConnection();
      });
    };

    state.connectPromise = startConnection();
    return state;
  };

  const connect = async (
    channel: string,
    options?: SSETransportOptions
  ): Promise<void> => {
    const fullUrl = buildUrl(channel, options);

    const existingTimer = disconnectTimers.get(fullUrl);
    if (existingTimer) {
      clearTimeout(existingTimer);
      disconnectTimers.delete(fullUrl);
    }

    let connectionState = connections.get(fullUrl);

    if (connectionState) {
      connectionState.refCount++;

      if (connectionState.connectPromise) {
        await connectionState.connectPromise;
      }

      if (connectionState.error) {
        throw connectionState.error;
      }

      return;
    }

    connectionState = createConnection(fullUrl, options);
    connectionState.refCount = 1;
    connections.set(fullUrl, connectionState);

    if (connectionState.connectPromise) {
      await connectionState.connectPromise;
    }

    if (connectionState.error) {
      throw connectionState.error;
    }
  };

  const disconnectUrl = (fullUrl: string): void => {
    const connectionState = connections.get(fullUrl);

    if (!connectionState) {
      return;
    }

    connectionState.isAborted = true;
    connectionState.abortController.abort();
    connections.delete(fullUrl);
    cleanupUrlSubscriptions(fullUrl);
  };

  const releaseConnection = (fullUrl: string): void => {
    const connectionState = connections.get(fullUrl);

    if (!connectionState) {
      return;
    }

    connectionState.refCount--;

    if (connectionState.refCount <= 0) {
      const existingTimer = disconnectTimers.get(fullUrl);
      if (existingTimer) {
        clearTimeout(existingTimer);
      }

      const timer = setTimeout(() => {
        disconnectTimers.delete(fullUrl);
        const currentState = connections.get(fullUrl);

        if (currentState && currentState.refCount <= 0) {
          disconnectUrl(fullUrl);
        }
      }, disconnectDelay);

      disconnectTimers.set(fullUrl, timer);
    }
  };

  const disconnect = async (): Promise<void> => {
    for (const timer of disconnectTimers.values()) {
      clearTimeout(timer);
    }
    disconnectTimers.clear();

    for (const [fullUrl] of connections.entries()) {
      disconnectUrl(fullUrl);
    }
  };

  const subscribe = (
    eventType: string,
    callback: (message: SSEMessage) => void,
    url?: string
  ): (() => void) => {
    const targetUrl = url || "_global_";
    const urlSubs = getOrCreateUrlSubscriptions(targetUrl);
    const { subscriptions, callbackEventMap } = urlSubs;

    if (!subscriptions.has(eventType)) {
      subscriptions.set(eventType, new Set());
    }

    const callbacks = subscriptions.get(eventType)!;
    callbacks.add(callback);

    if (!callbackEventMap.has(callback)) {
      callbackEventMap.set(callback, new Set());
    }
    callbackEventMap.get(callback)!.add(eventType);

    return () => {
      const currentUrlSubs = urlSubscriptionsMap.get(targetUrl);

      if (!currentUrlSubs) {
        return;
      }

      const currentCallbacks = currentUrlSubs.subscriptions.get(eventType);

      if (currentCallbacks) {
        currentCallbacks.delete(callback);

        if (currentCallbacks.size === 0) {
          currentUrlSubs.subscriptions.delete(eventType);
        }
      }

      const eventSet = currentUrlSubs.callbackEventMap.get(callback);

      if (eventSet) {
        eventSet.delete(eventType);

        if (eventSet.size === 0) {
          currentUrlSubs.callbackEventMap.delete(callback);
        }
      }
    };
  };

  const send = async (): Promise<void> => {
    throw new Error("SSE is unidirectional. Use HTTP POST for sending data.");
  };

  const isConnected = (): boolean => {
    return connections.size > 0;
  };

  const getConnectionUrl = (
    channel: string,
    options?: SSETransportOptions
  ): string => {
    return buildUrl(channel, options);
  };

  const onDisconnect = (
    fullUrl: string,
    callback: () => void
  ): (() => void) => {
    const connectionState = connections.get(fullUrl);

    if (!connectionState) {
      return () => {};
    }

    connectionState.disconnectCallbacks.add(callback);

    return () => {
      connectionState.disconnectCallbacks.delete(callback);
    };
  };

  const createSubscriptionAdapter = (
    adapterOptions: SSEAdapterOptions
  ): SubscriptionAdapter => {
    if (!eventEmitter && adapterOptions.eventEmitter) {
      eventEmitter = adapterOptions.eventEmitter;
    }

    const emitter = adapterOptions.eventEmitter ?? eventEmitter;

    return {
      subscribe: async (context): Promise<SubscriptionHandle> => {
        const unsubscribers: Array<() => void> = [];
        let currentData: unknown = undefined;
        let currentError: unknown = null;
        let disconnectedByServer = false;
        const subscriptionId = crypto.randomUUID();

        const requestOptions = adapterOptions.getRequestOptions();

        // Use listenedEvents from devtoolMeta (set by useSSE) or fall back to request options
        const capturedEvents =
          (adapterOptions.devtoolMeta?.listenedEvents as
            | string[]
            | undefined) ?? (requestOptions?.events as string[] | undefined);

        const isWrite = adapterOptions.method !== "GET";

        const transportOptions: SSETransportOptions = {
          baseUrl: adapterOptions.baseUrl,
          path: adapterOptions.channel,
          method: adapterOptions.method,
          body: requestOptions?.body,
          query: requestOptions?.query as Record<string, unknown> | undefined,
          headers: requestOptions?.headers as HeadersInit | undefined,
          globalHeaders: adapterOptions.globalHeaders,
          maxRetries: isWrite
            ? 0
            : (requestOptions?.maxRetries as number | undefined),
          retryDelay: requestOptions?.retryDelay as number | undefined,
          openWhenHidden: requestOptions?.openWhenHidden as boolean | undefined,
        };

        const connectionUrl = getConnectionUrl(
          adapterOptions.channel,
          transportOptions
        );

        emitter?.emit<DevtoolEvents["spoosh:subscription:connect"]>(
          "spoosh:subscription:connect",
          {
            subscriptionId,
            channel: adapterOptions.channel,
            transport: "sse",
            connectionUrl,
            queryKey: context.queryKey ?? "",
            timestamp: Date.now(),
            listenedEvents: capturedEvents,
          }
        );

        subscriptionToUrl.set(subscriptionId, connectionUrl);

        const sharedCallback = (message: unknown) => {
          currentData = message;
          context.onData?.(message);
        };

        if (Array.isArray(capturedEvents) && capturedEvents.length > 0) {
          for (const eventType of capturedEvents) {
            const unsub = subscribe(eventType, sharedCallback, connectionUrl);
            unsubscribers.push(unsub);
          }
        } else {
          const unsub = subscribe("*", sharedCallback, connectionUrl);
          unsubscribers.push(unsub);
        }

        const existingConnection = connections.get(connectionUrl);
        const wasAlreadyConnected =
          existingConnection && !existingConnection.isConnecting;

        try {
          await connect(adapterOptions.channel, transportOptions);

          const connectionState = connections.get(connectionUrl);
          connectionState?.subscriptionIds.add(subscriptionId);

          if (wasAlreadyConnected || connectionState) {
            emitter?.emit<DevtoolEvents["spoosh:subscription:connected"]>(
              "spoosh:subscription:connected",
              {
                subscriptionId,
                timestamp: Date.now(),
              }
            );
          }

          const unsubDisconnect = onDisconnect(connectionUrl, () => {
            disconnectedByServer = true;
            context.onDisconnect?.();
          });
          unsubscribers.push(unsubDisconnect);
        } catch (err) {
          currentError = err;
          context.onError?.(currentError);

          emitter?.emit<DevtoolEvents["spoosh:subscription:error"]>(
            "spoosh:subscription:error",
            {
              subscriptionId,
              error: err instanceof Error ? err : new Error(JSON.stringify(err)),
              retryCount: 0,
              timestamp: Date.now(),
            }
          );

          emitter?.emit<DevtoolEvents["spoosh:subscription:disconnect"]>(
            "spoosh:subscription:disconnect",
            {
              subscriptionId,
              reason: "connection_error",
              timestamp: Date.now(),
            }
          );
        }

        return {
          unsubscribe: () => {
            const connState = connections.get(connectionUrl);
            connState?.subscriptionIds.delete(subscriptionId);
            subscriptionToUrl.delete(subscriptionId);

            if (!disconnectedByServer && !currentError) {
              emitter?.emit<DevtoolEvents["spoosh:subscription:disconnect"]>(
                "spoosh:subscription:disconnect",
                {
                  subscriptionId,
                  reason: "user_unsubscribed",
                  timestamp: Date.now(),
                }
              );
            }

            unsubscribers.forEach((unsub) => unsub());
            unsubscribers.length = 0;

            if (!disconnectedByServer && !currentError) {
              releaseConnection(connectionUrl);
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
  };

  return {
    name: "sse",
    operationType: "sse",
    connect,
    disconnect,
    subscribe,
    send,
    isConnected,
    createSubscriptionAdapter,
    utils: {
      resolveParser,
      resolveAccumulator,
    },
  };
}
