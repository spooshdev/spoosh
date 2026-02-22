import type { ParseConfig } from "./parsers";
import type { AccumulateConfig } from "./accumulators";

declare module "@spoosh/core" {
  interface SpooshSubscriptionMethodRegistry {
    GET: {
      events?: Record<string, { data?: unknown }>;
      query?: unknown;
    };
    POST: {
      events?: Record<string, { data?: unknown }>;
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

        /** Last event ID for resuming stream */
        lastEventId?: string;

        /**
         * Parse SSE data field.
         * Defined here for documentation - actual typed version provided by core.
         */
        parse?: ParseConfig;

        /**
         * Accumulate data across events.
         * Defined here for documentation - actual typed version provided by core.
         */
        accumulate?: AccumulateConfig;
      };
      message: {
        /** Event type (e.g., "message", "notification", "alert") */
        event: string;

        /** Raw event data (unparsed string) */
        data: string;

        /** Event ID from server */
        id?: string;

        /** Timestamp when event was received (client-side) */
        timestamp: number;
      };
    };
  }
}

export {};
