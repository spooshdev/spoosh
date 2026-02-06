import { createStateManager } from "@spoosh/core";
import type { PluginContext } from "@spoosh/core";
import {
  createMockContext as baseCreateMockContext,
  type MockContextOptions,
} from "@spoosh/test-utils";

import { debugPlugin } from "./plugin";

type ExtendedMockContextOptions<
  TData = unknown,
  TError = unknown,
> = MockContextOptions<TData, TError> & {
  requestTimestamp?: number;
};

function createMockContext<TData = unknown, TError = unknown>(
  options: ExtendedMockContextOptions<TData, TError> = {}
): PluginContext {
  const { requestTimestamp, ...restOptions } = options;

  const context = baseCreateMockContext<TData, TError>({
    path: "users/1",
    queryKey: '{"method":"GET","path":["users","1"]}',
    tags: ["users", "users/1"],
    ...restOptions,
  });

  if (requestTimestamp !== undefined) {
    (context as { requestTimestamp: number }).requestTimestamp =
      requestTimestamp;
  }

  return context;
}

describe("debugPlugin", () => {
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;
  let consoleGroupCollapsedSpy: ReturnType<typeof vi.spyOn>;
  let consoleGroupEndSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    consoleGroupCollapsedSpy = vi
      .spyOn(console, "groupCollapsed")
      .mockImplementation(() => {});
    consoleGroupEndSpy = vi
      .spyOn(console, "groupEnd")
      .mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("plugin configuration", () => {
    it("should have correct name", () => {
      const plugin = debugPlugin();
      expect(plugin.name).toBe("spoosh:debug");
    });

    it("should operate on read, write, and infiniteRead operations", () => {
      const plugin = debugPlugin();
      expect(plugin.operations).toEqual(["read", "write", "infiniteRead"]);
    });
  });

  describe("logs request info when enabled", () => {
    it("should log beforeFetch phase in middleware", async () => {
      const plugin = debugPlugin({ enabled: true });
      const context = createMockContext();
      const next = vi.fn().mockResolvedValue({ data: { id: 1 }, status: 200 });

      await plugin.middleware!(context, next);

      expect(consoleGroupCollapsedSpy).toHaveBeenCalledWith(
        "[spoosh] read GET /users/1 → beforeFetch"
      );
      expect(consoleLogSpy).toHaveBeenCalledWith(
        "Query Key:",
        context.queryKey
      );
      expect(consoleLogSpy).toHaveBeenCalledWith("Tags:", context.tags);
      expect(consoleLogSpy).toHaveBeenCalledWith(
        "Request Options:",
        context.request
      );
      expect(consoleLogSpy).toHaveBeenCalledWith("Cache State:", undefined);
      expect(consoleGroupEndSpy).toHaveBeenCalled();
    });

    it("should log onMount phase in lifecycle", () => {
      const plugin = debugPlugin({ enabled: true });
      const context = createMockContext();

      plugin.lifecycle!.onMount!(context);

      expect(consoleGroupCollapsedSpy).toHaveBeenCalledWith(
        "[spoosh] read GET /users/1 → onMount"
      );
      expect(consoleGroupEndSpy).toHaveBeenCalled();
    });

    it("should log onUpdate phase in lifecycle", () => {
      const plugin = debugPlugin({ enabled: true });
      const context = createMockContext();
      const prevContext = createMockContext();

      plugin.lifecycle!.onUpdate!(context, prevContext);

      expect(consoleGroupCollapsedSpy).toHaveBeenCalledWith(
        "[spoosh] read GET /users/1 → onUpdate"
      );
      expect(consoleGroupEndSpy).toHaveBeenCalled();
    });

    it("should log onUnmount phase in lifecycle", () => {
      const plugin = debugPlugin({ enabled: true });
      const context = createMockContext();

      plugin.lifecycle!.onUnmount!(context);

      expect(consoleGroupCollapsedSpy).toHaveBeenCalledWith(
        "[spoosh] read GET /users/1 → onUnmount"
      );
      expect(consoleGroupEndSpy).toHaveBeenCalled();
    });

    it("should log for write operations", async () => {
      const plugin = debugPlugin({ enabled: true });
      const context = createMockContext({
        operationType: "write",
        method: "POST",
        path: "users",
      });
      const next = vi.fn().mockResolvedValue({ data: { id: 1 }, status: 201 });

      await plugin.middleware!(context, next);

      expect(consoleGroupCollapsedSpy).toHaveBeenCalledWith(
        "[spoosh] write POST /users → beforeFetch"
      );
    });

    it("should log for infiniteRead operations", async () => {
      const plugin = debugPlugin({ enabled: true });
      const context = createMockContext({
        operationType: "infiniteRead",
        path: "posts",
      });
      const next = vi
        .fn()
        .mockResolvedValue({ data: { items: [] }, status: 200 });

      await plugin.middleware!(context, next);

      expect(consoleGroupCollapsedSpy).toHaveBeenCalledWith(
        "[spoosh] infiniteRead GET /posts → beforeFetch"
      );
    });
  });

  describe("silent when enabled: false", () => {
    it("should not log in middleware when disabled", async () => {
      const plugin = debugPlugin({ enabled: false });
      const context = createMockContext();
      const next = vi.fn().mockResolvedValue({ data: { id: 1 }, status: 200 });

      await plugin.middleware!(context, next);

      expect(consoleLogSpy).not.toHaveBeenCalled();
      expect(consoleGroupCollapsedSpy).not.toHaveBeenCalled();
    });

    it("should not log in onMount lifecycle when disabled", () => {
      const plugin = debugPlugin({ enabled: false });
      const context = createMockContext();

      plugin.lifecycle!.onMount!(context);

      expect(consoleLogSpy).not.toHaveBeenCalled();
      expect(consoleGroupCollapsedSpy).not.toHaveBeenCalled();
    });

    it("should not log in onUpdate lifecycle when disabled", () => {
      const plugin = debugPlugin({ enabled: false });
      const context = createMockContext();
      const prevContext = createMockContext();

      plugin.lifecycle!.onUpdate!(context, prevContext);

      expect(consoleLogSpy).not.toHaveBeenCalled();
      expect(consoleGroupCollapsedSpy).not.toHaveBeenCalled();
    });

    it("should not log in onUnmount lifecycle when disabled", () => {
      const plugin = debugPlugin({ enabled: false });
      const context = createMockContext();

      plugin.lifecycle!.onUnmount!(context);

      expect(consoleLogSpy).not.toHaveBeenCalled();
      expect(consoleGroupCollapsedSpy).not.toHaveBeenCalled();
    });

    it("should not log in afterResponse when disabled", () => {
      const plugin = debugPlugin({ enabled: false });
      const context = createMockContext();
      const response = { data: { id: 1 }, status: 200 };

      plugin.afterResponse!(context, response);

      expect(consoleLogSpy).not.toHaveBeenCalled();
      expect(consoleGroupCollapsedSpy).not.toHaveBeenCalled();
    });

    it("should still call next in middleware when disabled", async () => {
      const plugin = debugPlugin({ enabled: false });
      const context = createMockContext();
      const expectedResponse = { data: { id: 1 }, status: 200 };
      const next = vi.fn().mockResolvedValue(expectedResponse);

      const result = await plugin.middleware!(context, next);

      expect(next).toHaveBeenCalled();
      expect(result).toEqual(expectedResponse);
    });
  });

  describe("logCache option logs cache state", () => {
    it("should log cache entries when logCache is true", async () => {
      const stateManager = createStateManager();
      const queryKey = stateManager.createQueryKey({
        path: ["users", "1"],
        method: "GET",
      });
      stateManager.setCache(queryKey, {
        state: {
          data: { name: "Cached User" },
          error: undefined,
          timestamp: Date.now(),
        },
        tags: ["users", "users/1"],
      });

      const plugin = debugPlugin({ enabled: true, logCache: true });
      const context = createMockContext({
        stateManager,
        tags: ["users", "users/1"],
      });
      const next = vi.fn().mockResolvedValue({ data: { id: 1 }, status: 200 });

      await plugin.middleware!(context, next);

      expect(consoleGroupCollapsedSpy).toHaveBeenCalledWith(
        expect.stringContaining("Cache Entries")
      );
    });

    it("should not log cache entries when logCache is false", async () => {
      const stateManager = createStateManager();
      const queryKey = stateManager.createQueryKey({
        path: ["users", "1"],
        method: "GET",
      });
      stateManager.setCache(queryKey, {
        state: {
          data: { name: "Cached User" },
          error: undefined,
          timestamp: Date.now(),
        },
        tags: ["users", "users/1"],
      });

      const plugin = debugPlugin({ enabled: true, logCache: false });
      const context = createMockContext({
        stateManager,
        tags: ["users", "users/1"],
      });
      const next = vi.fn().mockResolvedValue({ data: { id: 1 }, status: 200 });

      await plugin.middleware!(context, next);

      const cacheEntriesCall = consoleGroupCollapsedSpy.mock.calls.find(
        (call: unknown[]) =>
          typeof call[0] === "string" && call[0].includes("Cache Entries")
      );
      expect(cacheEntriesCall).toBeUndefined();
    });

    it("should show empty cache entries when no matching cache", async () => {
      const plugin = debugPlugin({ enabled: true, logCache: true });
      const context = createMockContext();
      const next = vi.fn().mockResolvedValue({ data: { id: 1 }, status: 200 });

      await plugin.middleware!(context, next);

      expect(consoleGroupCollapsedSpy).toHaveBeenCalledWith(
        "Cache Entries (0)"
      );
    });

    it("should default logCache to false", async () => {
      const plugin = debugPlugin({ enabled: true });
      const context = createMockContext();
      const next = vi.fn().mockResolvedValue({ data: { id: 1 }, status: 200 });

      await plugin.middleware!(context, next);

      const cacheEntriesCall = consoleGroupCollapsedSpy.mock.calls.find(
        (call: unknown[]) =>
          typeof call[0] === "string" && call[0].includes("Cache Entries")
      );
      expect(cacheEntriesCall).toBeUndefined();
    });
  });

  describe("logs response after fetch", () => {
    it("should log afterFetch phase with response data", () => {
      const plugin = debugPlugin({ enabled: true });
      const context = createMockContext();
      const response = { data: { id: 1, name: "User" }, status: 200 };

      plugin.afterResponse!(context, response);

      expect(consoleGroupCollapsedSpy).toHaveBeenCalledWith(
        "[spoosh] read GET /users/1 → afterFetch"
      );
      expect(consoleLogSpy).toHaveBeenCalledWith("Response:", response);
    });

    it("should log error responses", () => {
      const plugin = debugPlugin({ enabled: true });
      const context = createMockContext();
      const response = { error: { message: "Not found" }, status: 404 };

      plugin.afterResponse!(context, response);

      expect(consoleGroupCollapsedSpy).toHaveBeenCalledWith(
        "[spoosh] read GET /users/1 → afterFetch"
      );
      expect(consoleLogSpy).toHaveBeenCalledWith("Response:", response);
    });

    it("should log response for write operations", () => {
      const plugin = debugPlugin({ enabled: true });
      const context = createMockContext({
        operationType: "write",
        method: "POST",
        path: "users",
      });
      const response = { data: { id: 1 }, status: 201 };

      plugin.afterResponse!(context, response);

      expect(consoleGroupCollapsedSpy).toHaveBeenCalledWith(
        "[spoosh] write POST /users → afterFetch"
      );
    });
  });

  describe("custom logger function", () => {
    it("should call custom logger instead of console", async () => {
      const customLogger = vi.fn();
      const plugin = debugPlugin({ enabled: true, logger: customLogger });
      const context = createMockContext();
      const next = vi.fn().mockResolvedValue({ data: { id: 1 }, status: 200 });

      await plugin.middleware!(context, next);

      expect(customLogger).toHaveBeenCalledWith(
        expect.objectContaining({
          phase: "beforeFetch",
          operationType: "read",
          method: "GET",
          path: "users/1",
        })
      );
      expect(consoleLogSpy).not.toHaveBeenCalled();
      expect(consoleGroupCollapsedSpy).not.toHaveBeenCalled();
    });

    it("should pass complete log entry to custom logger", async () => {
      const customLogger = vi.fn();
      const plugin = debugPlugin({
        enabled: true,
        logger: customLogger,
        logCache: true,
      });
      const context = createMockContext();
      const next = vi.fn().mockResolvedValue({ data: { id: 1 }, status: 200 });

      await plugin.middleware!(context, next);

      expect(customLogger).toHaveBeenCalledWith(
        expect.objectContaining({
          phase: "beforeFetch",
          operationType: "read",
          method: "GET",
          path: "users/1",
          queryKey: context.queryKey,
          tags: context.tags,
          requestOptions: context.request,
          state: expect.objectContaining({}),
          cacheEntries: expect.any(Array),
        })
      );
    });

    it("should use custom logger in lifecycle hooks", () => {
      const customLogger = vi.fn();
      const plugin = debugPlugin({ enabled: true, logger: customLogger });
      const context = createMockContext();

      plugin.lifecycle!.onMount!(context);

      expect(customLogger).toHaveBeenCalledWith(
        expect.objectContaining({
          phase: "onMount",
        })
      );
    });

    it("should use custom logger in afterResponse", () => {
      const customLogger = vi.fn();
      const plugin = debugPlugin({ enabled: true, logger: customLogger });
      const context = createMockContext();
      const response = { data: { id: 1 }, status: 200 };

      plugin.afterResponse!(context, response);

      expect(customLogger).toHaveBeenCalledWith(
        expect.objectContaining({
          phase: "afterFetch",
          response: expect.objectContaining({
            data: { id: 1 },
            status: 200,
          }),
        })
      );
    });
  });

  describe("separator between different requests", () => {
    it("should log separator when requestTimestamp changes", async () => {
      const plugin = debugPlugin({ enabled: true });
      const context1 = createMockContext({
        requestTimestamp: 1000,
      });
      const context2 = createMockContext({
        requestTimestamp: 2000,
      });
      const next = vi.fn().mockResolvedValue({ data: {}, status: 200 });

      await plugin.middleware!(context1, next);
      await plugin.middleware!(context2, next);

      expect(consoleLogSpy).toHaveBeenCalledWith("─".repeat(80));
    });

    it("should not log separator for same requestTimestamp", async () => {
      const plugin = debugPlugin({ enabled: true });
      const timestamp = Date.now();
      const context = createMockContext({
        requestTimestamp: timestamp,
      });
      const next = vi.fn().mockResolvedValue({ data: {}, status: 200 });

      await plugin.middleware!(context, next);
      plugin.lifecycle!.onMount!(context);

      const separatorCalls = consoleLogSpy.mock.calls.filter(
        (call: unknown[]) => call[0] === "─".repeat(80)
      );
      expect(separatorCalls).toHaveLength(0);
    });
  });

  describe("default configuration", () => {
    it("should enable logging by default", async () => {
      const plugin = debugPlugin();
      const context = createMockContext();
      const next = vi.fn().mockResolvedValue({ data: {}, status: 200 });

      await plugin.middleware!(context, next);

      expect(consoleGroupCollapsedSpy).toHaveBeenCalled();
    });

    it("should not log cache by default", async () => {
      const plugin = debugPlugin();
      const context = createMockContext();
      const next = vi.fn().mockResolvedValue({ data: {}, status: 200 });

      await plugin.middleware!(context, next);

      const cacheEntriesCall = consoleGroupCollapsedSpy.mock.calls.find(
        (call: unknown[]) =>
          typeof call[0] === "string" && call[0].includes("Cache Entries")
      );
      expect(cacheEntriesCall).toBeUndefined();
    });
  });

  describe("middleware behavior", () => {
    it("should call next() and return its result", async () => {
      const plugin = debugPlugin();
      const context = createMockContext();
      const expectedResponse = { data: { id: 1, name: "User" }, status: 200 };
      const next = vi.fn().mockResolvedValue(expectedResponse);

      const result = await plugin.middleware!(context, next);

      expect(next).toHaveBeenCalled();
      expect(result).toEqual(expectedResponse);
    });

    it("should propagate errors from next", async () => {
      const plugin = debugPlugin();
      const context = createMockContext();
      const error = new Error("Network error");
      const next = vi.fn().mockRejectedValue(error);

      await expect(plugin.middleware!(context, next)).rejects.toThrow(error);
    });
  });

  describe("state logging", () => {
    it("should log complete cache state information", async () => {
      const plugin = debugPlugin({ enabled: true });
      const stateManager = createStateManager();
      const queryKey = stateManager.createQueryKey({
        path: ["users", "1"],
        method: "GET",
      });

      stateManager.setCache(queryKey, {
        state: {
          data: { cached: true },
          error: undefined,
          timestamp: 12345,
        },
        tags: ["users", "users/1"],
      });

      const context = createMockContext({ stateManager, queryKey });
      const next = vi.fn().mockResolvedValue({ data: {}, status: 200 });

      await plugin.middleware!(context, next);

      const cached = stateManager.getCache(queryKey);
      expect(consoleLogSpy).toHaveBeenCalledWith("Cache State:", cached?.state);
    });

    it("should log error cache state when present", async () => {
      const plugin = debugPlugin({ enabled: true });
      const stateManager = createStateManager();
      const queryKey = stateManager.createQueryKey({
        path: ["users", "1"],
        method: "GET",
      });

      const errorObj = { message: "Previous error" };
      stateManager.setCache(queryKey, {
        state: {
          data: undefined,
          error: errorObj,
          timestamp: 12345,
        },
        tags: ["users", "users/1"],
      });

      const context = createMockContext({ stateManager, queryKey });
      const next = vi.fn().mockResolvedValue({ data: {}, status: 200 });

      await plugin.middleware!(context, next);

      const cached = stateManager.getCache(queryKey);
      expect(consoleLogSpy).toHaveBeenCalledWith("Cache State:", cached?.state);
    });
  });
});
