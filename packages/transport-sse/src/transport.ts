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

  const connections = new Map<string, {
    abortController: AbortController;
    accumulatedData: Record<string, unknown>;
  }>();
  const subscriptions = new Map<string, Set<(message: unknown) => void>>();
  const callbackEventMap = new Map<(message: unknown) => void, Set<string>>();

  const connect = async (channel: string, options?: SSETransportOptions): Promise<void> => {
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

    if (connections.has(fullUrl)) {
      return;
    }

    const abortController = new AbortController();
    const accumulatedData: Record<string, unknown> = {};
    connections.set(fullUrl, { abortController, accumulatedData });

    let retries = 0;
    const maxRetries = options?.maxRetries ?? 3;
    const retryDelay = options?.retryDelay ?? 1000;

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

    await fetchEventSource(fullUrl, {
      method,
      headers,
      body,
      credentials: options?.credentials,
      signal: abortController.signal,

      onopen: async (response) => {
        if (response.ok) {
          retries = 0;
          return;
        }

        throw new Error(`SSE connection failed: ${response.status} ${response.statusText}`);
      },

      onmessage: (event) => {
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

        if (allCallbacks.size === 0) {
          return;
        }

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
            for (const event of subscribedEvents) {
              if (accumulatedData[event] !== undefined) {
                filteredData[event] = accumulatedData[event];
              }
            }

            cb(filteredData);
          }
        });
      },

      onerror: (error) => {
        if (retries >= maxRetries) {
          throw error;
        }

        retries++;
        return retryDelay;
      },

      onclose: () => {
        connections.delete(fullUrl);
      },
    });
  };

  const disconnect = async (): Promise<void> => {
    for (const [, connection] of connections.entries()) {
      connection.abortController.abort();
    }
    connections.clear();
  };

  const subscribe = (eventType: string, callback: (message: unknown) => void): (() => void) => {
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

  return {
    name: "sse",
    operationType: "sse",
    connect,
    disconnect,
    subscribe,
    send,
    isConnected,
  };
}
