import type { ParseConfig } from "./parsers";
import type { AccumulateConfig } from "./accumulators";

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

  /** Request-level headers */
  headers?: HeadersInit | (() => HeadersInit | Promise<HeadersInit>);

  /** Global headers from client config */
  globalHeaders?: HeadersInit | (() => HeadersInit | Promise<HeadersInit>);

  /** Credentials mode */
  credentials?: RequestCredentials;

  /** Max retry attempts on connection failure */
  maxRetries?: number;

  /** Delay between retries in ms */
  retryDelay?: number;

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

  /** Throttle notifications to prevent UI flooding from high-frequency events. Uses requestAnimationFrame batching when set to true, or custom interval in ms. Defaults to false (no throttling). */
  throttle?: boolean | number;
}

export interface SSEMessage {
  /** Event type (e.g., "message", "notification", "alert") */
  event: string;

  /** Raw event data (unparsed string) */
  data: string;

  /** Timestamp when event was received (client-side) */
  timestamp: number;
}

declare module "@spoosh/core" {
  interface SpooshSubscriptionMethodRegistry {
    GET: {
      events?: {
        /** Default SSE event type when server doesn't specify event: field */
        message?: { data?: unknown };
        [key: string]: { data?: unknown } | undefined;
      };
      query?: unknown;
    };
    POST: {
      events?: {
        /** Default SSE event type when server doesn't specify event: field */
        message?: { data?: unknown };
        [key: string]: { data?: unknown } | undefined;
      };
      body?: unknown;
      query?: unknown;
    };
  }

  interface SpooshTransportRegistry {
    sse: {
      options: {
        /** Custom headers for authentication, etc. */
        headers?: Record<string, string>;

        /** Credentials mode */
        credentials?: RequestCredentials;

        /** Max retry attempts on connection failure */
        maxRetries?: number;

        /** Delay between retries in ms */
        retryDelay?: number;

        /** Parse SSE data field. Strategies inferred by core for typed callbacks. */
        parse?: ParseConfig;

        /** Accumulate data across events. Strategies inferred by core for typed callbacks. */
        accumulate?: AccumulateConfig;
      };

      message: {
        /** Event type (e.g., "message", "notification", "alert") */
        event: string;

        /** Raw event data (unparsed string) */
        data: string;

        /** Timestamp when event was received (client-side) */
        timestamp: number;
      };
    };
  }
}

export {};
