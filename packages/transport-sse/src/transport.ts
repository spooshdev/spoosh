import { fetchEventSource } from "@microsoft/fetch-event-source";
import type { SpooshTransport } from "@spoosh/core";
import type { ParseConfig } from "./parsers";
import type { AccumulateConfig } from "./accumulators";
import { resolveParser } from "./parsers";
import { resolveAccumulator } from "./accumulators";

export interface SSETransportOptions {
  /** Base URL from client config */
  baseUrl?: string;

  /** Path/channel */
  path?: string;

  /** HTTP method */
  method?: string;

  /** Request body (will be JSON.stringified) */
  body?: unknown;

  /** Query parameters */
  query?: Record<string, unknown>;

  /** Hook-level headers */
  headers?: HeadersInit | (() => HeadersInit | Promise<HeadersInit>);

  /** Global headers from client config */
  globalHeaders?: HeadersInit | (() => HeadersInit | Promise<HeadersInit>);

  /** Credentials mode */
  credentials?: RequestCredentials;

  /** Max retry attempts on connection failure */
  maxRetries?: number;

  /** Delay between retries in ms */
  retryDelay?: number;

  /** Last event ID for resuming stream */
  lastEventId?: string;

  /** Parse strategy for SSE event data. Defaults to 'auto'. */
  parse?: ParseConfig;

  /** Accumulate strategy for combining events. Defaults to 'replace'. */
  accumulate?: AccumulateConfig;
}

export interface SSETransportConfig {
  /** Default parse strategy for all connections. Defaults to 'auto'. */
  parse?: ParseConfig;

  /** Default accumulate strategy for all connections. Defaults to 'replace'. */
  accumulate?: AccumulateConfig;

  /** Delay before disconnecting when no subscribers left. Helps with React Strict Mode. Defaults to 100ms. */
  disconnectDelay?: number;
}

export interface SSEMessage {
  /** Event type (e.g., "message", "notification", "alert") */
  event: string;

  /** Raw event data (unparsed string) */
  data: string;

  /** Event ID from server */
  id?: string;

  /** Timestamp when event was received (client-side) */
  timestamp: number;
}

interface ConnectionState {
  abortController: AbortController;
  accumulatedData: Record<string, unknown>;
  refCount: number;
  connectPromise: Promise<void> | null;
  isConnecting: boolean;
  isAborted: boolean;
  error: Error | null;
  disconnectCallbacks: Set<() => void>;
}

function mergeConfig<T>(transport: T | undefined, hook: T | undefined): T | undefined {
  if (!transport) return hook;
  if (!hook) return transport;

  if (
    typeof transport === "object" &&
    typeof hook === "object" &&
    !Array.isArray(transport) &&
    !Array.isArray(hook)
  ) {
    return { ...transport, ...hook };
  }

  return hook;
}

