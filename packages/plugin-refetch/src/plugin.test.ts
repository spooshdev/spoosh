import type { EventEmitter } from "@spoosh/core";
import { createMockContext } from "@spoosh/test-utils";

import { refetchPlugin } from "./plugin";

function createMockEventEmitter(): EventEmitter {
  return {
    emit: vi.fn(),
    on: vi.fn().mockReturnValue(() => {}),
    off: vi.fn(),
    clear: vi.fn(),
  };
}

describe("refetchPlugin", () => {
  let originalWindow: typeof globalThis.window;
  let originalDocument: typeof globalThis.document;
  let windowEventListeners: Map<string, Set<EventListener>>;
  let documentEventListeners: Map<string, Set<EventListener>>;

  beforeEach(() => {
    originalWindow = globalThis.window;
    originalDocument = globalThis.document;
    windowEventListeners = new Map();
    documentEventListeners = new Map();

    const mockWindow = {
      addEventListener: vi.fn((event: string, handler: EventListener) => {
        if (!windowEventListeners.has(event)) {
          windowEventListeners.set(event, new Set());
        }
        windowEventListeners.get(event)!.add(handler);
      }),
      removeEventListener: vi.fn((event: string, handler: EventListener) => {
        windowEventListeners.get(event)?.delete(handler);
      }),
    };

    let visibilityState = "visible";
    const mockDocument = {
      addEventListener: vi.fn((event: string, handler: EventListener) => {
        if (!documentEventListeners.has(event)) {
          documentEventListeners.set(event, new Set());
        }
        documentEventListeners.get(event)!.add(handler);
      }),
      removeEventListener: vi.fn((event: string, handler: EventListener) => {
        documentEventListeners.get(event)?.delete(handler);
      }),
      get visibilityState() {
        return visibilityState;
      },
      set visibilityState(value: string) {
        visibilityState = value;
      },
    };

    globalThis.window = mockWindow as unknown as typeof globalThis.window;
    globalThis.document = mockDocument as unknown as typeof globalThis.document;
  });

  afterEach(() => {
    globalThis.window = originalWindow;
    globalThis.document = originalDocument;
  });

  describe("plugin configuration", () => {
    it("should have correct name", () => {
      const plugin = refetchPlugin();
      expect(plugin.name).toBe("spoosh:refetch");
    });

    it("should operate on read and pages operations", () => {
      const plugin = refetchPlugin();
      expect(plugin.operations).toEqual(["read", "pages"]);
    });
  });

  describe("refetchOnFocus", () => {
    it("should emit refetch event on window focus", () => {
      const plugin = refetchPlugin({ refetchOnFocus: true });
      const eventEmitter = createMockEventEmitter();
      const context = createMockContext({
        eventEmitter,
        instanceId: "hook-1",
        queryKey: "test-query-key",
      });

      plugin.lifecycle?.onMount?.(context);

      const focusHandlers = windowEventListeners.get("focus");
      expect(focusHandlers).toBeDefined();
      expect(focusHandlers!.size).toBe(1);

      const focusHandler = [...focusHandlers!][0]!;
      focusHandler(new Event("focus"));

      expect(eventEmitter.emit).toHaveBeenCalledWith("refetch", {
        queryKey: "test-query-key",
        reason: "focus",
      });
    });

    it("should emit refetch event on document visibility change to visible", () => {
      const plugin = refetchPlugin({ refetchOnFocus: true });
      const eventEmitter = createMockEventEmitter();
      const context = createMockContext({
        eventEmitter,
        instanceId: "hook-1",
        queryKey: "test-query-key",
      });

      plugin.lifecycle?.onMount?.(context);

      const visibilityHandlers = documentEventListeners.get("visibilitychange");
      expect(visibilityHandlers).toBeDefined();
      expect(visibilityHandlers!.size).toBe(1);

      (document as { visibilityState: string }).visibilityState = "visible";
      const visibilityHandler = [...visibilityHandlers!][0]!;
      visibilityHandler(new Event("visibilitychange"));

      expect(eventEmitter.emit).toHaveBeenCalledWith("refetch", {
        queryKey: "test-query-key",
        reason: "focus",
      });
    });

    it("should not emit refetch event when visibility changes to hidden", () => {
      const plugin = refetchPlugin({ refetchOnFocus: true });
      const eventEmitter = createMockEventEmitter();
      const context = createMockContext({
        eventEmitter,
        instanceId: "hook-1",
        queryKey: "test-query-key",
      });

      plugin.lifecycle?.onMount?.(context);

      const visibilityHandlers = documentEventListeners.get("visibilitychange");
      expect(visibilityHandlers).toBeDefined();

      (document as { visibilityState: string }).visibilityState = "hidden";
      const visibilityHandler = [...visibilityHandlers!][0]!;
      visibilityHandler(new Event("visibilitychange"));

      expect(eventEmitter.emit).not.toHaveBeenCalled();
    });

    it("should not add focus listeners when refetchOnFocus is false", () => {
      const plugin = refetchPlugin({ refetchOnFocus: false });
      const context = createMockContext({
        instanceId: "hook-1",
      });

      plugin.lifecycle?.onMount?.(context);

      expect(windowEventListeners.get("focus")).toBeUndefined();
      expect(documentEventListeners.get("visibilitychange")).toBeUndefined();
    });
  });

  describe("refetchOnReconnect", () => {
    it("should emit refetch event on online event", () => {
      const plugin = refetchPlugin({ refetchOnReconnect: true });
      const eventEmitter = createMockEventEmitter();
      const context = createMockContext({
        eventEmitter,
        instanceId: "hook-1",
        queryKey: "test-query-key",
      });

      plugin.lifecycle?.onMount?.(context);

      const onlineHandlers = windowEventListeners.get("online");
      expect(onlineHandlers).toBeDefined();
      expect(onlineHandlers!.size).toBe(1);

      const onlineHandler = [...onlineHandlers!][0]!;
      onlineHandler(new Event("online"));

      expect(eventEmitter.emit).toHaveBeenCalledWith("refetch", {
        queryKey: "test-query-key",
        reason: "reconnect",
      });
    });

    it("should not add reconnect listeners when refetchOnReconnect is false", () => {
      const plugin = refetchPlugin({ refetchOnReconnect: false });
      const context = createMockContext({
        instanceId: "hook-1",
      });

      plugin.lifecycle!.onMount!(context);

      expect(windowEventListeners.get("online")).toBeUndefined();
    });
  });

  describe("event listener management", () => {
    it("should add event listeners on mount", () => {
      const plugin = refetchPlugin({
        refetchOnFocus: true,
        refetchOnReconnect: true,
      });
      const context = createMockContext({
        instanceId: "hook-1",
      });

      plugin.lifecycle!.onMount!(context);

      expect(window.addEventListener).toHaveBeenCalledWith(
        "focus",
        expect.any(Function)
      );
      expect(window.addEventListener).toHaveBeenCalledWith(
        "online",
        expect.any(Function)
      );
      expect(document.addEventListener).toHaveBeenCalledWith(
        "visibilitychange",
        expect.any(Function)
      );
    });

    it("should remove event listeners on unmount", () => {
      const plugin = refetchPlugin({
        refetchOnFocus: true,
        refetchOnReconnect: true,
      });
      const context = createMockContext({
        instanceId: "hook-1",
      });

      plugin.lifecycle!.onMount!(context);
      plugin.lifecycle!.onUnmount!(context);

      expect(window.removeEventListener).toHaveBeenCalledWith(
        "focus",
        expect.any(Function)
      );
      expect(window.removeEventListener).toHaveBeenCalledWith(
        "online",
        expect.any(Function)
      );
      expect(document.removeEventListener).toHaveBeenCalledWith(
        "visibilitychange",
        expect.any(Function)
      );
    });

    it("should not add listeners when instanceId is undefined", () => {
      const plugin = refetchPlugin({
        refetchOnFocus: true,
        refetchOnReconnect: true,
      });
      const context = createMockContext({
        instanceId: undefined,
      });

      plugin.lifecycle!.onMount!(context);

      expect(window.addEventListener).not.toHaveBeenCalled();
      expect(document.addEventListener).not.toHaveBeenCalled();
    });

    it("should not attempt cleanup when instanceId is undefined on unmount", () => {
      const plugin = refetchPlugin({
        refetchOnFocus: true,
        refetchOnReconnect: true,
      });
      const context = createMockContext({
        instanceId: undefined,
      });

      plugin.lifecycle!.onUnmount!(context);

      expect(window.removeEventListener).not.toHaveBeenCalled();
      expect(document.removeEventListener).not.toHaveBeenCalled();
    });
  });

  describe("disabled options", () => {
    it("should not add any listeners when both options are disabled by default", () => {
      const plugin = refetchPlugin();
      const context = createMockContext({
        instanceId: "hook-1",
      });

      plugin.lifecycle!.onMount!(context);

      expect(window.addEventListener).not.toHaveBeenCalled();
      expect(document.addEventListener).not.toHaveBeenCalled();
    });

    it("should only add focus listeners when only refetchOnFocus is enabled", () => {
      const plugin = refetchPlugin({ refetchOnFocus: true });
      const context = createMockContext({
        instanceId: "hook-1",
      });

      plugin.lifecycle!.onMount!(context);

      expect(window.addEventListener).toHaveBeenCalledWith(
        "focus",
        expect.any(Function)
      );
      expect(document.addEventListener).toHaveBeenCalledWith(
        "visibilitychange",
        expect.any(Function)
      );
      expect(windowEventListeners.get("online")).toBeUndefined();
    });

    it("should only add reconnect listeners when only refetchOnReconnect is enabled", () => {
      const plugin = refetchPlugin({ refetchOnReconnect: true });
      const context = createMockContext({
        instanceId: "hook-1",
      });

      plugin.lifecycle!.onMount!(context);

      expect(window.addEventListener).toHaveBeenCalledWith(
        "online",
        expect.any(Function)
      );
      expect(windowEventListeners.get("focus")).toBeUndefined();
      expect(documentEventListeners.get("visibilitychange")).toBeUndefined();
    });
  });

  describe("per-query option overrides", () => {
    it("should enable refetchOnFocus per-query even when disabled globally", () => {
      const plugin = refetchPlugin({ refetchOnFocus: false });
      const context = createMockContext({
        instanceId: "hook-1",
        pluginOptions: { refetchOnFocus: true },
      });

      plugin.lifecycle!.onMount!(context);

      expect(window.addEventListener).toHaveBeenCalledWith(
        "focus",
        expect.any(Function)
      );
    });

    it("should disable refetchOnFocus per-query even when enabled globally", () => {
      const plugin = refetchPlugin({ refetchOnFocus: true });
      const context = createMockContext({
        instanceId: "hook-1",
        pluginOptions: { refetchOnFocus: false },
      });

      plugin.lifecycle!.onMount!(context);

      expect(windowEventListeners.get("focus")).toBeUndefined();
    });

    it("should enable refetchOnReconnect per-query even when disabled globally", () => {
      const plugin = refetchPlugin({ refetchOnReconnect: false });
      const context = createMockContext({
        instanceId: "hook-1",
        pluginOptions: { refetchOnReconnect: true },
      });

      plugin.lifecycle!.onMount!(context);

      expect(window.addEventListener).toHaveBeenCalledWith(
        "online",
        expect.any(Function)
      );
    });

    it("should disable refetchOnReconnect per-query even when enabled globally", () => {
      const plugin = refetchPlugin({ refetchOnReconnect: true });
      const context = createMockContext({
        instanceId: "hook-1",
        pluginOptions: { refetchOnReconnect: false },
      });

      plugin.lifecycle!.onMount!(context);

      expect(windowEventListeners.get("online")).toBeUndefined();
    });
  });

  describe("onUpdate lifecycle", () => {
    it("should add focus listener when option changes to enabled", () => {
      const plugin = refetchPlugin({ refetchOnFocus: false });
      const context = createMockContext({
        instanceId: "hook-1",
        pluginOptions: { refetchOnFocus: false },
      });

      plugin.lifecycle!.onMount!(context);
      expect(windowEventListeners.get("focus")).toBeUndefined();

      const updatedContext = createMockContext({
        instanceId: "hook-1",
        pluginOptions: { refetchOnFocus: true },
      });

      plugin.lifecycle!.onUpdate!(updatedContext, context);

      expect(window.addEventListener).toHaveBeenCalledWith(
        "focus",
        expect.any(Function)
      );
    });

    it("should remove focus listener when option changes to disabled", () => {
      const plugin = refetchPlugin({ refetchOnFocus: true });
      const context = createMockContext({
        instanceId: "hook-1",
      });

      plugin.lifecycle!.onMount!(context);
      expect(windowEventListeners.get("focus")?.size).toBe(1);

      const updatedContext = createMockContext({
        instanceId: "hook-1",
        pluginOptions: { refetchOnFocus: false },
      });

      plugin.lifecycle!.onUpdate!(updatedContext, context);

      expect(window.removeEventListener).toHaveBeenCalledWith(
        "focus",
        expect.any(Function)
      );
    });

    it("should add reconnect listener when option changes to enabled", () => {
      const plugin = refetchPlugin({ refetchOnReconnect: false });
      const context = createMockContext({
        instanceId: "hook-1",
        pluginOptions: { refetchOnReconnect: false },
      });

      plugin.lifecycle!.onMount!(context);
      expect(windowEventListeners.get("online")).toBeUndefined();

      const updatedContext = createMockContext({
        instanceId: "hook-1",
        pluginOptions: { refetchOnReconnect: true },
      });

      plugin.lifecycle!.onUpdate!(updatedContext, context);

      expect(window.addEventListener).toHaveBeenCalledWith(
        "online",
        expect.any(Function)
      );
    });

    it("should remove reconnect listener when option changes to disabled", () => {
      const plugin = refetchPlugin({ refetchOnReconnect: true });
      const context = createMockContext({
        instanceId: "hook-1",
      });

      plugin.lifecycle!.onMount!(context);
      expect(windowEventListeners.get("online")?.size).toBe(1);

      const updatedContext = createMockContext({
        instanceId: "hook-1",
        pluginOptions: { refetchOnReconnect: false },
      });

      plugin.lifecycle!.onUpdate!(updatedContext, context);

      expect(window.removeEventListener).toHaveBeenCalledWith(
        "online",
        expect.any(Function)
      );
    });

    it("should cleanup and re-add listeners when queryKey changes", () => {
      const plugin = refetchPlugin({
        refetchOnFocus: true,
        refetchOnReconnect: true,
      });
      const eventEmitter = createMockEventEmitter();
      const context = createMockContext({
        instanceId: "hook-1",
        queryKey: "old-query-key",
        eventEmitter,
      });

      plugin.lifecycle!.onMount!(context);

      const updatedContext = createMockContext({
        instanceId: "hook-1",
        queryKey: "new-query-key",
        eventEmitter,
      });

      plugin.lifecycle!.onUpdate!(updatedContext, context);

      const focusHandlers = windowEventListeners.get("focus");
      const focusHandler = [...focusHandlers!][0]!;
      focusHandler(new Event("focus"));

      expect(eventEmitter.emit).toHaveBeenCalledWith("refetch", {
        queryKey: "new-query-key",
        reason: "focus",
      });
    });

    it("should not do anything when instanceId is undefined", () => {
      const plugin = refetchPlugin({ refetchOnFocus: true });
      const context = createMockContext({
        instanceId: undefined,
      });

      plugin.lifecycle!.onUpdate!(context, context);

      expect(window.addEventListener).not.toHaveBeenCalled();
      expect(window.removeEventListener).not.toHaveBeenCalled();
    });
  });

  describe("multiple hook instances", () => {
    it("should manage listeners independently for different instanceIds", () => {
      const plugin = refetchPlugin({ refetchOnFocus: true });
      const eventEmitter1 = createMockEventEmitter();
      const eventEmitter2 = createMockEventEmitter();

      const context1 = createMockContext({
        instanceId: "hook-1",
        queryKey: "query-1",
        eventEmitter: eventEmitter1,
      });

      const context2 = createMockContext({
        instanceId: "hook-2",
        queryKey: "query-2",
        eventEmitter: eventEmitter2,
      });

      plugin.lifecycle!.onMount!(context1);
      plugin.lifecycle!.onMount!(context2);

      expect(windowEventListeners.get("focus")?.size).toBe(2);

      plugin.lifecycle!.onUnmount!(context1);

      expect(windowEventListeners.get("focus")?.size).toBe(1);

      const remainingHandler = [...windowEventListeners.get("focus")!][0]!;
      remainingHandler(new Event("focus"));

      expect(eventEmitter2.emit).toHaveBeenCalledWith("refetch", {
        queryKey: "query-2",
        reason: "focus",
      });
      expect(eventEmitter1.emit).not.toHaveBeenCalled();
    });
  });
});
