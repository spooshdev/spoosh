import type { EventEmitter, SubscriptionAdapter } from "@spoosh/core";

/**
 * Options for creating an SSE subscription adapter.
 * These are HTTP-centric options specific to SSE transport.
 */
export interface SSEAdapterOptions {
  channel: string;
  method: string;
  baseUrl: string;
  globalHeaders?: HeadersInit | (() => HeadersInit | Promise<HeadersInit>);
  getRequestOptions: () => Record<string, unknown> | undefined;
  eventEmitter?: EventEmitter;

  /** Transport-specific metadata for devtool integration */
  devtoolMeta?: Record<string, unknown>;
}

/**
 * Factory interface for creating SSE subscription adapters.
 */
export interface SSEAdapterFactory<TData = unknown, TError = unknown> {
  createSubscriptionAdapter(
    options: SSEAdapterOptions
  ): SubscriptionAdapter<TData, TError>;
}

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

  /** Keep connection alive when browser tab is hidden. Defaults to true. */
  openWhenHidden?: boolean;
}

export interface SSETransportConfig {
  /** Default max retry attempts on connection failure */
  maxRetries?: number;

  /** Default delay between retries in ms */
  retryDelay?: number;

  /** Delay before disconnecting when no subscribers left. Helps with React Strict Mode. Defaults to 100ms. */
  disconnectDelay?: number;

  /** Throttle notifications to prevent UI flooding from high-frequency events. Uses requestAnimationFrame batching when set to true, or custom interval in ms. Defaults to false (no throttling). */
  throttle?: boolean | number;

  /** Keep connection alive when browser tab is hidden. Defaults to true. */
  openWhenHidden?: boolean;

  /** Custom fetch implementation. Useful for testing or custom request handling. */
  fetch?: typeof fetch;
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
      };

      message: SSEMessage;
    };
  }
}

export {};
