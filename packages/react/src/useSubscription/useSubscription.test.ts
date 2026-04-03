/**
 * @vitest-environment jsdom
 */
import { renderHook, act, waitFor } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";
import { createStateManager, createEventEmitter } from "@spoosh/test-utils";
import { createPluginExecutor } from "@spoosh/core";
import type { SpooshTransport, SubscriptionContext } from "@spoosh/core";
import type {
  SSEAdapterFactory,
  SSEAdapterOptions,
} from "@spoosh/transport-sse";
import { createUseSubscription } from "./index";

interface MockSubscriptionContext {
  callbacks: Set<(message: unknown) => void>;
  eventCallbacks: Map<string, Set<(message: unknown) => void>>;
  isConnected: boolean;
}

function createMockTransport(): SpooshTransport &
  SSEAdapterFactory & {
    mockContext: MockSubscriptionContext;
    triggerMessage: (event: string, data: unknown) => void;
    triggerError: (error: Error) => void;
  } {
  const mockContext: MockSubscriptionContext = {
    callbacks: new Set(),
    eventCallbacks: new Map(),
    isConnected: false,
  };

  const triggerMessage = (event: string, data: unknown) => {
    const eventCallbacks = mockContext.eventCallbacks.get(event);
    if (eventCallbacks) {
      const message = { [event]: data };
      eventCallbacks.forEach((cb) => cb(message));
    }

    const wildcardCallbacks = mockContext.eventCallbacks.get("*");
    if (wildcardCallbacks) {
      const message = { [event]: data };
      wildcardCallbacks.forEach((cb) => cb(message));
    }
  };

  const triggerError = (error: Error) => {
    console.error("Transport error:", error);
  };

  const connectFn = vi.fn(async () => {
    mockContext.isConnected = true;
  });

  const subscribeFn = vi.fn(
    (event: string, callback: (message: unknown) => void) => {
      if (!mockContext.eventCallbacks.has(event)) {
        mockContext.eventCallbacks.set(event, new Set());
      }
      mockContext.eventCallbacks.get(event)?.add(callback);
      mockContext.callbacks.add(callback);

      return () => {
        mockContext.eventCallbacks.get(event)?.delete(callback);
        mockContext.callbacks.delete(callback);
      };
    }
  );

  const releaseConnectionFn = vi.fn();

  const createSubscriptionAdapter = (adapterOptions: SSEAdapterOptions) => {
    return {
      subscribe: async (context: SubscriptionContext) => {
        const unsubscribers: Array<() => void> = [];
        let currentData: unknown = undefined;

        const requestOptions = adapterOptions.getRequestOptions();
        const capturedEvents = requestOptions?.events as string[] | undefined;

        const sharedCallback = (message: unknown) => {
          currentData = message;
          context.onData?.(message);
        };

        if (Array.isArray(capturedEvents) && capturedEvents.length > 0) {
          for (const eventType of capturedEvents) {
            const unsub = subscribeFn(eventType, sharedCallback);
            unsubscribers.push(unsub);
          }
        } else {
          const unsub = subscribeFn("*", sharedCallback);
          unsubscribers.push(unsub);
        }

        await connectFn();

        return {
          unsubscribe: () => {
            unsubscribers.forEach((unsub) => unsub());
            unsubscribers.length = 0;
            releaseConnectionFn();
          },
          getData: () => currentData,
          getError: () => undefined,
          onData: () => () => {},
          onError: () => () => {},
        };
      },
      emit: async () => ({ success: true }),
    };
  };

  const transport: SpooshTransport &
    SSEAdapterFactory & {
      mockContext: MockSubscriptionContext;
      triggerMessage: typeof triggerMessage;
      triggerError: typeof triggerError;
    } = {
    name: "sse",
    operationType: "sse",
    connect: connectFn,
    disconnect: vi.fn(async () => {
      mockContext.isConnected = false;
      mockContext.callbacks.clear();
      mockContext.eventCallbacks.clear();
    }),
    subscribe: subscribeFn,
    send: vi.fn(async () => {}),
    isConnected: () => mockContext.isConnected,
    createSubscriptionAdapter,
    mockContext,
    triggerMessage,
    triggerError,
  };

  return transport;
}

