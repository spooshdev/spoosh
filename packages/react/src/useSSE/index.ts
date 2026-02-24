import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import type {
  SpooshPlugin,
  PluginTypeConfig,
  DevtoolEvents,
  SpooshTransport,
  SelectorResult,
} from "@spoosh/core";
import { createSelectorProxy } from "@spoosh/core";
import type { SSEMessage, SSEAdapterFactory } from "@spoosh/transport-sse";
import { resolveParser, resolveAccumulator } from "@spoosh/transport-sse";
import { createUseSubscription } from "../useSubscription";
import type { SpooshInstanceShape } from "../create/types";
import type { SubscriptionApiClient } from "../useSubscription/types";
import type { UseSSEOptions, UseSSEResult } from "./types";
import type { ExtractAllSubscriptionEvents } from "../types/extraction";

type SSETransport = SpooshTransport & SSEAdapterFactory;

function isSSETransport(transport: SpooshTransport): transport is SSETransport {
  return (
    "createSubscriptionAdapter" in transport &&
    typeof transport.createSubscriptionAdapter === "function"
  );
}

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
  const { eventEmitter, transports, config } = options;

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

    const transport = transports.get("sse");

    if (!transport) {
      throw new Error(
        "SSE transport not registered. Make sure to register an SSE transport before using useSSE."
      );
    }

    if (!isSSETransport(transport)) {
      throw new Error(
        "SSE transport does not implement createSubscriptionAdapter."
      );
    }

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
      throw new Error("useSSE requires calling a method");
    }

    const currentOptionsRef = useRef<Record<string, unknown> | undefined>(
      capturedCall.options as Record<string, unknown> | undefined
    );

    const adapter = useMemo(
      () =>
        transport.createSubscriptionAdapter({
          channel: capturedCall.path,
          method: capturedCall.method,
          baseUrl: config.baseUrl,
          globalHeaders: config.defaultOptions.headers,
          getRequestOptions: () => currentOptionsRef.current,
          eventEmitter,
          devtoolMeta: events ? { listenedEvents: events } : undefined,
        }),
      [capturedCall.path, capturedCall.method]
    );

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
      adapter,
      operationType: transport.operationType,
    });

    const prevVersionRef = useRef(subscription._subscriptionVersion);
    const lastMessageIndexRef = useRef<Record<string, number>>({});

    useEffect(() => {
      if (subscription._subscriptionVersion !== prevVersionRef.current) {
        setAccumulatedData({});
        setRawMessage(undefined);
        lastMessageIndexRef.current = {};
      }

      prevVersionRef.current = subscription._subscriptionVersion;
    }, [subscription._subscriptionVersion]);

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

      const parsedObj = parsed as Record<string, unknown> | undefined;
      const messageIndex =
        typeof parsedObj?.index === "number" ? parsedObj.index : undefined;

      if (messageIndex !== undefined) {
        const lastIndex = lastMessageIndexRef.current[data.event];

        if (lastIndex !== undefined && messageIndex < lastIndex) {
          setAccumulatedData({});
          setRawMessage(undefined);
          lastMessageIndexRef.current = {};
        }

        lastMessageIndexRef.current[data.event] = messageIndex;
      }

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

        currentOptionsRef.current = {
          ...currentOptionsRef.current,
          ...triggerOpts,
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
