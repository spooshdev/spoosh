import type { SpooshPlugin, PluginContext, OperationType } from "./types";
import type { SpooshResponse } from "../types/response.types";
import { createPluginExecutor } from "./executor";
import { createStateManager } from "../state/manager";
import { createEventEmitter } from "../events/emitter";

function createMockContext(
  overrides: Partial<PluginContext> = {}
): PluginContext {
  const stateManager = createStateManager();
  const eventEmitter = createEventEmitter();

  return {
    operationType: "read",
    path: "test",
    method: "GET",
    queryKey: "test-key",
    tags: ["test"],
    requestTimestamp: Date.now(),
    request: { headers: {} },
    metadata: new Map(),
    stateManager,
    eventEmitter,
    plugins: { get: () => undefined },
    ...overrides,
  } as PluginContext;
}

function createMockPlugin(
  name: string,
  operations: OperationType[] = ["read"],
  overrides: Partial<SpooshPlugin> = {}
): SpooshPlugin {
  return {
    name,
    operations,
    ...overrides,
  };
}

describe("createPluginExecutor", () => {
  describe("creation with plugins", () => {
    it("creates executor with empty plugins array", () => {
      const executor = createPluginExecutor([]);

      expect(executor.getPlugins()).toEqual([]);
    });

    it("creates executor with single plugin", () => {
      const plugin = createMockPlugin("test-plugin");
      const executor = createPluginExecutor([plugin]);

      expect(executor.getPlugins()).toHaveLength(1);
      expect(executor.getPlugins()[0]?.name).toBe("test-plugin");
    });

    it("creates executor with multiple plugins", () => {
      const plugin1 = createMockPlugin("plugin-1");
      const plugin2 = createMockPlugin("plugin-2");
      const executor = createPluginExecutor([plugin1, plugin2]);

      expect(executor.getPlugins()).toHaveLength(2);
    });

    it("returns frozen plugins array", () => {
      const plugin = createMockPlugin("test-plugin");
      const executor = createPluginExecutor([plugin]);
      const plugins = executor.getPlugins();

      expect(Object.isFrozen(plugins)).toBe(true);
    });

    it("creates executor with no arguments (defaults to empty array)", () => {
      const executor = createPluginExecutor();

      expect(executor.getPlugins()).toEqual([]);
    });
  });

  describe("plugin ordering and dependency resolution", () => {
    it("sorts plugins by dependencies", () => {
      const pluginA = createMockPlugin("plugin-a", ["read"], {
        dependencies: ["plugin-b"],
      });
      const pluginB = createMockPlugin("plugin-b");
      const executor = createPluginExecutor([pluginA, pluginB]);
      const plugins = executor.getPlugins();

      expect(plugins[0]?.name).toBe("plugin-b");
      expect(plugins[1]?.name).toBe("plugin-a");
    });

    it("handles complex dependency chains", () => {
      const pluginA = createMockPlugin("plugin-a", ["read"], {
        dependencies: ["plugin-b"],
      });
      const pluginB = createMockPlugin("plugin-b", ["read"], {
        dependencies: ["plugin-c"],
      });
      const pluginC = createMockPlugin("plugin-c");
      const executor = createPluginExecutor([pluginA, pluginB, pluginC]);
      const plugins = executor.getPlugins();

      expect(plugins[0]?.name).toBe("plugin-c");
      expect(plugins[1]?.name).toBe("plugin-b");
      expect(plugins[2]?.name).toBe("plugin-a");
    });

    it("throws error when dependency is not registered", () => {
      const plugin = createMockPlugin("plugin-a", ["read"], {
        dependencies: ["missing-plugin"],
      });

      expect(() => createPluginExecutor([plugin])).toThrow(
        'Plugin "plugin-a" depends on "missing-plugin" which is not registered'
      );
    });

    it("throws error on circular dependencies", () => {
      const pluginA = createMockPlugin("plugin-a", ["read"], {
        dependencies: ["plugin-b"],
      });
      const pluginB = createMockPlugin("plugin-b", ["read"], {
        dependencies: ["plugin-a"],
      });

      expect(() => createPluginExecutor([pluginA, pluginB])).toThrow(
        /Circular dependency detected/
      );
    });

    it("throws error on self-referencing dependency", () => {
      const plugin = createMockPlugin("plugin-a", ["read"], {
        dependencies: ["plugin-a"],
      });

      expect(() => createPluginExecutor([plugin])).toThrow(
        /Circular dependency detected/
      );
    });

    it("handles plugins with multiple dependencies", () => {
      const pluginA = createMockPlugin("plugin-a", ["read"], {
        dependencies: ["plugin-b", "plugin-c"],
      });
      const pluginB = createMockPlugin("plugin-b");
      const pluginC = createMockPlugin("plugin-c");
      const executor = createPluginExecutor([pluginA, pluginB, pluginC]);
      const plugins = executor.getPlugins();

      const indexA = plugins.findIndex((p) => p.name === "plugin-a");
      const indexB = plugins.findIndex((p) => p.name === "plugin-b");
      const indexC = plugins.findIndex((p) => p.name === "plugin-c");

      expect(indexB).toBeLessThan(indexA);
      expect(indexC).toBeLessThan(indexA);
    });
  });

  describe("executeMiddleware", () => {
    it("executes core fetch when no middlewares", async () => {
      const executor = createPluginExecutor([]);
      const context = createMockContext();
      const coreFetch = vi
        .fn()
        .mockResolvedValue({ data: "test", status: 200 });

      const result = await executor.executeMiddleware(
        "read",
        context,
        coreFetch
      );

      expect(coreFetch).toHaveBeenCalledTimes(1);
      expect(result).toEqual({ data: "test", status: 200 });
    });

    it("executes single middleware in chain", async () => {
      const middleware = vi.fn().mockImplementation(async (_ctx, next) => {
        return next();
      });
      const plugin = createMockPlugin("test-plugin", ["read"], { middleware });
      const executor = createPluginExecutor([plugin]);
      const context = createMockContext();
      const coreFetch = vi
        .fn()
        .mockResolvedValue({ data: "test", status: 200 });

      await executor.executeMiddleware("read", context, coreFetch);

      expect(middleware).toHaveBeenCalledTimes(1);
      expect(coreFetch).toHaveBeenCalledTimes(1);
    });

    it("executes middleware chain in correct order", async () => {
      const callOrder: string[] = [];

      const middleware1 = vi.fn().mockImplementation(async (_ctx, next) => {
        callOrder.push("middleware1-before");
        const result = await next();
        callOrder.push("middleware1-after");
        return result;
      });

      const middleware2 = vi.fn().mockImplementation(async (_ctx, next) => {
        callOrder.push("middleware2-before");
        const result = await next();
        callOrder.push("middleware2-after");
        return result;
      });

      const plugin1 = createMockPlugin("plugin-1", ["read"], {
        middleware: middleware1,
      });
      const plugin2 = createMockPlugin("plugin-2", ["read"], {
        middleware: middleware2,
      });

      const executor = createPluginExecutor([plugin1, plugin2]);
      const context = createMockContext();
      const coreFetch = vi.fn().mockImplementation(async () => {
        callOrder.push("coreFetch");
        return { data: "test", status: 200 };
      });

      await executor.executeMiddleware("read", context, coreFetch);

      expect(callOrder).toEqual([
        "middleware1-before",
        "middleware2-before",
        "coreFetch",
        "middleware2-after",
        "middleware1-after",
      ]);
    });

    it("allows middleware to short-circuit and skip core fetch", async () => {
      const middleware = vi
        .fn()
        .mockResolvedValue({ data: "cached", status: 200 });
      const plugin = createMockPlugin("cache-plugin", ["read"], { middleware });
      const executor = createPluginExecutor([plugin]);
      const context = createMockContext();
      const coreFetch = vi
        .fn()
        .mockResolvedValue({ data: "fresh", status: 200 });

      const result = await executor.executeMiddleware(
        "read",
        context,
        coreFetch
      );

      expect(coreFetch).not.toHaveBeenCalled();
      expect(result).toEqual({ data: "cached", status: 200 });
    });

    it("filters plugins by operation type", async () => {
      const readMiddleware = vi
        .fn()
        .mockImplementation(async (_ctx, next) => next());
      const writeMiddleware = vi
        .fn()
        .mockImplementation(async (_ctx, next) => next());

      const readPlugin = createMockPlugin("read-plugin", ["read"], {
        middleware: readMiddleware,
      });
      const writePlugin = createMockPlugin("write-plugin", ["write"], {
        middleware: writeMiddleware,
      });

      const executor = createPluginExecutor([readPlugin, writePlugin]);
      const context = createMockContext();
      const coreFetch = vi
        .fn()
        .mockResolvedValue({ data: "test", status: 200 });

      await executor.executeMiddleware("read", context, coreFetch);

      expect(readMiddleware).toHaveBeenCalledTimes(1);
      expect(writeMiddleware).not.toHaveBeenCalled();
    });

    it("executes afterResponse handlers after middleware chain", async () => {
      const afterResponse = vi.fn();
      const plugin = createMockPlugin("test-plugin", ["read"], {
        afterResponse,
      });
      const executor = createPluginExecutor([plugin]);
      const context = createMockContext();
      const coreFetch = vi
        .fn()
        .mockResolvedValue({ data: "test", status: 200 });

      await executor.executeMiddleware("read", context, coreFetch);

      expect(afterResponse).toHaveBeenCalledWith(context, {
        data: "test",
        status: 200,
      });
    });

    it("executes afterResponse even when middleware short-circuits", async () => {
      const afterResponse = vi.fn();
      const middleware = vi
        .fn()
        .mockResolvedValue({ data: "cached", status: 200 });
      const plugin = createMockPlugin("test-plugin", ["read"], {
        middleware,
        afterResponse,
      });

      const executor = createPluginExecutor([plugin]);
      const context = createMockContext();
      const coreFetch = vi
        .fn()
        .mockResolvedValue({ data: "fresh", status: 200 });

      await executor.executeMiddleware("read", context, coreFetch);

      expect(afterResponse).toHaveBeenCalledWith(context, {
        data: "cached",
        status: 200,
      });
    });

    it("executes multiple afterResponse handlers in order", async () => {
      const callOrder: string[] = [];

      const afterResponse1 = vi.fn().mockImplementation(() => {
        callOrder.push("afterResponse1");
      });
      const afterResponse2 = vi.fn().mockImplementation(() => {
        callOrder.push("afterResponse2");
      });

      const plugin1 = createMockPlugin("plugin-1", ["read"], {
        afterResponse: afterResponse1,
      });
      const plugin2 = createMockPlugin("plugin-2", ["read"], {
        afterResponse: afterResponse2,
      });

      const executor = createPluginExecutor([plugin1, plugin2]);
      const context = createMockContext();
      const coreFetch = vi
        .fn()
        .mockResolvedValue({ data: "test", status: 200 });

      await executor.executeMiddleware("read", context, coreFetch);

      expect(callOrder).toEqual(["afterResponse1", "afterResponse2"]);
    });

    it("supports async afterResponse handlers", async () => {
      const callOrder: string[] = [];

      const afterResponse = vi.fn().mockImplementation(async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
        callOrder.push("async-afterResponse");
      });

      const plugin = createMockPlugin("test-plugin", ["read"], {
        afterResponse,
      });
      const executor = createPluginExecutor([plugin]);
      const context = createMockContext();
      const coreFetch = vi
        .fn()
        .mockResolvedValue({ data: "test", status: 200 });

      await executor.executeMiddleware("read", context, coreFetch);

      expect(callOrder).toEqual(["async-afterResponse"]);
    });

    it("handles plugins with only afterResponse (no middleware)", async () => {
      const afterResponse = vi.fn();
      const plugin = createMockPlugin("response-only-plugin", ["read"], {
        afterResponse,
      });

      const executor = createPluginExecutor([plugin]);
      const context = createMockContext();
      const coreFetch = vi
        .fn()
        .mockResolvedValue({ data: "test", status: 200 });

      const result = await executor.executeMiddleware(
        "read",
        context,
        coreFetch
      );

      expect(result).toEqual({ data: "test", status: 200 });
      expect(afterResponse).toHaveBeenCalledTimes(1);
    });

    it("chains responses returned from afterResponse", async () => {
      const plugin1 = createMockPlugin("plugin-1", ["read"], {
        afterResponse: (_ctx, res) => ({ ...res, prop1: "value1" }),
      });

      const plugin2 = createMockPlugin("plugin-2", ["read"], {
        afterResponse: (_ctx, res) => ({ ...res, prop2: "value2" }),
      });

      const executor = createPluginExecutor([plugin1, plugin2]);
      const context = createMockContext();
      const coreFetch = vi
        .fn()
        .mockResolvedValue({ data: "test", status: 200 });

      const response = await executor.executeMiddleware(
        "read",
        context,
        coreFetch
      );

      expect(response).toMatchObject({
        data: "test",
        status: 200,
        prop1: "value1",
        prop2: "value2",
      });
    });

    it("preserves response when afterResponse returns void", async () => {
      const afterResponse = vi.fn().mockImplementation((ctx) => {
        ctx.metadata.set("processed", true);
      });

      const plugin = createMockPlugin("test-plugin", ["read"], {
        afterResponse,
      });

      const executor = createPluginExecutor([plugin]);
      const context = createMockContext();
      const coreFetch = vi
        .fn()
        .mockResolvedValue({ data: "original", status: 200 });

      const response = await executor.executeMiddleware(
        "read",
        context,
        coreFetch
      );

      expect(response).toEqual({ data: "original", status: 200 });
      expect(context.metadata.get("processed")).toBe(true);
    });
  });

  describe("executeLifecycle", () => {
    it("executes onMount handlers", async () => {
      const onMount = vi.fn();
      const plugin = createMockPlugin("test-plugin", ["read"], {
        lifecycle: { onMount },
      });

      const executor = createPluginExecutor([plugin]);
      const context = createMockContext();

      await executor.executeLifecycle("onMount", "read", context);

      expect(onMount).toHaveBeenCalledWith(context);
    });

    it("executes onUnmount handlers", async () => {
      const onUnmount = vi.fn();
      const plugin = createMockPlugin("test-plugin", ["read"], {
        lifecycle: { onUnmount },
      });

      const executor = createPluginExecutor([plugin]);
      const context = createMockContext();

      await executor.executeLifecycle("onUnmount", "read", context);

      expect(onUnmount).toHaveBeenCalledWith(context);
    });

    it("skips plugins not matching operation type", async () => {
      const onMount = vi.fn();
      const plugin = createMockPlugin("write-plugin", ["write"], {
        lifecycle: { onMount },
      });

      const executor = createPluginExecutor([plugin]);
      const context = createMockContext();

      await executor.executeLifecycle("onMount", "read", context);

      expect(onMount).not.toHaveBeenCalled();
    });

    it("skips plugins without lifecycle hooks", async () => {
      const plugin = createMockPlugin("no-lifecycle-plugin", ["read"]);
      const executor = createPluginExecutor([plugin]);
      const context = createMockContext();

      await expect(
        executor.executeLifecycle("onMount", "read", context)
      ).resolves.toBeUndefined();
    });

    it("executes lifecycle handlers in plugin order", async () => {
      const callOrder: string[] = [];

      const plugin1 = createMockPlugin("plugin-1", ["read"], {
        lifecycle: {
          onMount: () => {
            callOrder.push("plugin-1");
          },
        },
      });

      const plugin2 = createMockPlugin("plugin-2", ["read"], {
        lifecycle: {
          onMount: () => {
            callOrder.push("plugin-2");
          },
        },
      });

      const executor = createPluginExecutor([plugin1, plugin2]);
      const context = createMockContext();

      await executor.executeLifecycle("onMount", "read", context);

      expect(callOrder).toEqual(["plugin-1", "plugin-2"]);
    });

    it("supports async lifecycle handlers", async () => {
      const onMount = vi.fn().mockImplementation(async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
      });

      const plugin = createMockPlugin("async-plugin", ["read"], {
        lifecycle: { onMount },
      });

      const executor = createPluginExecutor([plugin]);
      const context = createMockContext();

      await executor.executeLifecycle("onMount", "read", context);

      expect(onMount).toHaveBeenCalledTimes(1);
    });

    it("handles multiple operation types for same plugin", async () => {
      const onMount = vi.fn();
      const plugin = createMockPlugin("multi-op-plugin", ["read", "write"], {
        lifecycle: { onMount },
      });

      const executor = createPluginExecutor([plugin]);
      const context = createMockContext();

      await executor.executeLifecycle("onMount", "read", context);
      await executor.executeLifecycle("onMount", "write", context);

      expect(onMount).toHaveBeenCalledTimes(2);
    });
  });

  describe("executeUpdateLifecycle", () => {
    it("executes onUpdate handlers with both contexts", async () => {
      const onUpdate = vi.fn();
      const plugin = createMockPlugin("test-plugin", ["read"], {
        lifecycle: { onUpdate },
      });

      const executor = createPluginExecutor([plugin]);
      const context = createMockContext();
      const previousContext = createMockContext({ queryKey: "previous-key" });

      await executor.executeUpdateLifecycle("read", context, previousContext);

      expect(onUpdate).toHaveBeenCalledWith(context, previousContext);
    });

    it("skips plugins not matching operation type", async () => {
      const onUpdate = vi.fn();
      const plugin = createMockPlugin("write-plugin", ["write"], {
        lifecycle: { onUpdate },
      });

      const executor = createPluginExecutor([plugin]);
      const context = createMockContext();
      const previousContext = createMockContext();

      await executor.executeUpdateLifecycle("read", context, previousContext);

      expect(onUpdate).not.toHaveBeenCalled();
    });

    it("skips plugins without onUpdate handler", async () => {
      const plugin = createMockPlugin("no-update-plugin", ["read"], {
        lifecycle: { onMount: vi.fn() },
      });

      const executor = createPluginExecutor([plugin]);
      const context = createMockContext();
      const previousContext = createMockContext();

      await expect(
        executor.executeUpdateLifecycle("read", context, previousContext)
      ).resolves.toBeUndefined();
    });

    it("executes onUpdate handlers in plugin order", async () => {
      const callOrder: string[] = [];

      const plugin1 = createMockPlugin("plugin-1", ["read"], {
        lifecycle: {
          onUpdate: () => {
            callOrder.push("plugin-1");
          },
        },
      });

      const plugin2 = createMockPlugin("plugin-2", ["read"], {
        lifecycle: {
          onUpdate: () => {
            callOrder.push("plugin-2");
          },
        },
      });

      const executor = createPluginExecutor([plugin1, plugin2]);
      const context = createMockContext();
      const previousContext = createMockContext();

      await executor.executeUpdateLifecycle("read", context, previousContext);

      expect(callOrder).toEqual(["plugin-1", "plugin-2"]);
    });

    it("supports async onUpdate handlers", async () => {
      const onUpdate = vi.fn().mockImplementation(async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
      });

      const plugin = createMockPlugin("async-plugin", ["read"], {
        lifecycle: { onUpdate },
      });

      const executor = createPluginExecutor([plugin]);
      const context = createMockContext();
      const previousContext = createMockContext();

      await executor.executeUpdateLifecycle("read", context, previousContext);

      expect(onUpdate).toHaveBeenCalledTimes(1);
    });
  });

  describe("createContext", () => {
    it("creates context with plugins accessor", () => {
      const executor = createPluginExecutor([]);
      const stateManager = createStateManager();
      const eventEmitter = createEventEmitter();

      const context = executor.createContext({
        operationType: "read",
        path: "test",
        method: "GET",
        queryKey: "test-key",
        tags: ["test"],
        requestTimestamp: Date.now(),
        request: { headers: {} },
        metadata: new Map(),
        stateManager,
        eventEmitter,
      });

      expect(context.plugins).toBeDefined();
      expect(typeof context.plugins.get).toBe("function");
    });

    it("allows direct mutation of request.headers", () => {
      const executor = createPluginExecutor([]);
      const stateManager = createStateManager();
      const eventEmitter = createEventEmitter();

      const context = executor.createContext({
        operationType: "read",
        path: "test",
        method: "GET",
        queryKey: "test-key",
        tags: ["test"],
        requestTimestamp: Date.now(),
        request: { headers: {} },
        metadata: new Map(),
        stateManager,
        eventEmitter,
      });

      context.request.headers = {
        ...context.request.headers,
        "Content-Type": "application/json",
      };
      context.request.headers = {
        ...context.request.headers,
        Authorization: "Bearer token",
      };

      expect(context.request.headers).toEqual({
        "Content-Type": "application/json",
        Authorization: "Bearer token",
      });
    });

    it("plugins.get returns plugin exports", () => {
      const plugin = createMockPlugin("export-plugin", ["read"], {
        exports: () => ({ testMethod: () => "test-result" }),
      });

      const executor = createPluginExecutor([plugin]);
      const stateManager = createStateManager();
      const eventEmitter = createEventEmitter();

      const context = executor.createContext({
        operationType: "read",
        path: "test",
        method: "GET",
        queryKey: "test-key",
        tags: ["test"],
        requestTimestamp: Date.now(),
        request: { headers: {} },
        metadata: new Map(),
        stateManager,
        eventEmitter,
      });

      const exports = context.plugins.get("export-plugin") as {
        testMethod: () => string;
      };

      expect(exports?.testMethod()).toBe("test-result");
    });

    it("plugins.get returns undefined for unknown plugin", () => {
      const executor = createPluginExecutor([]);
      const stateManager = createStateManager();
      const eventEmitter = createEventEmitter();

      const context = executor.createContext({
        operationType: "read",
        path: "test",
        method: "GET",
        queryKey: "test-key",
        tags: ["test"],
        requestTimestamp: Date.now(),
        request: { headers: {} },
        metadata: new Map(),
        stateManager,
        eventEmitter,
      });

      expect(context.plugins.get("non-existent")).toBeUndefined();
    });

    it("plugins.get returns undefined when plugin has no exports", () => {
      const plugin = createMockPlugin("no-exports-plugin", ["read"]);
      const executor = createPluginExecutor([plugin]);
      const stateManager = createStateManager();
      const eventEmitter = createEventEmitter();

      const context = executor.createContext({
        operationType: "read",
        path: "test",
        method: "GET",
        queryKey: "test-key",
        tags: ["test"],
        requestTimestamp: Date.now(),
        request: { headers: {} },
        metadata: new Map(),
        stateManager,
        eventEmitter,
      });

      expect(context.plugins.get("no-exports-plugin")).toBeUndefined();
    });
  });

  describe("error handling in middleware chain", () => {
    it("propagates errors from core fetch", async () => {
      const executor = createPluginExecutor([]);
      const context = createMockContext();
      const coreFetch = vi.fn().mockRejectedValue(new Error("Network error"));

      await expect(
        executor.executeMiddleware("read", context, coreFetch)
      ).rejects.toThrow("Network error");
    });

    it("propagates errors from middleware", async () => {
      const middleware = vi
        .fn()
        .mockRejectedValue(new Error("Middleware error"));
      const plugin = createMockPlugin("error-plugin", ["read"], { middleware });
      const executor = createPluginExecutor([plugin]);
      const context = createMockContext();
      const coreFetch = vi
        .fn()
        .mockResolvedValue({ data: "test", status: 200 });

      await expect(
        executor.executeMiddleware("read", context, coreFetch)
      ).rejects.toThrow("Middleware error");
    });

    it("does not call subsequent middleware after error", async () => {
      const middleware1 = vi.fn().mockRejectedValue(new Error("First error"));
      const middleware2 = vi
        .fn()
        .mockImplementation(async (_ctx, next) => next());

      const plugin1 = createMockPlugin("plugin-1", ["read"], {
        middleware: middleware1,
      });
      const plugin2 = createMockPlugin("plugin-2", ["read"], {
        middleware: middleware2,
      });

      const executor = createPluginExecutor([plugin1, plugin2]);
      const context = createMockContext();
      const coreFetch = vi
        .fn()
        .mockResolvedValue({ data: "test", status: 200 });

      await expect(
        executor.executeMiddleware("read", context, coreFetch)
      ).rejects.toThrow("First error");

      expect(middleware2).not.toHaveBeenCalled();
    });

    it("does not call afterResponse handlers when middleware throws", async () => {
      const afterResponse = vi.fn();
      const middleware = vi
        .fn()
        .mockRejectedValue(new Error("Middleware error"));
      const plugin = createMockPlugin("error-plugin", ["read"], {
        middleware,
        afterResponse,
      });

      const executor = createPluginExecutor([plugin]);
      const context = createMockContext();
      const coreFetch = vi
        .fn()
        .mockResolvedValue({ data: "test", status: 200 });

      await expect(
        executor.executeMiddleware("read", context, coreFetch)
      ).rejects.toThrow("Middleware error");

      expect(afterResponse).not.toHaveBeenCalled();
    });

    it("allows middleware to catch and handle errors from next", async () => {
      const errorHandler = vi.fn();
      const middleware = vi.fn().mockImplementation(async (_ctx, next) => {
        try {
          return await next();
        } catch (error) {
          errorHandler(error);
          return { data: "fallback", status: 200 } as SpooshResponse<
            string,
            unknown
          >;
        }
      });

      const plugin = createMockPlugin("error-handling-plugin", ["read"], {
        middleware,
      });

      const executor = createPluginExecutor([plugin]);
      const context = createMockContext();
      const coreFetch = vi.fn().mockRejectedValue(new Error("Fetch error"));

      const result = await executor.executeMiddleware(
        "read",
        context,
        coreFetch
      );

      expect(errorHandler).toHaveBeenCalledWith(expect.any(Error));
      expect(result).toEqual({ data: "fallback", status: 200 });
    });

    it("propagates errors from afterResponse handlers", async () => {
      const afterResponse = vi.fn().mockImplementation(() => {
        throw new Error("afterResponse error");
      });

      const plugin = createMockPlugin("error-plugin", ["read"], {
        afterResponse,
      });
      const executor = createPluginExecutor([plugin]);
      const context = createMockContext();
      const coreFetch = vi
        .fn()
        .mockResolvedValue({ data: "test", status: 200 });

      await expect(
        executor.executeMiddleware("read", context, coreFetch)
      ).rejects.toThrow("afterResponse error");
    });

    it("propagates errors from lifecycle handlers", async () => {
      const onMount = vi.fn().mockImplementation(() => {
        throw new Error("Lifecycle error");
      });

      const plugin = createMockPlugin("error-plugin", ["read"], {
        lifecycle: { onMount },
      });

      const executor = createPluginExecutor([plugin]);
      const context = createMockContext();

      await expect(
        executor.executeLifecycle("onMount", "read", context)
      ).rejects.toThrow("Lifecycle error");
    });

    it("propagates async errors from lifecycle handlers", async () => {
      const onMount = vi
        .fn()
        .mockRejectedValue(new Error("Async lifecycle error"));
      const plugin = createMockPlugin("error-plugin", ["read"], {
        lifecycle: { onMount },
      });

      const executor = createPluginExecutor([plugin]);
      const context = createMockContext();

      await expect(
        executor.executeLifecycle("onMount", "read", context)
      ).rejects.toThrow("Async lifecycle error");
    });
  });

  describe("infiniteRead operation type", () => {
    it("executes middleware for infiniteRead operation", async () => {
      const middleware = vi
        .fn()
        .mockImplementation(async (_ctx, next) => next());
      const plugin = createMockPlugin("infinite-plugin", ["infiniteRead"], {
        middleware,
      });

      const executor = createPluginExecutor([plugin]);
      const context = createMockContext({ operationType: "infiniteRead" });
      const coreFetch = vi
        .fn()
        .mockResolvedValue({ data: "test", status: 200 });

      await executor.executeMiddleware("infiniteRead", context, coreFetch);

      expect(middleware).toHaveBeenCalledTimes(1);
    });

    it("executes lifecycle for infiniteRead operation", async () => {
      const onMount = vi.fn();
      const plugin = createMockPlugin("infinite-plugin", ["infiniteRead"], {
        lifecycle: { onMount },
      });

      const executor = createPluginExecutor([plugin]);
      const context = createMockContext({ operationType: "infiniteRead" });

      await executor.executeLifecycle("onMount", "infiniteRead", context);

      expect(onMount).toHaveBeenCalledTimes(1);
    });
  });

  describe("plugin supporting multiple operations", () => {
    it("applies middleware to all specified operations", async () => {
      const middleware = vi
        .fn()
        .mockImplementation(async (_ctx, next) => next());
      const plugin = createMockPlugin("multi-op-plugin", ["read", "write"], {
        middleware,
      });

      const executor = createPluginExecutor([plugin]);
      const coreFetch = vi
        .fn()
        .mockResolvedValue({ data: "test", status: 200 });

      await executor.executeMiddleware("read", createMockContext(), coreFetch);

      await executor.executeMiddleware(
        "write",
        createMockContext({ operationType: "write", method: "POST" }),
        coreFetch
      );

      expect(middleware).toHaveBeenCalledTimes(2);
    });

    it("does not apply middleware to unspecified operations", async () => {
      const middleware = vi
        .fn()
        .mockImplementation(async (_ctx, next) => next());
      const plugin = createMockPlugin("read-write-plugin", ["read", "write"], {
        middleware,
      });

      const executor = createPluginExecutor([plugin]);
      const context = createMockContext({ operationType: "infiniteRead" });
      const coreFetch = vi
        .fn()
        .mockResolvedValue({ data: "test", status: 200 });

      await executor.executeMiddleware("infiniteRead", context, coreFetch);

      expect(middleware).not.toHaveBeenCalled();
    });
  });
});
