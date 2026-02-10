import {
  createMockContext as baseCreateMockContext,
  createStateManager,
  type MockContextOptions,
} from "@spoosh/test-utils";

import { initialDataPlugin } from "./plugin";

function createMockContext(options: MockContextOptions = {}) {
  return baseCreateMockContext({
    path: "users/1",
    queryKey: '{"method":"GET","path":["users","1"]}',
    tags: ["users", "users/1"],
    ...options,
  });
}

describe("initialDataPlugin", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("plugin configuration", () => {
    it("should have correct name", () => {
      const plugin = initialDataPlugin();
      expect(plugin.name).toBe("spoosh:initialData");
    });

    it("should operate on read and infiniteRead operations", () => {
      const plugin = initialDataPlugin();
      expect(plugin.operations).toEqual(["read", "infiniteRead"]);
    });
  });

  describe("initialData shown immediately in cache", () => {
    it("should set initial data in cache immediately", async () => {
      const plugin = initialDataPlugin();
      const stateManager = createStateManager();
      const initialData = { id: 1, name: "Initial User" };

      const context = createMockContext({
        stateManager,
        instanceId: "hook-1",
        pluginOptions: { initialData },
      });

      const next = vi.fn().mockResolvedValue({
        data: { id: 1, name: "Fresh User" },
        status: 200,
      });

      await plugin.middleware!(context, next);

      const cached = stateManager.getCache(context.queryKey);
      expect(cached).toBeDefined();
    });

    it("should set isInitialData to true in plugin result when initial data is applied", async () => {
      const plugin = initialDataPlugin();
      const stateManager = createStateManager();
      const initialData = { id: 1, name: "Initial User" };

      const context = createMockContext({
        stateManager,
        instanceId: "hook-1",
        pluginOptions: { initialData },
      });

      const next = vi.fn().mockResolvedValue({
        data: { id: 1, name: "Fresh User" },
        status: 200,
      });

      const setMetaSpy = vi.spyOn(stateManager, "setMeta");

      await plugin.middleware!(context, next);

      expect(setMetaSpy).toHaveBeenCalledWith(
        context.queryKey,
        expect.objectContaining({ isInitialData: true })
      );
    });

    it("should set cache with loading and fetching as false", async () => {
      const plugin = initialDataPlugin();
      const stateManager = createStateManager();
      const initialData = { posts: [] };

      const context = createMockContext({
        stateManager,
        instanceId: "hook-2",
        pluginOptions: { initialData },
      });

      const next = vi.fn().mockResolvedValue({
        data: { posts: [{ id: 1 }] },
        status: 200,
      });

      const setCacheSpy = vi.spyOn(stateManager, "setCache");

      await plugin.middleware!(context, next);

      expect(setCacheSpy).toHaveBeenCalledWith(
        context.queryKey,
        expect.objectContaining({
          state: expect.objectContaining({
            data: initialData,
            error: undefined,
          }),
        })
      );
    });

    it("should set cache with current timestamp", async () => {
      vi.setSystemTime(new Date("2024-01-01T12:00:00Z"));

      const plugin = initialDataPlugin();
      const stateManager = createStateManager();
      const initialData = { id: 1 };

      const context = createMockContext({
        stateManager,
        instanceId: "hook-3",
        pluginOptions: { initialData },
      });

      const next = vi.fn().mockResolvedValue({
        data: { id: 1 },
        status: 200,
      });

      const setCache = vi.spyOn(stateManager, "setCache");

      await plugin.middleware!(context, next);

      expect(setCache).toHaveBeenCalledWith(
        context.queryKey,
        expect.objectContaining({
          state: expect.objectContaining({
            timestamp: Date.now(),
          }),
        })
      );
    });

    it("should include tags in cache entry", async () => {
      const plugin = initialDataPlugin();
      const stateManager = createStateManager();
      const initialData = { id: 1 };
      const tags = ["users", "users/1", "admin"];

      const context = createMockContext({
        stateManager,
        instanceId: "hook-4",
        tags,
        pluginOptions: { initialData },
      });

      const next = vi.fn().mockResolvedValue({
        data: { id: 1 },
        status: 200,
      });

      const setCache = vi.spyOn(stateManager, "setCache");

      await plugin.middleware!(context, next);

      expect(setCache).toHaveBeenCalledWith(
        context.queryKey,
        expect.objectContaining({
          tags,
        })
      );
    });
  });

  describe("still calls next() to fetch real data", () => {
    it("should call next() after setting initial data in cache", async () => {
      const plugin = initialDataPlugin();
      const stateManager = createStateManager();
      const initialData = { id: 1, name: "Initial" };

      const context = createMockContext({
        stateManager,
        instanceId: "hook-5",
        pluginOptions: { initialData },
      });

      const next = vi.fn().mockResolvedValue({
        data: { id: 1, name: "Fresh" },
        status: 200,
      });

      await plugin.middleware!(context, next);

      expect(next).toHaveBeenCalled();
    });

    it("should return the response from next()", async () => {
      const plugin = initialDataPlugin();
      const stateManager = createStateManager();
      const initialData = { id: 1, name: "Initial" };
      const freshData = { id: 1, name: "Fresh User" };

      const context = createMockContext({
        stateManager,
        instanceId: "hook-6",
        pluginOptions: { initialData },
      });

      const next = vi.fn().mockResolvedValue({
        data: freshData,
        status: 200,
      });

      const result = await plugin.middleware!(context, next);

      expect(result.data).toEqual(freshData);
      expect(result.status).toBe(200);
    });

    it("should set isInitialData to false after successful fetch", async () => {
      const plugin = initialDataPlugin();
      const stateManager = createStateManager();
      const initialData = { id: 1 };

      const context = createMockContext({
        stateManager,
        instanceId: "hook-7",
        pluginOptions: { initialData },
      });

      const next = vi.fn().mockResolvedValue({
        data: { id: 1, updated: true },
        status: 200,
      });

      const setMeta = vi.spyOn(stateManager, "setMeta");

      await plugin.middleware!(context, next);

      expect(setMeta).toHaveBeenLastCalledWith(context.queryKey, {
        isInitialData: false,
      });
    });

    it("should not set isInitialData to false if fetch returns error", async () => {
      const plugin = initialDataPlugin();
      const stateManager = createStateManager();
      const initialData = { id: 1 };

      const context = createMockContext({
        stateManager,
        instanceId: "hook-8",
        pluginOptions: { initialData },
      });

      const next = vi.fn().mockResolvedValue({
        error: { message: "Server error" },
        status: 500,
      });

      const setMeta = vi.spyOn(stateManager, "setMeta");

      await plugin.middleware!(context, next);

      expect(setMeta).toHaveBeenCalledWith(context.queryKey, {
        isInitialData: true,
      });
      expect(setMeta).not.toHaveBeenCalledWith(context.queryKey, {
        isInitialData: false,
      });
    });
  });

  describe("refetchOnInitialData option", () => {
    it("should not call next() when refetchOnInitialData is false", async () => {
      const plugin = initialDataPlugin();
      const stateManager = createStateManager();
      const initialData = { id: 1, name: "Initial" };

      const context = createMockContext({
        stateManager,
        instanceId: "hook-9",
        pluginOptions: { initialData, refetchOnInitialData: false },
      });

      const next = vi.fn().mockResolvedValue({
        data: { id: 1, name: "Fresh" },
        status: 200,
      });

      await plugin.middleware!(context, next);

      expect(next).not.toHaveBeenCalled();
    });

    it("should return initial data directly when refetchOnInitialData is false", async () => {
      const plugin = initialDataPlugin();
      const stateManager = createStateManager();
      const initialData = { id: 1, name: "Initial User" };

      const context = createMockContext({
        stateManager,
        instanceId: "hook-10",
        pluginOptions: { initialData, refetchOnInitialData: false },
      });

      const next = vi.fn();

      const result = await plugin.middleware!(context, next);

      expect(result.data).toEqual(initialData);
      expect(result.status).toBe(200);
    });

    it("should call next() when refetchOnInitialData is true (default)", async () => {
      const plugin = initialDataPlugin();
      const stateManager = createStateManager();
      const initialData = { id: 1 };

      const context = createMockContext({
        stateManager,
        instanceId: "hook-11",
        pluginOptions: { initialData, refetchOnInitialData: true },
      });

      const next = vi.fn().mockResolvedValue({
        data: { id: 1, fresh: true },
        status: 200,
      });

      await plugin.middleware!(context, next);

      expect(next).toHaveBeenCalled();
    });

    it("should call next() when refetchOnInitialData is undefined (default true)", async () => {
      const plugin = initialDataPlugin();
      const stateManager = createStateManager();
      const initialData = { id: 1 };

      const context = createMockContext({
        stateManager,
        instanceId: "hook-12",
        pluginOptions: { initialData },
      });

      const next = vi.fn().mockResolvedValue({
        data: { id: 1, fresh: true },
        status: 200,
      });

      await plugin.middleware!(context, next);

      expect(next).toHaveBeenCalled();
    });
  });

  describe("no initialData option does nothing", () => {
    it("should call next() directly when initialData is undefined", async () => {
      const plugin = initialDataPlugin();
      const stateManager = createStateManager();

      const context = createMockContext({
        stateManager,
        instanceId: "hook-13",
        pluginOptions: {},
      });

      const expectedResponse = { data: { id: 1 }, status: 200 };
      const next = vi.fn().mockResolvedValue(expectedResponse);

      const result = await plugin.middleware!(context, next);

      expect(next).toHaveBeenCalled();
      expect(result).toEqual(expectedResponse);
    });

    it("should not set cache when no initialData", async () => {
      const plugin = initialDataPlugin();
      const stateManager = createStateManager();

      const context = createMockContext({
        stateManager,
        instanceId: "hook-14",
        pluginOptions: undefined,
      });

      const setCache = vi.spyOn(stateManager, "setCache");

      const next = vi.fn().mockResolvedValue({
        data: { id: 1 },
        status: 200,
      });

      await plugin.middleware!(context, next);

      expect(setCache).not.toHaveBeenCalled();
    });

    it("should not set isInitialData when no initialData and successful fetch", async () => {
      const plugin = initialDataPlugin();
      const stateManager = createStateManager();

      const context = createMockContext({
        stateManager,
        instanceId: "hook-15",
        pluginOptions: {},
      });

      const setMeta = vi.spyOn(stateManager, "setMeta");

      const next = vi.fn().mockResolvedValue({
        data: { id: 1 },
        status: 200,
      });

      await plugin.middleware!(context, next);

      expect(setMeta).not.toHaveBeenCalled();
    });

    it("should not set isInitialData when no initialData and fetch returns error", async () => {
      const plugin = initialDataPlugin();
      const stateManager = createStateManager();

      const context = createMockContext({
        stateManager,
        instanceId: "hook-16",
        pluginOptions: {},
      });

      const setMeta = vi.spyOn(stateManager, "setMeta");

      const next = vi.fn().mockResolvedValue({
        error: { message: "Not found" },
        status: 404,
      });

      await plugin.middleware!(context, next);

      expect(setMeta).not.toHaveBeenCalled();
    });
  });

  describe("works for read operations", () => {
    it("should work correctly for read operation", async () => {
      const plugin = initialDataPlugin();
      const stateManager = createStateManager();
      const initialData = { user: { id: 1, name: "John" } };

      const context = createMockContext({
        stateManager,
        instanceId: "hook-17",
        operationType: "read",
        pluginOptions: { initialData },
      });

      const next = vi.fn().mockResolvedValue({
        data: { user: { id: 1, name: "John Doe" } },
        status: 200,
      });

      const result = await plugin.middleware!(context, next);

      expect(next).toHaveBeenCalled();
      expect(result.status).toBe(200);
    });

    it("should work correctly for infiniteRead operation", async () => {
      const plugin = initialDataPlugin();
      const stateManager = createStateManager();
      const initialData = { items: [], nextCursor: null };

      const context = createMockContext({
        stateManager,
        instanceId: "hook-18",
        operationType: "infiniteRead",
        pluginOptions: { initialData },
      });

      const next = vi.fn().mockResolvedValue({
        data: { items: [{ id: 1 }], nextCursor: "abc" },
        status: 200,
      });

      const result = await plugin.middleware!(context, next);

      expect(next).toHaveBeenCalled();
      expect(result.data).toEqual({ items: [{ id: 1 }], nextCursor: "abc" });
    });
  });

  describe("instanceId handling", () => {
    it("should call next() directly when instanceId is undefined", async () => {
      const plugin = initialDataPlugin();
      const stateManager = createStateManager();
      const initialData = { id: 1 };

      const context = createMockContext({
        stateManager,
        instanceId: undefined,
        pluginOptions: { initialData },
      });

      const setCache = vi.spyOn(stateManager, "setCache");
      const next = vi.fn().mockResolvedValue({
        data: { id: 1 },
        status: 200,
      });

      await plugin.middleware!(context, next);

      expect(next).toHaveBeenCalled();
      expect(setCache).not.toHaveBeenCalled();
    });

    it("should only apply initial data once per instanceId", async () => {
      const plugin = initialDataPlugin();
      const stateManager = createStateManager();
      const initialData = { id: 1 };

      const context1 = createMockContext({
        stateManager,
        instanceId: "hook-same",
        pluginOptions: { initialData },
      });

      const next = vi.fn().mockResolvedValue({
        data: { id: 1, fresh: true },
        status: 200,
      });

      const setCache = vi.spyOn(stateManager, "setCache");

      await plugin.middleware!(context1, next);
      expect(setCache).toHaveBeenCalledTimes(1);

      setCache.mockClear();

      const context2 = createMockContext({
        stateManager,
        instanceId: "hook-same",
        pluginOptions: { initialData },
      });

      await plugin.middleware!(context2, next);
      expect(setCache).not.toHaveBeenCalled();
    });

    it("should apply initial data for different instanceIds", async () => {
      const plugin = initialDataPlugin();
      const stateManager1 = createStateManager();
      const stateManager2 = createStateManager();
      const initialData = { id: 1 };

      const context1 = createMockContext({
        stateManager: stateManager1,
        instanceId: "hook-a",
        pluginOptions: { initialData },
      });

      const context2 = createMockContext({
        stateManager: stateManager2,
        instanceId: "hook-b",
        queryKey: '{"method":"GET","path":["users","2"]}',
        pluginOptions: { initialData: { id: 2 } },
      });

      const next = vi.fn().mockResolvedValue({
        data: { fresh: true },
        status: 200,
      });

      const setCache1 = vi.spyOn(stateManager1, "setCache");
      const setCache2 = vi.spyOn(stateManager2, "setCache");

      await plugin.middleware!(context1, next);
      await plugin.middleware!(context2, next);

      expect(setCache1).toHaveBeenCalled();
      expect(setCache2).toHaveBeenCalled();
    });
  });

  describe("existing cache data", () => {
    it("should not overwrite existing cache data with initialData", async () => {
      const plugin = initialDataPlugin();
      const stateManager = createStateManager();
      const initialData = { id: 1, name: "Initial" };
      const existingData = { id: 1, name: "Existing Cached" };

      stateManager.setCache('{"method":"GET","path":["users","1"]}', {
        state: {
          data: existingData,
          error: undefined,
          timestamp: Date.now(),
        },
        tags: ["users", "users/1"],
      });

      const context = createMockContext({
        stateManager,
        instanceId: "hook-existing",
        pluginOptions: { initialData },
      });

      const setCache = vi.spyOn(stateManager, "setCache");
      const next = vi.fn().mockResolvedValue({
        data: { id: 1, name: "Fresh" },
        status: 200,
      });

      await plugin.middleware!(context, next);

      const calls = setCache.mock.calls.filter(
        (call: unknown[]) =>
          (call[1] as { state?: { data?: unknown } })?.state?.data ===
          initialData
      );
      expect(calls.length).toBe(0);
    });

    it("should still call next() when existing cache data present", async () => {
      const plugin = initialDataPlugin();
      const stateManager = createStateManager();
      const initialData = { id: 1 };

      stateManager.setCache('{"method":"GET","path":["users","1"]}', {
        state: {
          data: { id: 1, cached: true },
          error: undefined,
          timestamp: Date.now(),
        },
        tags: ["users"],
      });

      const context = createMockContext({
        stateManager,
        instanceId: "hook-cached",
        pluginOptions: { initialData },
      });

      const next = vi.fn().mockResolvedValue({
        data: { id: 1, fresh: true },
        status: 200,
      });

      await plugin.middleware!(context, next);

      expect(next).toHaveBeenCalled();
    });
  });

  describe("lifecycle hooks", () => {
    it("should clean up instanceId on unmount", () => {
      const plugin = initialDataPlugin();

      const context = createMockContext({
        instanceId: "hook-unmount",
      });

      expect(() => plugin.lifecycle?.onUnmount?.(context)).not.toThrow();
    });

    it("should handle unmount without instanceId", () => {
      const plugin = initialDataPlugin();

      const context = createMockContext({
        instanceId: undefined,
      });

      expect(() => plugin.lifecycle?.onUnmount?.(context)).not.toThrow();
    });

    it("should allow re-applying initial data after unmount and remount", async () => {
      const plugin = initialDataPlugin();
      const stateManager = createStateManager();
      const initialData = { id: 1 };

      const context = createMockContext({
        stateManager,
        instanceId: "hook-remount",
        pluginOptions: { initialData },
      });

      const setCache = vi.spyOn(stateManager, "setCache");
      const next = vi.fn().mockResolvedValue({
        data: { id: 1, fresh: true },
        status: 200,
      });

      await plugin.middleware!(context, next);
      expect(setCache).toHaveBeenCalledTimes(1);

      plugin.lifecycle?.onUnmount?.(context);
      setCache.mockClear();

      const stateManager2 = createStateManager();
      const context2 = createMockContext({
        stateManager: stateManager2,
        instanceId: "hook-remount",
        pluginOptions: { initialData },
      });

      const setCache2 = vi.spyOn(stateManager2, "setCache");

      await plugin.middleware!(context2, next);
      expect(setCache2).toHaveBeenCalledTimes(1);
    });
  });

  describe("edge cases", () => {
    it("should handle null initialData", async () => {
      const plugin = initialDataPlugin();
      const stateManager = createStateManager();

      const context = createMockContext({
        stateManager,
        instanceId: "hook-null",
        pluginOptions: { initialData: null },
      });

      const setCache = vi.spyOn(stateManager, "setCache");
      const next = vi.fn().mockResolvedValue({
        data: { id: 1 },
        status: 200,
      });

      await plugin.middleware!(context, next);

      expect(setCache).toHaveBeenCalledWith(
        context.queryKey,
        expect.objectContaining({
          state: expect.objectContaining({
            data: null,
          }),
        })
      );
    });

    it("should handle empty object initialData", async () => {
      const plugin = initialDataPlugin();
      const stateManager = createStateManager();

      const context = createMockContext({
        stateManager,
        instanceId: "hook-empty",
        pluginOptions: { initialData: {} },
      });

      const setCache = vi.spyOn(stateManager, "setCache");
      const next = vi.fn().mockResolvedValue({
        data: { id: 1 },
        status: 200,
      });

      await plugin.middleware!(context, next);

      expect(setCache).toHaveBeenCalledWith(
        context.queryKey,
        expect.objectContaining({
          state: expect.objectContaining({
            data: {},
          }),
        })
      );
    });

    it("should handle empty array initialData", async () => {
      const plugin = initialDataPlugin();
      const stateManager = createStateManager();

      const context = createMockContext({
        stateManager,
        instanceId: "hook-array",
        pluginOptions: { initialData: [] },
      });

      const setCache = vi.spyOn(stateManager, "setCache");
      const next = vi.fn().mockResolvedValue({
        data: [{ id: 1 }],
        status: 200,
      });

      await plugin.middleware!(context, next);

      expect(setCache).toHaveBeenCalledWith(
        context.queryKey,
        expect.objectContaining({
          state: expect.objectContaining({
            data: [],
          }),
        })
      );
    });

    it("should handle complex nested initialData", async () => {
      const plugin = initialDataPlugin();
      const stateManager = createStateManager();
      const initialData = {
        user: {
          id: 1,
          profile: {
            name: "John",
            settings: {
              theme: "dark",
              notifications: true,
            },
          },
        },
        metadata: {
          version: "1.0",
        },
      };

      const context = createMockContext({
        stateManager,
        instanceId: "hook-nested",
        pluginOptions: { initialData },
      });

      const setCache = vi.spyOn(stateManager, "setCache");
      const next = vi.fn().mockResolvedValue({
        data: initialData,
        status: 200,
      });

      await plugin.middleware!(context, next);

      expect(setCache).toHaveBeenCalledWith(
        context.queryKey,
        expect.objectContaining({
          state: expect.objectContaining({
            data: initialData,
          }),
        })
      );
    });

    it("should handle primitive initialData (string)", async () => {
      const plugin = initialDataPlugin();
      const stateManager = createStateManager();

      const context = createMockContext({
        stateManager,
        instanceId: "hook-string",
        pluginOptions: { initialData: "initial string" },
      });

      const setCache = vi.spyOn(stateManager, "setCache");
      const next = vi.fn().mockResolvedValue({
        data: "fresh string",
        status: 200,
      });

      await plugin.middleware!(context, next);

      expect(setCache).toHaveBeenCalledWith(
        context.queryKey,
        expect.objectContaining({
          state: expect.objectContaining({
            data: "initial string",
          }),
        })
      );
    });

    it("should handle primitive initialData (number)", async () => {
      const plugin = initialDataPlugin();
      const stateManager = createStateManager();

      const context = createMockContext({
        stateManager,
        instanceId: "hook-number",
        pluginOptions: { initialData: 42 },
      });

      const setCache = vi.spyOn(stateManager, "setCache");
      const next = vi.fn().mockResolvedValue({
        data: 100,
        status: 200,
      });

      await plugin.middleware!(context, next);

      expect(setCache).toHaveBeenCalledWith(
        context.queryKey,
        expect.objectContaining({
          state: expect.objectContaining({
            data: 42,
          }),
        })
      );
    });

    it("should handle boolean false initialData", async () => {
      const plugin = initialDataPlugin();
      const stateManager = createStateManager();

      const context = createMockContext({
        stateManager,
        instanceId: "hook-false",
        pluginOptions: { initialData: false },
      });

      const setCache = vi.spyOn(stateManager, "setCache");
      const next = vi.fn().mockResolvedValue({
        data: true,
        status: 200,
      });

      await plugin.middleware!(context, next);

      expect(setCache).toHaveBeenCalledWith(
        context.queryKey,
        expect.objectContaining({
          state: expect.objectContaining({
            data: false,
          }),
        })
      );
    });

    it("should handle zero as initialData", async () => {
      const plugin = initialDataPlugin();
      const stateManager = createStateManager();

      const context = createMockContext({
        stateManager,
        instanceId: "hook-zero",
        pluginOptions: { initialData: 0 },
      });

      const setCache = vi.spyOn(stateManager, "setCache");
      const next = vi.fn().mockResolvedValue({
        data: 1,
        status: 200,
      });

      await plugin.middleware!(context, next);

      expect(setCache).toHaveBeenCalledWith(
        context.queryKey,
        expect.objectContaining({
          state: expect.objectContaining({
            data: 0,
          }),
        })
      );
    });

    it("should handle empty string as initialData", async () => {
      const plugin = initialDataPlugin();
      const stateManager = createStateManager();

      const context = createMockContext({
        stateManager,
        instanceId: "hook-empty-string",
        pluginOptions: { initialData: "" },
      });

      const setCache = vi.spyOn(stateManager, "setCache");
      const next = vi.fn().mockResolvedValue({
        data: "fresh",
        status: 200,
      });

      await plugin.middleware!(context, next);

      expect(setCache).toHaveBeenCalledWith(
        context.queryKey,
        expect.objectContaining({
          state: expect.objectContaining({
            data: "",
          }),
        })
      );
    });
  });
});