export function sse(config: SSETransportConfig = {}): SpooshTransport<SSETransportOptions, unknown> {
  const defaultParse = config.parse ?? "auto";
  const defaultAccumulate = config.accumulate ?? "replace";
  const disconnectDelay = config.disconnectDelay ?? 100;

  const connections = new Map<string, ConnectionState>();
  const disconnectTimers = new Map<string, ReturnType<typeof setTimeout>>();

  interface UrlSubscriptions {
    subscriptions: Map<string, Set<(message: unknown) => void>>;
    callbackEventMap: Map<(message: unknown) => void, Set<string>>;
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
    console.log("[SSE] Cleaning up subscriptions for URL", { url });
    urlSubscriptionsMap.delete(url);
  };

  const buildUrl = (channel: string, options?: SSETransportOptions): string => {
    const baseUrl = options?.baseUrl || "";
    const path = options?.path || channel;
    let fullUrl = `${baseUrl}/${path}`;

    if (options?.query) {
      const queryString = new URLSearchParams(
        options.query as Record<string, string>
      ).toString();

      if (queryString) {
        fullUrl = `${fullUrl}?${queryString}`;
      }
    }

    return fullUrl;
  };

  const resolveHeaders = async (
    headers: HeadersInit | (() => HeadersInit | Promise<HeadersInit>) | undefined
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

  const createConnection = (fullUrl: string, options?: SSETransportOptions): ConnectionState => {
    const abortController = new AbortController();
    const accumulatedData: Record<string, unknown> = {};

    const state: ConnectionState = {
      abortController,
      accumulatedData,
      refCount: 0,
      connectPromise: null,
      isConnecting: false,
      isAborted: false,
      error: null,
      disconnectCallbacks: new Set(),
    };

    const startConnection = (): Promise<void> => {
      return new Promise((resolve, reject) => {
        if (state.isAborted) {
          resolve();
          return;
        }

        state.isConnecting = true;
        let retries = 0;
        const maxRetries = options?.maxRetries ?? 3;
        const retryDelay = options?.retryDelay ?? 1000;
        let resolved = false;

        const runConnection = async () => {
          const globalHeaders = await resolveHeaders(options?.globalHeaders);
          const hookHeaders = await resolveHeaders(options?.headers);

          const headers: Record<string, string> = {
            ...globalHeaders,
            ...hookHeaders,
          };

          if (options?.lastEventId) {
            headers["Last-Event-ID"] = options.lastEventId;
          }

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

              onopen: async (response) => {
                if (state.isAborted) {
                  throw new Error("Connection aborted");
                }

                if (response.ok) {
                  retries = 0;
                  state.isConnecting = false;

                  if (!resolved) {
                    resolved = true;
                    console.log("[SSE] Connection opened, resolving promise");
                    resolve();
                  }

                  return;
                }

                const err = new Error(`SSE connection failed: ${response.status} ${response.statusText}`);

                if (!resolved) {
                  resolved = true;
                  reject(err);
                }

                throw err;
              },

              onmessage: (event) => {
                console.log("[SSE] onmessage received", { event: event.event, isAborted: state.isAborted, refCount: state.refCount, url: fullUrl });

                if (state.isAborted) {
                  console.log("[SSE] Ignoring message - connection is aborted");
                  return;
                }

                const urlSubs = urlSubscriptionsMap.get(fullUrl);

                if (!urlSubs) {
                  console.log("[SSE] No subscriptions for this URL, ignoring message");
                  return;
                }

                const { subscriptions, callbackEventMap } = urlSubs;
                const eventType = event.event || "message";
                const parseConfig = mergeConfig(defaultParse, options?.parse);
                const accumulateConfig = mergeConfig(defaultAccumulate, options?.accumulate);

                const parser = resolveParser(parseConfig, eventType);
                const accumulator = resolveAccumulator(accumulateConfig, eventType);

                let parsedData: unknown;
                try {
                  parsedData = parser(event.data);
                } catch {
                  parsedData = event.data;
                }

                const previousData = accumulatedData[eventType];
                try {
                  accumulatedData[eventType] = accumulator(previousData, parsedData);
                } catch {
                  accumulatedData[eventType] = parsedData;
                }

                const specificCallbacks = subscriptions.get(eventType) || new Set();
                const wildcardCallbacks = subscriptions.get("*") || new Set();
                const allCallbacks = new Set([...specificCallbacks, ...wildcardCallbacks]);

                if (allCallbacks.size === 0) return;

                allCallbacks.forEach((cb) => {
                  const subscribedEvents = callbackEventMap.get(cb);

                  if (!subscribedEvents) {
                    cb(accumulatedData);
                    return;
                  }

                  const isWildcard = subscribedEvents.has("*");

                  if (isWildcard) {
                    cb(accumulatedData);
                  } else {
                    const filteredData: Record<string, unknown> = {};

                    for (const evt of subscribedEvents) {
                      if (accumulatedData[evt] !== undefined) {
                        filteredData[evt] = accumulatedData[evt];
                      }
                    }

                    cb(filteredData);
                  }
                });
              },

              onerror: (error) => {
                if (state.isAborted) {
                  throw error;
                }

                if (retries >= maxRetries) {
                  if (!resolved) {
                    resolved = true;
                    state.error = error instanceof Error ? error : new Error(String(error));
                    reject(state.error);
                  }

                  throw error;
                }

                retries++;
                return retryDelay;
              },

              onclose: () => {
                console.log("[SSE] Connection closed by server", { url: fullUrl });
                state.isConnecting = false;

                if (!state.isAborted) {
                  console.log("[SSE] Notifying disconnect callbacks", { count: state.disconnectCallbacks.size });
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

  const connect = async (channel: string, options?: SSETransportOptions): Promise<void> => {
    const fullUrl = buildUrl(channel, options);
    console.log("[SSE] connect called", { fullUrl });

    const existingTimer = disconnectTimers.get(fullUrl);
    if (existingTimer) {
      console.log("[SSE] Cancelling pending disconnect timer", { fullUrl });
      clearTimeout(existingTimer);
      disconnectTimers.delete(fullUrl);
    }

    let connectionState = connections.get(fullUrl);

    if (connectionState) {
      connectionState.refCount++;
      console.log("[SSE] Reusing existing connection", { fullUrl, refCount: connectionState.refCount });

      if (connectionState.connectPromise) {
        await connectionState.connectPromise;
      }

      if (connectionState.error) {
        throw connectionState.error;
      }

      return;
    }

    console.log("[SSE] Creating new connection", { fullUrl });
    connectionState = createConnection(fullUrl, options);
    connectionState.refCount = 1;
    connections.set(fullUrl, connectionState);

    if (connectionState.connectPromise) {
      await connectionState.connectPromise;
    }

    console.log("[SSE] Connection established", { fullUrl, refCount: connectionState.refCount });

    if (connectionState.error) {
      throw connectionState.error;
    }
  };

  const disconnectUrl = (fullUrl: string): void => {
    console.log("[SSE] disconnectUrl called", { fullUrl });
    const connectionState = connections.get(fullUrl);

    if (!connectionState) {
      console.log("[SSE] No connection to disconnect", { fullUrl });
      return;
    }

    console.log("[SSE] Aborting and removing connection", { fullUrl });
    connectionState.isAborted = true;
    connectionState.abortController.abort();
    connections.delete(fullUrl);
    cleanupUrlSubscriptions(fullUrl);
  };

  const releaseConnection = (fullUrl: string): void => {
    console.log("[SSE] releaseConnection called", { fullUrl });
    const connectionState = connections.get(fullUrl);

    if (!connectionState) {
      console.log("[SSE] No connection to release", { fullUrl });
      return;
    }

    connectionState.refCount--;
    console.log("[SSE] Decremented refCount", { fullUrl, refCount: connectionState.refCount });

    if (connectionState.refCount <= 0) {
      console.log("[SSE] refCount is 0, scheduling disconnect", { fullUrl, delay: disconnectDelay });

      const existingTimer = disconnectTimers.get(fullUrl);
      if (existingTimer) {
        clearTimeout(existingTimer);
      }

      const timer = setTimeout(() => {
        console.log("[SSE] Disconnect timer fired", { fullUrl });
        disconnectTimers.delete(fullUrl);
        const currentState = connections.get(fullUrl);

        if (currentState && currentState.refCount <= 0) {
          disconnectUrl(fullUrl);
        } else {
          console.log("[SSE] Connection was reacquired, not disconnecting", { fullUrl, refCount: currentState?.refCount });
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

  const subscribe = (eventType: string, callback: (message: unknown) => void, url?: string): (() => void) => {
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
      callbacks.delete(callback);

      const eventSet = callbackEventMap.get(callback);
      if (eventSet) {
        eventSet.delete(eventType);

        if (eventSet.size === 0) {
          callbackEventMap.delete(callback);
        }
      }

      if (callbacks.size === 0) {
        subscriptions.delete(eventType);
      }
    };
  };

  const send = async (): Promise<void> => {
    throw new Error("SSE is unidirectional. Use HTTP POST for sending data.");
  };

  const isConnected = (): boolean => {
    return connections.size > 0;
  };

  const getConnectionUrl = (channel: string, options?: SSETransportOptions): string => {
    return buildUrl(channel, options);
  };

  const onDisconnect = (fullUrl: string, callback: () => void): (() => void) => {
    const connectionState = connections.get(fullUrl);

    if (!connectionState) {
      return () => {};
    }

    connectionState.disconnectCallbacks.add(callback);

    return () => {
      connectionState.disconnectCallbacks.delete(callback);
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
    releaseConnection,
    getConnectionUrl,
    onDisconnect,
  } as SpooshTransport<SSETransportOptions, unknown> & {
    releaseConnection: (fullUrl: string) => void;
    getConnectionUrl: (channel: string, options?: SSETransportOptions) => string;
    onDisconnect: (fullUrl: string, callback: () => void) => () => void;
  };
}
