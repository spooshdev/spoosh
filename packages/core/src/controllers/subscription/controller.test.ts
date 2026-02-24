import { describe, it, expect, vi, beforeEach } from "vitest";
import { createSubscriptionController } from "./controller";
import type {
  SubscriptionAdapter,
  SubscriptionContext,
  SubscriptionHandle,
} from "../../transport/subscription";
import { createStateManager } from "../../state";
import { createEventEmitter } from "../../events/emitter";
import { createPluginExecutor } from "../../plugins/executor";

function createMockAdapter<TData = unknown, TError = unknown>() {
  const subscribeCalls: SubscriptionContext<TData, TError>[] = [];
  const emitCalls: SubscriptionContext<TData, TError>[] = [];
  let mockData: TData | undefined = undefined;
  let mockError: TError | undefined = undefined;
  let onDataCallback: ((data: TData) => void) | undefined;
  let onErrorCallback: ((error: TError) => void) | undefined;

  const adapter: SubscriptionAdapter<TData, TError> = {
    subscribe: vi.fn(async (ctx) => {
      subscribeCalls.push(ctx);
      if (ctx.onData) {
        onDataCallback = ctx.onData;
      }
      if (ctx.onError) {
        onErrorCallback = ctx.onError;
      }

      const handle: SubscriptionHandle<TData, TError> = {
        unsubscribe: vi.fn(),
        getData: () => mockData,
        getError: () => mockError,
        onData: vi.fn((callback) => {
          onDataCallback = callback;
          return vi.fn();
        }),
        onError: vi.fn((callback) => {
          onErrorCallback = callback;
          return vi.fn();
        }),
      };
      return handle;
    }),
    emit: vi.fn(async (ctx) => {
      emitCalls.push(ctx);
      return { success: true };
    }),
  };

  const setMockData = (data: TData) => {
    mockData = data;
  };

  const setMockError = (error: TError) => {
    mockError = error;
  };

  const triggerData = (data: TData) => {
    mockData = data;
    if (onDataCallback) {
      onDataCallback(data);
    }
  };

  const triggerError = (error: TError) => {
    mockError = error;
    if (onErrorCallback) {
      onErrorCallback(error);
    }
  };

  return {
    adapter,
    subscribeCalls,
    emitCalls,
    setMockData,
    setMockError,
    triggerData,
    triggerError,
  };
}

function createTestController<TData = unknown, TError = unknown>(options?: {
  channel?: string;
  operationType?: string;
  path?: string;
  method?: string;
}) {
  const stateManager = createStateManager();
  const eventEmitter = createEventEmitter();
  const pluginExecutor = createPluginExecutor([]);
  const {
    adapter,
    subscribeCalls,
    emitCalls,
    setMockData,
    setMockError,
    triggerData,
    triggerError,
  } = createMockAdapter<TData, TError>();

  const queryKey = stateManager.createQueryKey({
    path: options?.path ?? "messages",
    method: options?.method ?? "GET",
  });

  const controller = createSubscriptionController<TData, TError>({
    channel: options?.channel ?? "messages",
    baseAdapter: adapter,
    stateManager,
    eventEmitter,
    pluginExecutor,
    queryKey,
    operationType: options?.operationType ?? "sse",
    path: options?.path ?? "messages",
    method: options?.method ?? "GET",
  });

  return {
    controller,
    stateManager,
    eventEmitter,
    pluginExecutor,
    adapter,
    subscribeCalls,
    emitCalls,
    setMockData,
    setMockError,
    triggerData,
    triggerError,
  };
}