function createTestHooks() {
  const stateManager = createStateManager();
  const eventEmitter = createEventEmitter();
  const pluginExecutor = createPluginExecutor([]);
  const transport = createMockTransport();
  const transports = new Map([["sse", transport]]);

  const adapter = transport.createSubscriptionAdapter({
    channel: "test",
    method: "GET",
    baseUrl: "/api",
    getRequestOptions: () => undefined,
    eventEmitter,
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const baseUseSubscription = createUseSubscription<any, unknown, []>({
    api: {} as never,
    stateManager,
    eventEmitter,
    pluginExecutor,
    transports,
    config: { baseUrl: "/api", defaultOptions: {} },
  });

  const useSubscription = (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    subFn: (api: any) => unknown,
    options?: { enabled?: boolean }
  ) => {
    return baseUseSubscription(subFn, {
      adapter,
      operationType: "sse",
      ...options,
    });
  };

  return {
    useSubscription,
    stateManager,
    eventEmitter,
    transport,
    transports,
  };
}

describe("useSubscription", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("basic functionality", () => {
    it("should return expected properties", async () => {
      const { useSubscription } = createTestHooks();

      let hookResult;
      await act(async () => {
        hookResult = renderHook(() =>
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          useSubscription((api: any) => api("messages").GET())
        );
      });

      const { result } = hookResult!;

      expect(result.current).toHaveProperty("data");
      expect(result.current).toHaveProperty("error");
      expect(result.current).toHaveProperty("loading");
      expect(result.current).toHaveProperty("isConnected");
      expect(result.current).toHaveProperty("trigger");
      expect(result.current).toHaveProperty("disconnect");
      expect(result.current).toHaveProperty("meta");
    });

    it("should start with loading state when enabled", async () => {
      const { useSubscription } = createTestHooks();

      let hookResult;
      await act(async () => {
        hookResult = renderHook(() =>
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          useSubscription((api: any) => api("messages").GET())
        );
      });

      const { result } = hookResult!;

      expect(result.current.data).toBeUndefined();
      expect(typeof result.current.loading).toBe("boolean");
      expect(typeof result.current.isConnected).toBe("boolean");
    });

    it("should not subscribe when enabled is false", () => {
      const { useSubscription, transport } = createTestHooks();

      renderHook(() =>
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        useSubscription((api: any) => api("messages").GET(), {
          enabled: false,
        })
      );

      expect(transport.connect).not.toHaveBeenCalled();
      expect(transport.subscribe).not.toHaveBeenCalled();
    });
  });

  describe("subscription lifecycle", () => {
    it("should connect and subscribe on mount", async () => {
      const { useSubscription, transport } = createTestHooks();

      renderHook(() =>
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        useSubscription((api: any) => api("messages").GET())
      );

      await waitFor(() => {
        expect(transport.connect).toHaveBeenCalled();
        expect(transport.subscribe).toHaveBeenCalled();
      });
    });

    it("should handle incoming messages", async () => {
      const { useSubscription, transport } = createTestHooks();

      const { result } = renderHook(() =>
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        useSubscription((api: any) => api("messages").GET())
      );

      await waitFor(() => {
        expect(transport.subscribe).toHaveBeenCalled();
      });

      act(() => {
        transport.triggerMessage("message", { text: "Hello" });
      });

      await waitFor(() => {
        expect(result.current.data).toEqual({ message: { text: "Hello" } });
        expect(result.current.isConnected).toBe(true);
        expect(result.current.loading).toBe(false);
      });
    });

    it("should unsubscribe on unmount", async () => {
      const { useSubscription, transport } = createTestHooks();

      const { unmount } = renderHook(() =>
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        useSubscription((api: any) => api("messages").GET())
      );

      await waitFor(() => {
        expect(transport.subscribe).toHaveBeenCalled();
      });

      const subscribeCall = vi.mocked(transport.subscribe).mock.results[0];
      const unsubscribeFn = subscribeCall?.value;

      unmount();

      await waitFor(() => {
        expect(unsubscribeFn).toBeDefined();
      });
    });

    it("should call disconnect function when unmounting", async () => {
      const { useSubscription, transport } = createTestHooks();

      const { result } = renderHook(() =>
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        useSubscription((api: any) => api("messages").GET())
      );

      await waitFor(() => {
        expect(transport.subscribe).toHaveBeenCalled();
      });

      act(() => {
        result.current.disconnect();
      });

      await waitFor(() => {
        expect(result.current.isConnected).toBe(false);
      });
    });

    it("should not reconnect after disconnect when data arrives", async () => {
      const { useSubscription, transport } = createTestHooks();

      const { result } = renderHook(() =>
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        useSubscription((api: any) => api("messages").GET())
      );

      await waitFor(() => {
        expect(transport.subscribe).toHaveBeenCalled();
      });

      act(() => {
        transport.triggerMessage("message", { text: "First message" });
      });

      await waitFor(() => {
        expect(result.current.isConnected).toBe(true);
        expect(result.current.data).toBeDefined();
      });

      act(() => {
        result.current.disconnect();
      });

      await waitFor(() => {
        expect(result.current.isConnected).toBe(false);
      });

      act(() => {
        transport.triggerMessage("message", { text: "After disconnect" });
      });

      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(result.current.isConnected).toBe(false);
      expect(result.current.data).toEqual({
        message: { text: "First message" },
      });
    });

    it("should preserve data when disconnect is called", async () => {
      const { useSubscription, transport } = createTestHooks();

      const { result } = renderHook(() =>
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        useSubscription((api: any) => api("messages").GET())
      );

      await waitFor(() => {
        expect(transport.subscribe).toHaveBeenCalled();
      });

      act(() => {
        transport.triggerMessage("message", { text: "Test data" });
      });

      await waitFor(() => {
        expect(result.current.data).toEqual({ message: { text: "Test data" } });
        expect(result.current.isConnected).toBe(true);
      });

      act(() => {
        result.current.disconnect();
      });

      await waitFor(() => {
        expect(result.current.isConnected).toBe(false);
      });

      expect(result.current.data).toEqual({ message: { text: "Test data" } });
    });

    it("should preserve data when enabled changes from true to false", async () => {
      const { useSubscription, transport } = createTestHooks();

      const { result, rerender } = renderHook(
        ({ enabled }) =>
          useSubscription(
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (api: any) => api("messages").GET(),
            { enabled }
          ),
        { initialProps: { enabled: true } }
      );

      await waitFor(() => {
        expect(transport.subscribe).toHaveBeenCalled();
      });

      act(() => {
        transport.triggerMessage("message", { text: "Preserved data" });
      });

      await waitFor(() => {
        expect(result.current.data).toEqual({
          message: { text: "Preserved data" },
        });
        expect(result.current.isConnected).toBe(true);
      });

      rerender({ enabled: false });

      await waitFor(() => {
        expect(result.current.isConnected).toBe(false);
      });

      expect(result.current.data).toEqual({
        message: { text: "Preserved data" },
      });
    });
  });

  describe("trigger functionality", () => {
    it("should resubscribe when trigger is called", async () => {
      const { useSubscription, transport } = createTestHooks();

      const { result } = renderHook(() =>
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        useSubscription((api: any) => api("messages").POST())
      );

      await waitFor(() => {
        expect(transport.connect).toHaveBeenCalledTimes(1);
      });

      await act(async () => {
        await result.current.trigger({ body: { filter: "new" } });
      });

      await waitFor(() => {
        expect(transport.connect).toHaveBeenCalledTimes(2);
      });
    });

    it("should merge trigger options with initial options", async () => {
      const { useSubscription, transport } = createTestHooks();

      const { result } = renderHook(() =>
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        useSubscription((api: any) =>
          api("messages").POST({
            query: { page: "1" },
          })
        )
      );

      await waitFor(() => {
        expect(transport.connect).toHaveBeenCalled();
      });

      await act(async () => {
        await result.current.trigger({ body: { filter: "active" } });
      });

      await waitFor(() => {
        expect(transport.connect).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe("error handling", () => {
    it("should throw error when no method is called", () => {
      const { useSubscription } = createTestHooks();

      expect(() => {
        renderHook(() =>
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          useSubscription((api: any) => api("messages"))
        );
      }).toThrow("useSubscription requires calling a method");
    });
  });

  describe("multiple events", () => {
    it("should accumulate data from different events", async () => {
      const { useSubscription, transport } = createTestHooks();

      const { result } = renderHook(() =>
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        useSubscription((api: any) =>
          api("chat").POST({
            events: ["chunk", "done"],
          })
        )
      );

      await waitFor(() => {
        expect(transport.subscribe).toHaveBeenCalled();
      });

      act(() => {
        transport.triggerMessage("chunk", "Hello ");
      });

      await waitFor(() => {
        expect(result.current.data).toEqual({ chunk: "Hello " });
      });

      act(() => {
        transport.triggerMessage("chunk", "World");
      });

      await waitFor(() => {
        expect(result.current.data).toEqual({ chunk: "World" });
      });

      act(() => {
        transport.triggerMessage("done", { finished: true });
      });

      await waitFor(() => {
        expect(result.current.data).toHaveProperty("done");
        expect(result.current.data).toEqual(
          expect.objectContaining({
            done: { finished: true },
          })
        );
      });
    });
  });

  describe("options", () => {
    it("should support enabled toggle", async () => {
      const { useSubscription, transport } = createTestHooks();

      const { rerender } = renderHook(
        ({ enabled }) =>
          useSubscription(
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (api: any) => api("messages").GET(),
            { enabled }
          ),
        { initialProps: { enabled: false } }
      );

      expect(transport.connect).not.toHaveBeenCalled();

      rerender({ enabled: true });

      await waitFor(() => {
        expect(transport.connect).toHaveBeenCalled();
      });
    });
  });

  describe("loading state", () => {
    it("should start with loading true when enabled", () => {
      const { useSubscription } = createTestHooks();

      const { result, unmount } = renderHook(() =>
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        useSubscription((api: any) => api("messages").GET())
      );

      expect(result.current.loading).toBe(true);

      unmount();
    });

    it("should start with loading false when enabled is false", () => {
      const { useSubscription } = createTestHooks();

      const { result } = renderHook(() =>
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        useSubscription((api: any) => api("messages").GET(), {
          enabled: false,
        })
      );

      expect(result.current.loading).toBe(false);
    });

    it("should set loading to false after receiving data", async () => {
      const { useSubscription, transport } = createTestHooks();

      const { result } = renderHook(() =>
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        useSubscription((api: any) => api("messages").GET())
      );

      expect(result.current.loading).toBe(true);

      await waitFor(() => {
        expect(transport.subscribe).toHaveBeenCalled();
      });

      act(() => {
        transport.triggerMessage("message", { text: "Test" });
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
        expect(result.current.data).toBeDefined();
      });
    });

    it("should set loading to false when connected", async () => {
      const { useSubscription, transport } = createTestHooks();

      const { result } = renderHook(() =>
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        useSubscription((api: any) => api("messages").GET())
      );

      expect(result.current.loading).toBe(true);

      await waitFor(() => {
        expect(transport.connect).toHaveBeenCalled();
      });

      await waitFor(() => {
        expect(result.current.isConnected).toBe(true);
        expect(result.current.loading).toBe(false);
      });
    });

    it("should set loading to true when trigger is called", async () => {
      const { useSubscription, transport } = createTestHooks();

      const { result } = renderHook(() =>
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        useSubscription((api: any) => api("messages").POST(), {
          enabled: false,
        })
      );

      expect(result.current.loading).toBe(false);

      await act(async () => {
        result.current.trigger({ body: { message: "test" } });
      });

      await waitFor(() => {
        expect(transport.connect).toHaveBeenCalled();
      });

      await waitFor(() => {
        expect(result.current.isConnected).toBe(true);
      });
    });

    it("should transition loading state correctly through full lifecycle", async () => {
      const { useSubscription, transport } = createTestHooks();

      const { result } = renderHook(() =>
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        useSubscription((api: any) => api("messages").GET())
      );

      expect(result.current.loading).toBe(true);
      expect(result.current.isConnected).toBe(false);
      expect(result.current.data).toBeUndefined();

      await waitFor(() => {
        expect(transport.connect).toHaveBeenCalled();
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
        expect(result.current.isConnected).toBe(true);
      });

      act(() => {
        transport.triggerMessage("message", { text: "Hello" });
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
        expect(result.current.isConnected).toBe(true);
        expect(result.current.data).toEqual({ message: { text: "Hello" } });
      });
    });
  });

  describe("meta data", () => {
    it("should return empty meta object", async () => {
      const { useSubscription } = createTestHooks();

      let hookResult;
      await act(async () => {
        hookResult = renderHook(() =>
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          useSubscription((api: any) => api("messages").GET())
        );
      });

      const { result } = hookResult!;

      expect(result.current.meta).toEqual({});
    });
  });
});
