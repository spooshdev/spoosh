import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import type {
  SpooshPlugin,
  PluginTypeConfig,
  DevtoolEvents,
} from "@spoosh/core";
import type { SSEMessage } from "@spoosh/transport-sse";
import { resolveParser, resolveAccumulator } from "@spoosh/transport-sse";
import { createUseSubscription } from "../useSubscription";
import type { SpooshInstanceShape } from "../create/types";
import type { SubscriptionApiClient } from "../useSubscription/types";
import type { UseSSEOptions, UseSSEResult } from "./types";
import type { ExtractAllSubscriptionEvents } from "../types/extraction";

export function createUseSSE<
  TSchema,
  TDefaultError,
  TPlugins extends readonly SpooshPlugin<PluginTypeConfig>[],
>(
  options: Omit<
    SpooshInstanceShape<unknown, TSchema, TDefaultError, TPlugins>,
    "_types"
  >
) {
  const { eventEmitter } = options;

  const useSubscription = createUseSubscription<
    TSchema,
    TDefaultError,
    TPlugins
  >(options);

  function useSSE<
    TSubFn extends (api: SubscriptionApiClient<TSchema, TDefaultError>) => {
      _subscription: true;
      events: Record<string, { data: unknown }>;
    },
  >(
    subFn: TSubFn,
    sseOptions?: UseSSEOptions
  ): UseSSEResult<ExtractAllSubscriptionEvents<TSubFn>, TDefaultError> {
    const {
      enabled = true,
      events,
      parse = "auto",
      accumulate = "replace",
      maxRetries,
      retryDelay,
    } = sseOptions ?? {};

    const [accumulatedData, setAccumulatedData] = useState<
      Record<string, unknown>
    >({});
    const [rawMessage, setRawMessage] = useState<SSEMessage | undefined>(
      undefined
    );

    const eventSet = useMemo(
      () => (events ? new Set(events) : null),
      [events?.join(",")]
    );

    const parseRef = useRef(parse);
    const accumulateRef = useRef(accumulate);
    parseRef.current = parse;
    accumulateRef.current = accumulate;

    const optionsRef = useRef<{ maxRetries?: number; retryDelay?: number }>({
      maxRetries,
      retryDelay,
    });
    optionsRef.current = { maxRetries, retryDelay };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const subscription = useSubscription(subFn as any, {
      enabled,
      _devtoolMeta: events ? { listenedEvents: events } : undefined,
    });

    useEffect(() => {
      const data = subscription.data as SSEMessage | undefined;

      if (!data) {
        return;
      }

      if (eventSet && !eventSet.has(data.event)) {
        return;
      }

      setRawMessage(data);

      const parser = resolveParser(parseRef.current, data.event);
      let parsed: unknown;

      try {
        parsed = parser(data.data);
      } catch {
        parsed = data.data;
      }

      if (parsed === undefined) {
        return;
      }

      const accumulator = resolveAccumulator(accumulateRef.current, data.event);

      setAccumulatedData((prev) => {
        const previousEventData = prev[data.event];
        let newEventData: unknown;

        try {
          newEventData = accumulator(previousEventData, parsed);
        } catch {
          newEventData = parsed;
        }

        const newAccumulated = {
          ...prev,
          [data.event]: newEventData,
        };

        eventEmitter?.emit<DevtoolEvents["spoosh:subscription:accumulate"]>(
          "spoosh:subscription:accumulate",
          {
            queryKey: subscription._queryKey,
            eventType: data.event,
            accumulatedData: newAccumulated,
            timestamp: Date.now(),
          }
        );

        return newAccumulated;
      });
    }, [subscription.data, subscription._queryKey, eventSet]);

    const reset = useCallback(() => {
      setAccumulatedData({});
      setRawMessage(undefined);
    }, []);

    const trigger = useCallback(
      async (opts?: { body?: unknown; query?: unknown }) => {
        reset();

        const triggerOpts = {
          ...(opts ?? {}),
          maxRetries: optionsRef.current.maxRetries,
          retryDelay: optionsRef.current.retryDelay,
        };

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await subscription.trigger(triggerOpts as any);
      },
      [subscription.trigger, reset]
    );

    return {
      data: Object.keys(accumulatedData).length
        ? (accumulatedData as Partial<ExtractAllSubscriptionEvents<TSubFn>>)
        : undefined,
      rawMessage,
      error: subscription.error,
      isConnected: subscription.isConnected,
      loading: subscription.loading,
      meta: {} as Record<string, never>,
      trigger,
      disconnect: subscription.disconnect,
      reset,
    };
  }

  return useSSE;
}

export * from "./types";