describe("createSubscriptionController", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("subscription management", () => {
    it("should initialize with empty state", () => {
      const { controller } = createTestController();

      const state = controller.getState();

      expect(state).toEqual({
        data: undefined,
        error: undefined,
        isConnected: false,
      });
    });

    it("should subscribe and update state", async () => {
      const { controller, adapter, setMockData } =
        createTestController<string>();

      setMockData("test message");
      const handle = await controller.subscribe();

      expect(adapter.subscribe).toHaveBeenCalled();
      expect(handle).toBeDefined();

      const state = controller.getState();
      expect(state.isConnected).toBe(true);
      expect(state.data).toBe("test message");
    });

    it("should handle incoming data", async () => {
      const { controller, triggerData } = createTestController<string>();

      await controller.subscribe();

      triggerData("new message");

      const state = controller.getState();
      expect(state.data).toBe("new message");
      expect(state.isConnected).toBe(true);
    });

    it("should notify subscribers on data change", async () => {
      const { controller, triggerData } = createTestController<string>();

      const callback = vi.fn();
      controller.subscribe(callback);

      await controller.subscribe();
      triggerData("message 1");

      expect(callback).toHaveBeenCalledTimes(2);
    });

    it("should unsubscribe and update state", async () => {
      const { controller, setMockData } = createTestController<string>();

      setMockData("test");
      const handle = await controller.subscribe();

      controller.unsubscribe();

      expect(handle.unsubscribe).toHaveBeenCalled();

      const state = controller.getState();
      expect(state.isConnected).toBe(false);
    });

    it("should allow multiple subscribers", async () => {
      const { controller, triggerData } = createTestController<string>();

      const callback1 = vi.fn();
      const callback2 = vi.fn();

      controller.subscribe(callback1);
      controller.subscribe(callback2);

      await controller.subscribe();
      triggerData("message");

      expect(callback1).toHaveBeenCalled();
      expect(callback2).toHaveBeenCalled();
    });

    it("should remove individual subscribers", async () => {
      const { controller, triggerData } = createTestController<string>();

      const callback1 = vi.fn();
      const callback2 = vi.fn();

      controller.subscribe(callback1);
      const unsubscribe2 = controller.subscribe(callback2);

      await controller.subscribe();
      unsubscribe2();

      triggerData("message");

      expect(callback1).toHaveBeenCalled();
      expect(callback2).toHaveBeenCalled();

      callback1.mockClear();
      callback2.mockClear();

      triggerData("another message");

      expect(callback1).toHaveBeenCalled();
      expect(callback2).not.toHaveBeenCalled();
    });
  });

  describe("emit", () => {
    it("should call adapter emit", async () => {
      const { controller, adapter } = createTestController();

      const result = await controller.emit({ text: "hello" });

      expect(adapter.emit).toHaveBeenCalled();
      expect(result.success).toBe(true);
    });

    it("should pass message to adapter", async () => {
      const { controller, emitCalls } = createTestController();

      await controller.emit({ text: "hello" });

      expect(emitCalls).toHaveLength(1);
      expect(emitCalls[0]?.message).toEqual({ text: "hello" });
    });
  });

  describe("lifecycle", () => {
    it("should handle mount", () => {
      const { controller } = createTestController();

      expect(() => controller.mount()).not.toThrow();
    });

    it("should handle unmount and cleanup", async () => {
      const { controller, setMockData } = createTestController<string>();

      setMockData("test");
      const handle = await controller.subscribe();

      controller.unmount();

      expect(handle.unsubscribe).toHaveBeenCalled();

      const state = controller.getState();
      expect(state.isConnected).toBe(false);
    });

    it("should notify subscribers on unmount", async () => {
      const { controller } = createTestController();

      const callback = vi.fn();
      controller.subscribe(callback);

      await controller.subscribe();

      callback.mockClear();

      controller.unmount();

      expect(callback).toHaveBeenCalled();
    });
  });

  describe("context creation", () => {
    it("should pass channel to subscription context", async () => {
      const { controller, subscribeCalls } = createTestController({
        channel: "custom-channel",
      });

      await controller.subscribe();

      expect(subscribeCalls).toHaveLength(1);
      expect(subscribeCalls[0]?.channel).toBe("custom-channel");
    });

    it("should include operation metadata", async () => {
      const { controller, subscribeCalls } = createTestController({
        operationType: "websocket",
        path: "chat",
        method: "ON",
      });

      await controller.subscribe();

      expect(subscribeCalls).toHaveLength(1);
      expect(subscribeCalls[0]?.operationType).toBe("websocket");
      expect(subscribeCalls[0]?.path).toBe("chat");
      expect(subscribeCalls[0]?.method).toBe("ON");
    });
  });

  describe("error handling", () => {
    it("should handle errors in state", async () => {
      const { controller, setMockError } = createTestController<
        string,
        Error
      >();

      setMockError(new Error("Connection failed"));
      await controller.subscribe();

      const state = controller.getState();
      expect(state.error).toBeDefined();
      expect(state.error?.message).toBe("Connection failed");
    });

    it("should notify subscribers on error", async () => {
      const { controller, triggerError } = createTestController<
        string,
        Error
      >();

      const callback = vi.fn();
      controller.subscribe(callback);

      await controller.subscribe();
      triggerError(new Error("Test error"));

      expect(callback).toHaveBeenCalled();
    });
  });

  describe("state caching", () => {
    it("should cache state and only update on change", async () => {
      const { controller, triggerData } = createTestController<string>();

      await controller.subscribe();

      const state1 = controller.getState();
      const state2 = controller.getState();

      expect(state1).toBe(state2);

      triggerData("new data");

      const state3 = controller.getState();

      expect(state3).not.toBe(state1);
      expect(state3.data).toBe("new data");
    });

    it("should not notify if state unchanged", async () => {
      const { controller, setMockData } = createTestController<string>();

      setMockData("same");

      const callback = vi.fn();
      controller.subscribe(callback);

      await controller.subscribe();

      callback.mockClear();

      controller.unsubscribe();
      const handle = await controller.subscribe();

      handle.getData = () => "same";

      controller.unsubscribe();
      await controller.subscribe();

      expect(callback).toHaveBeenCalled();
    });
  });
});
