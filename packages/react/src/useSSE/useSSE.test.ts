/**
 * @vitest-environment jsdom
 */
import { renderHook, act, waitFor } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";
import { createStateManager, createEventEmitter } from "@spoosh/test-utils";
import { createPluginExecutor } from "@spoosh/core";
import type { SpooshTransport, SubscriptionContext } from "@spoosh/core";
import type {
  SSEMessage,
  SSEAdapterFactory,
  SSEAdapterOptions,
} from "@spoosh/transport-sse";
import { createUseSSE } from "./index";

type TestData = Record<string, unknown>;

interface MockSubscriptionContext {
  callbacks: Set<(message: SSEMessage) => void>;
  isConnected: boolean;
}

function createMockTransport(): SpooshTransport &
  SSEAdapterFactory & {
    mockContext: MockSubscriptionContext;
    triggerMessage: (event: string, data: string) => void;
  } {
  const mockContext: MockSubscriptionContext = {
    callbacks: new Set(),
    isConnected: false,
  };

  const triggerMessage = (event: string, data: string) => {
    const sseMessage: SSEMessage = {
      event,
      data,
      timestamp: Date.now(),
    };

    mockContext.callbacks.forEach((cb) => cb(sseMessage));
  };

  const connectFn = vi.fn(async () => {
    mockContext.isConnected = true;
  });

  const subscribeFn = vi.fn(
    (_event: string, callback: (message: SSEMessage) => void) => {
      mockContext.callbacks.add(callback);

      return () => {
        mockContext.callbacks.delete(callback);
      };
    }
  );

  const releaseConnectionFn = vi.fn();

  const createSubscriptionAdapter = (
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _options: SSEAdapterOptions
  ) => {
    return {
      subscribe: async (context: SubscriptionContext) => {
        const unsubscribers: Array<() => void> = [];
        let currentData: SSEMessage | undefined = undefined;

        const sharedCallback = (message: SSEMessage) => {
          currentData = message;
          context.onData?.(message);
        };

        const unsub = subscribeFn("*", sharedCallback);
        unsubscribers.push(unsub);

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
    } = {
    name: "sse",
    operationType: "sse",
    connect: connectFn,
    disconnect: vi.fn(async () => {
      mockContext.isConnected = false;
      mockContext.callbacks.clear();
    }),
    subscribe: subscribeFn,
    send: vi.fn(async () => {}),
    isConnected: () => mockContext.isConnected,
    createSubscriptionAdapter,
    mockContext,
    triggerMessage,
  };

  return transport;
}

function createTestHooks() {
  const stateManager = createStateManager();
  const eventEmitter = createEventEmitter();
  const pluginExecutor = createPluginExecutor([]);
  const transport = createMockTransport();
  const transports = new Map([["sse", transport]]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const useSSE = createUseSSE<any, unknown, []>({
    api: {} as never,
    stateManager,
    eventEmitter,
    pluginExecutor,
    transports,
    config: { baseUrl: "/api", defaultOptions: {} },
  });

  return {
    useSSE,
    stateManager,
    eventEmitter,
    transport,
    transports,
  };
}

describe("useSSE", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("basic functionality", () => {
    it("should return expected properties", async () => {
      const { useSSE } = createTestHooks();

      let hookResult;
      await act(async () => {
        hookResult = renderHook(() =>
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          useSSE((api: any) => api("messages").GET())
        );
      });

      const { result } = hookResult!;

      expect(result.current).toHaveProperty("data");
      expect(result.current).toHaveProperty("rawMessage");
      expect(result.current).toHaveProperty("error");
      expect(result.current).toHaveProperty("loading");
      expect(result.current).toHaveProperty("isConnected");
      expect(result.current).toHaveProperty("trigger");
      expect(result.current).toHaveProperty("disconnect");
      expect(result.current).toHaveProperty("reset");
      expect(result.current).toHaveProperty("meta");
    });

    it("should start with undefined data and rawMessage", async () => {
      const { useSSE } = createTestHooks();

      let hookResult;
      await act(async () => {
        hookResult = renderHook(() =>
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          useSSE((api: any) => api("messages").GET())
        );
      });

      const { result } = hookResult!;

      expect(result.current.data).toBeUndefined();
      expect(result.current.rawMessage).toBeUndefined();
    });
  });

  describe("parsing", () => {
    it("should parse JSON data by default (auto)", async () => {
      const { useSSE, transport } = createTestHooks();

      const { result } = renderHook(() =>
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        useSSE((api: any) => api("messages").GET())
      );

      await waitFor(() => {
        expect(transport.connect).toHaveBeenCalled();
      });

      act(() => {
        transport.triggerMessage("message", '{"text":"Hello"}');
      });

      await waitFor(() => {
        expect(result.current.data).toEqual({
          message: { text: "Hello" },
        });
        expect(result.current.rawMessage?.data).toBe('{"text":"Hello"}');
      });
    });

    it("should use json-done parse strategy", async () => {
      const { useSSE, transport } = createTestHooks();

      const { result } = renderHook(() =>
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        useSSE((api: any) => api("chat").POST(), {
          parse: "json-done",
        })
      );

      await waitFor(() => {
        expect(transport.connect).toHaveBeenCalled();
      });

      act(() => {
        transport.triggerMessage("chunk", '{"content":"Hello"}');
      });

      await waitFor(() => {
        expect(result.current.data).toEqual({
          chunk: { content: "Hello" },
        });
      });

      act(() => {
        transport.triggerMessage("done", "[DONE]");
      });

      await waitFor(() => {
        expect((result.current.data as TestData)?.done).toBeUndefined();
      });
    });

    it("should use text parse strategy", async () => {
      const { useSSE, transport } = createTestHooks();

      const { result } = renderHook(() =>
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        useSSE((api: any) => api("logs").GET(), {
          parse: "text",
        })
      );

      await waitFor(() => {
        expect(transport.connect).toHaveBeenCalled();
      });

      act(() => {
        transport.triggerMessage("log", "Plain text message");
      });

      await waitFor(() => {
        expect(result.current.data).toEqual({
          log: "Plain text message",
        });
      });
    });

    it("should use per-event parse config", async () => {
      const { useSSE, transport } = createTestHooks();

      const { result } = renderHook(() =>
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        useSSE((api: any) => api("mixed").GET(), {
          parse: {
            json_event: "json",
            text_event: "text",
          },
        })
      );

      await waitFor(() => {
        expect(transport.connect).toHaveBeenCalled();
      });

      act(() => {
        transport.triggerMessage("json_event", '{"key":"value"}');
      });

      await waitFor(() => {
        expect((result.current.data as TestData)?.json_event).toEqual({
          key: "value",
        });
      });

      act(() => {
        transport.triggerMessage("text_event", "raw text");
      });

      await waitFor(() => {
        expect((result.current.data as TestData)?.text_event).toBe("raw text");
      });
    });
  });

  describe("accumulation", () => {
    it("should replace data by default", async () => {
      const { useSSE, transport } = createTestHooks();

      const { result } = renderHook(() =>
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        useSSE((api: any) => api("messages").GET())
      );

      await waitFor(() => {
        expect(transport.connect).toHaveBeenCalled();
      });

      act(() => {
        transport.triggerMessage("message", '{"count":1}');
      });

      await waitFor(() => {
        expect(result.current.data).toEqual({ message: { count: 1 } });
      });

      act(() => {
        transport.triggerMessage("message", '{"count":2}');
      });

      await waitFor(() => {
        expect(result.current.data).toEqual({ message: { count: 2 } });
      });
    });

    it("should merge string data when accumulate is merge", async () => {
      const { useSSE, transport } = createTestHooks();

      const { result } = renderHook(() =>
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        useSSE((api: any) => api("stream").GET(), {
          parse: "text",
          accumulate: "merge",
        })
      );

      await waitFor(() => {
        expect(transport.connect).toHaveBeenCalled();
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
        expect(result.current.data).toEqual({ chunk: "Hello World" });
      });
    });

    it("should merge array data when accumulate is merge", async () => {
      const { useSSE, transport } = createTestHooks();

      const { result } = renderHook(() =>
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        useSSE((api: any) => api("items").GET(), {
          accumulate: "merge",
        })
      );

      await waitFor(() => {
        expect(transport.connect).toHaveBeenCalled();
      });

      act(() => {
        transport.triggerMessage("items", "[1, 2]");
      });

      await waitFor(() => {
        expect(result.current.data).toEqual({ items: [1, 2] });
      });

      act(() => {
        transport.triggerMessage("items", "[3, 4]");
      });

      await waitFor(() => {
        expect(result.current.data).toEqual({ items: [1, 2, 3, 4] });
      });
    });

    it("should use per-event accumulate config", async () => {
      const { useSSE, transport } = createTestHooks();

      const { result } = renderHook(() =>
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        useSSE((api: any) => api("chat").POST(), {
          parse: "text",
          accumulate: {
            chunk: "merge",
            done: "replace",
          },
        })
      );

      await waitFor(() => {
        expect(transport.connect).toHaveBeenCalled();
      });

      act(() => {
        transport.triggerMessage("chunk", "Hello ");
      });

      await waitFor(() => {
        expect((result.current.data as TestData)?.chunk).toBe("Hello ");
      });

      act(() => {
        transport.triggerMessage("chunk", "World");
      });

      await waitFor(() => {
        expect((result.current.data as TestData)?.chunk).toBe("Hello World");
      });

      act(() => {
        transport.triggerMessage("done", "finished");
      });

      await waitFor(() => {
        expect((result.current.data as TestData)?.done).toBe("finished");
      });
    });
  });

  describe("event filtering", () => {
    it("should only process specified events", async () => {
      const { useSSE, transport } = createTestHooks();

      const { result } = renderHook(() =>
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        useSSE((api: any) => api("messages").GET(), {
          events: ["chunk", "done"],
        })
      );

      await waitFor(() => {
        expect(transport.connect).toHaveBeenCalled();
      });

      act(() => {
        transport.triggerMessage("chunk", '"Hello"');
      });

      await waitFor(() => {
        expect(result.current.data).toEqual({ chunk: "Hello" });
      });

      act(() => {
        transport.triggerMessage("ignored", '"Should not appear"');
      });

      await new Promise((resolve) => setTimeout(resolve, 50));

      expect((result.current.data as TestData)?.ignored).toBeUndefined();

      act(() => {
        transport.triggerMessage("done", '{"finished":true}');
      });

      await waitFor(() => {
        expect((result.current.data as TestData)?.done).toEqual({
          finished: true,
        });
      });
    });

    it("should process all events when events option is not provided", async () => {
      const { useSSE, transport } = createTestHooks();

      const { result } = renderHook(() =>
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        useSSE((api: any) => api("messages").GET())
      );

      await waitFor(() => {
        expect(transport.connect).toHaveBeenCalled();
      });

      act(() => {
        transport.triggerMessage("event1", '"data1"');
      });

      await waitFor(() => {
        expect((result.current.data as TestData)?.event1).toBe("data1");
      });

      act(() => {
        transport.triggerMessage("event2", '"data2"');
      });

      await waitFor(() => {
        expect((result.current.data as TestData)?.event2).toBe("data2");
      });
    });
  });

  describe("reset functionality", () => {
    it("should reset accumulated data and rawMessage", async () => {
      const { useSSE, transport } = createTestHooks();

      const { result } = renderHook(() =>
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        useSSE((api: any) => api("messages").GET())
      );

      await waitFor(() => {
        expect(transport.connect).toHaveBeenCalled();
      });

      act(() => {
        transport.triggerMessage("message", '{"text":"Hello"}');
      });

      await waitFor(() => {
        expect(result.current.data).toBeDefined();
        expect(result.current.rawMessage).toBeDefined();
      });

      act(() => {
        result.current.reset();
      });

      expect(result.current.data).toBeUndefined();
      expect(result.current.rawMessage).toBeUndefined();
    });

    it("should reset data when trigger is called", async () => {
      const { useSSE, transport } = createTestHooks();

      const { result } = renderHook(() =>
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        useSSE((api: any) => api("messages").POST())
      );

      await waitFor(() => {
        expect(transport.connect).toHaveBeenCalled();
      });

      act(() => {
        transport.triggerMessage("message", '{"text":"First"}');
      });

      await waitFor(() => {
        expect(result.current.data).toEqual({ message: { text: "First" } });
      });

      await act(async () => {
        await result.current.trigger({ body: { new: true } });
      });

      expect(result.current.data).toBeUndefined();
      expect(result.current.rawMessage).toBeUndefined();
    });
  });

  describe("multiple hooks with same endpoint", () => {
    it("should maintain separate accumulated state per hook instance", async () => {
      const { useSSE, transport } = createTestHooks();

      const { result: result1 } = renderHook(() =>
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        useSSE((api: any) => api("chat").POST(), {
          parse: "text",
          accumulate: "merge",
        })
      );

      const { result: result2 } = renderHook(() =>
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        useSSE((api: any) => api("chat").POST(), {
          parse: "text",
          accumulate: "replace",
        })
      );

      await waitFor(() => {
        expect(transport.connect).toHaveBeenCalled();
      });

      act(() => {
        transport.triggerMessage("chunk", "Hello ");
      });

      await waitFor(() => {
        expect((result1.current.data as TestData)?.chunk).toBe("Hello ");
        expect((result2.current.data as TestData)?.chunk).toBe("Hello ");
      });

      act(() => {
        transport.triggerMessage("chunk", "World");
      });

      await waitFor(() => {
        expect((result1.current.data as TestData)?.chunk).toBe("Hello World");
        expect((result2.current.data as TestData)?.chunk).toBe("World");
      });
    });
  });

  describe("enabled option", () => {
    it("should not subscribe when enabled is false", () => {
      const { useSSE, transport } = createTestHooks();

      renderHook(() =>
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        useSSE((api: any) => api("messages").GET(), {
          enabled: false,
        })
      );

      expect(transport.connect).not.toHaveBeenCalled();
    });

    it("should subscribe when enabled changes to true", async () => {
      const { useSSE, transport } = createTestHooks();

      const { rerender } = renderHook(
        ({ enabled }) =>
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          useSSE((api: any) => api("messages").GET(), { enabled }),
        { initialProps: { enabled: false } }
      );

      expect(transport.connect).not.toHaveBeenCalled();

      rerender({ enabled: true });

      await waitFor(() => {
        expect(transport.connect).toHaveBeenCalled();
      });
    });
  });

  describe("disconnect functionality", () => {
    it("should disconnect when disconnect is called", async () => {
      const { useSSE, transport } = createTestHooks();

      const { result } = renderHook(() =>
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        useSSE((api: any) => api("messages").GET())
      );

      await waitFor(() => {
        expect(transport.connect).toHaveBeenCalled();
      });

      act(() => {
        result.current.disconnect();
      });

      await waitFor(() => {
        expect(result.current.isConnected).toBe(false);
      });
    });
  });
});
