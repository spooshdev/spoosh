import { createMockContext, createStateManager } from "@spoosh/test-utils";
import type { StateManager, InstanceApiContext } from "@spoosh/core";

import { cachePlugin } from "./plugin";
import type { CacheInstanceApi } from "./types";

function createMockInstanceApiContext(
  stateManager?: StateManager
): InstanceApiContext {
  return {
    api: {},
    stateManager: stateManager ?? createStateManager(),
    eventEmitter: { on: vi.fn(), off: vi.fn(), emit: vi.fn() },
    pluginExecutor: {
      executeMiddleware: vi.fn(),
      createContext: vi.fn(),
    },
  } as unknown as InstanceApiContext;
}

describe("cachePlugin", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("plugin configuration", () => {
    it("should have correct name", () => {
      const plugin = cachePlugin();
      expect(plugin.name).toBe("spoosh:cache");
    });

    it("should operate on read and infiniteRead operations", () => {
      const plugin = cachePlugin();
      expect(plugin.operations).toEqual(["read", "infiniteRead"]);
    });
  });

  describe("cache miss", () => {
    it("should call next() when cache is empty", async () => {
      const plugin = cachePlugin();
      const context = createMockContext();
      const expectedResponse = { data: { id: 1, name: "User" }, status: 200 };
      const next = vi.fn().mockResolvedValue(expectedResponse);

      const result = await plugin.middleware!(context, next);

      expect(next).toHaveBeenCalled();
      expect(result).toEqual(expectedResponse);
    });

    it("should store data in cache after successful fetch", async () => {
      const plugin = cachePlugin();
      const stateManager = createStateManager();
      const context = createMockContext({ stateManager });
      const fetchedData = { id: 1, name: "User" };
      const next = vi
        .fn()
        .mockResolvedValue({ data: fetchedData, status: 200 });

      await plugin.middleware!(context, next);

      const cached = stateManager.getCache(context.queryKey);
      expect(cached?.state.data).toEqual(fetchedData);
    });

    it("should not cache error responses", async () => {
      const plugin = cachePlugin();
      const stateManager = createStateManager();
      const context = createMockContext({ stateManager });
      const error = { message: "Not found" };
      const next = vi.fn().mockResolvedValue({ error, status: 404 });

      await plugin.middleware!(context, next);

      const cached = stateManager.getCache(context.queryKey);
      expect(cached).toBeUndefined();
    });
  });

  describe("cache hit", () => {
    it("should return cached data when available and not stale", async () => {
      const plugin = cachePlugin({ staleTime: 5000 });
      const stateManager = createStateManager();

      stateManager.setCache('{"method":"GET","path":["users","1"]}', {
        state: {
          data: { id: 1, name: "Cached User" },
          error: undefined,
          timestamp: Date.now(),
        },
        tags: ["users", "users/1"],
        stale: false,
      });

      const context = createMockContext({
        stateManager,
        queryKey: '{"method":"GET","path":["users","1"]}',
        path: ["users", "1"],
        tags: ["users", "users/1"],
      });
      const next = vi.fn();

      const result = await plugin.middleware!(context, next);

      expect(next).not.toHaveBeenCalled();
      expect(result.data).toEqual({ id: 1, name: "Cached User" });
      expect(result.status).toBe(200);
    });

    it("should call next() when cached data is time-stale", async () => {
      const plugin = cachePlugin({ staleTime: 5000 });
      const stateManager = createStateManager();

      vi.setSystemTime(new Date("2024-01-01T00:00:00Z"));

      stateManager.setCache('{"method":"GET","path":["users","1"]}', {
        state: {
          data: { id: 1, name: "Cached User" },
          error: undefined,
          timestamp: Date.now(),
        },
        tags: ["users", "users/1"],
        stale: false,
      });

      vi.advanceTimersByTime(6000);

      const context = createMockContext({
        stateManager,
        queryKey: '{"method":"GET","path":["users","1"]}',
        path: ["users", "1"],
        tags: ["users", "users/1"],
      });
      const next = vi.fn().mockResolvedValue({
        data: { id: 1, name: "Fresh User" },
        status: 200,
      });

      const result = await plugin.middleware!(context, next);

      expect(next).toHaveBeenCalled();
      expect(result.data).toEqual({ id: 1, name: "Fresh User" });
    });

    it("should call next() when cache entry is marked stale", async () => {
      const plugin = cachePlugin({ staleTime: 60000 });
      const stateManager = createStateManager();

      stateManager.setCache('{"method":"GET","path":["users","1"]}', {
        state: {
          data: { id: 1, name: "Cached User" },
          error: undefined,
          timestamp: Date.now(),
        },
        tags: ["users", "users/1"],
        stale: true,
      });

      const context = createMockContext({
        stateManager,
        queryKey: '{"method":"GET","path":["users","1"]}',
        path: ["users", "1"],
        tags: ["users", "users/1"],
      });
      const next = vi.fn().mockResolvedValue({
        data: { id: 1, name: "Fresh User" },
        status: 200,
      });

      const result = await plugin.middleware!(context, next);

      expect(next).toHaveBeenCalled();
      expect(result.data).toEqual({ id: 1, name: "Fresh User" });
    });
  });

  describe("staleTime configuration", () => {
    it("should use default staleTime of 0 when not configured", async () => {
      const plugin = cachePlugin();
      const stateManager = createStateManager();

      vi.setSystemTime(new Date("2024-01-01T00:00:00Z"));

      stateManager.setCache('{"method":"GET","path":["users","1"]}', {
        state: {
          data: { id: 1, name: "Cached User" },
          error: undefined,
          timestamp: Date.now() - 1,
        },
        tags: ["users", "users/1"],
        stale: false,
      });

      const context = createMockContext({
        stateManager,
        queryKey: '{"method":"GET","path":["users","1"]}',
        path: ["users", "1"],
        tags: ["users", "users/1"],
      });
      const next = vi.fn().mockResolvedValue({
        data: { id: 1, name: "Fresh User" },
        status: 200,
      });

      await plugin.middleware!(context, next);

      expect(next).toHaveBeenCalled();
    });

    it("should use per-request staleTime override", async () => {
      const plugin = cachePlugin({ staleTime: 1000 });
      const stateManager = createStateManager();

      vi.setSystemTime(new Date("2024-01-01T00:00:00Z"));

      stateManager.setCache('{"method":"GET","path":["users","1"]}', {
        state: {
          data: { id: 1, name: "Cached User" },
          error: undefined,
          timestamp: Date.now(),
        },
        tags: ["users", "users/1"],
        stale: false,
      });

      vi.advanceTimersByTime(3000);

      const context = createMockContext({
        stateManager,
        queryKey: '{"method":"GET","path":["users","1"]}',
        path: ["users", "1"],
        tags: ["users", "users/1"],
        pluginOptions: { staleTime: 5000 },
      });
      const next = vi.fn();

      const result = await plugin.middleware!(context, next);

      expect(next).not.toHaveBeenCalled();
      expect(result.data).toEqual({ id: 1, name: "Cached User" });
    });
  });

  describe("forceRefetch", () => {
    it("should bypass cache when forceRefetch is true", async () => {
      const plugin = cachePlugin({ staleTime: 60000 });
      const stateManager = createStateManager();

      stateManager.setCache('{"method":"GET","path":["users","1"]}', {
        state: {
          data: { id: 1, name: "Cached User" },
          error: undefined,
          timestamp: Date.now(),
        },
        tags: ["users", "users/1"],
        stale: false,
      });

      const context = createMockContext({
        stateManager,
        queryKey: '{"method":"GET","path":["users","1"]}',
        path: ["users", "1"],
        tags: ["users", "users/1"],
        forceRefetch: true,
      });
      const next = vi.fn().mockResolvedValue({
        data: { id: 1, name: "Fresh User" },
        status: 200,
      });

      const result = await plugin.middleware!(context, next);

      expect(next).toHaveBeenCalled();
      expect(result.data).toEqual({ id: 1, name: "Fresh User" });
    });
  });

  describe("cache state updates", () => {
    it("should set stale to false after successful fetch", async () => {
      const plugin = cachePlugin();
      const stateManager = createStateManager();
      const context = createMockContext({ stateManager });
      const next = vi.fn().mockResolvedValue({
        data: { id: 1 },
        status: 200,
      });

      await plugin.middleware!(context, next);

      const cached = stateManager.getCache(context.queryKey);
      expect(cached?.stale).toBe(false);
    });

    it("should update timestamp after successful fetch", async () => {
      vi.setSystemTime(new Date("2024-01-01T12:00:00Z"));

      const plugin = cachePlugin();
      const stateManager = createStateManager();
      const context = createMockContext({ stateManager });
      const next = vi.fn().mockResolvedValue({
        data: { id: 1 },
        status: 200,
      });

      await plugin.middleware!(context, next);

      const cached = stateManager.getCache(context.queryKey);
      expect(cached?.state.timestamp).toBe(Date.now());
    });

    it("should store tags with cache entry", async () => {
      const plugin = cachePlugin();
      const stateManager = createStateManager();
      const tags = ["users", "users/1", "admin"];
      const context = createMockContext({ stateManager, tags });
      const next = vi.fn().mockResolvedValue({
        data: { id: 1 },
        status: 200,
      });

      await plugin.middleware!(context, next);

      const cached = stateManager.getCache(context.queryKey);
      expect(cached?.tags).toEqual(tags);
    });

    it("should clear error when data is fetched successfully", async () => {
      const plugin = cachePlugin();
      const stateManager = createStateManager();

      stateManager.setCache('{"method":"GET","path":["users","1"]}', {
        state: {
          data: undefined,
          error: { message: "Previous error" },
          timestamp: 0,
        },
        tags: [],
        stale: false,
      });

      const context = createMockContext({
        stateManager,
        queryKey: '{"method":"GET","path":["users","1"]}',
        path: ["users", "1"],
        tags: ["users", "users/1"],
        forceRefetch: true,
      });
      const next = vi.fn().mockResolvedValue({
        data: { id: 1 },
        status: 200,
      });

      await plugin.middleware!(context, next);

      const cached = stateManager.getCache(context.queryKey);
      expect(cached?.state.error).toBeUndefined();
      expect(cached?.state.data).toEqual({ id: 1 });
    });
  });

  describe("instanceApi", () => {
    it("should have instanceApi defined", () => {
      const plugin = cachePlugin();
      expect(plugin.instanceApi).toBeDefined();
    });

    it("should return clearCache function", () => {
      const plugin = cachePlugin();
      const context = createMockInstanceApiContext();
      const exports = plugin.instanceApi!(context) as CacheInstanceApi;

      expect(exports.clearCache).toBeInstanceOf(Function);
    });

    it("should clear all cache entries when clearCache is called", () => {
      const plugin = cachePlugin();
      const stateManager = createStateManager();

      stateManager.setCache("entry-1", {
        state: { data: "data1", error: undefined, timestamp: Date.now() },
        tags: ["tag1"],
      });
      stateManager.setCache("entry-2", {
        state: { data: "data2", error: undefined, timestamp: Date.now() },
        tags: ["tag2"],
      });

      expect(stateManager.getSize()).toBe(2);

      const context = createMockInstanceApiContext(stateManager);
      const exports = plugin.instanceApi!(context) as CacheInstanceApi;

      exports.clearCache();

      expect(stateManager.getSize()).toBe(0);
      expect(stateManager.getCache("entry-1")).toBeUndefined();
      expect(stateManager.getCache("entry-2")).toBeUndefined();
    });

    it("should not throw when clearing empty cache", () => {
      const plugin = cachePlugin();
      const stateManager = createStateManager();
      const context = createMockInstanceApiContext(stateManager);
      const exports = plugin.instanceApi!(context) as CacheInstanceApi;

      expect(() => exports.clearCache()).not.toThrow();
    });
  });

  describe("edge cases", () => {
    it("should not cache when data is undefined", async () => {
      const plugin = cachePlugin();
      const stateManager = createStateManager();
      const context = createMockContext({ stateManager });
      const next = vi.fn().mockResolvedValue({ status: 204 });

      await plugin.middleware!(context, next);

      const cached = stateManager.getCache(context.queryKey);
      expect(cached).toBeUndefined();
    });

    it("should handle cache without data property", async () => {
      const plugin = cachePlugin({ staleTime: 5000 });
      const stateManager = createStateManager();

      stateManager.setCache('{"method":"GET","path":["users","1"]}', {
        state: {
          data: undefined,
          error: undefined,
          timestamp: Date.now(),
        },
        tags: [],
        stale: false,
      });

      const context = createMockContext({
        stateManager,
        queryKey: '{"method":"GET","path":["users","1"]}',
        path: ["users", "1"],
        tags: ["users", "users/1"],
      });
      const next = vi.fn().mockResolvedValue({
        data: { id: 1 },
        status: 200,
      });

      await plugin.middleware!(context, next);

      expect(next).toHaveBeenCalled();
    });
  });
});
