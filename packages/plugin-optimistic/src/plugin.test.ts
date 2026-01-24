import type { SpooshResponse } from "@spoosh/core";
import { createMockContext, createStateManager } from "@spoosh/test-utils";

import { optimisticPlugin, OPTIMISTIC_SNAPSHOTS_KEY } from "./plugin";
import type { OptimisticWriteOptions, OptimisticTarget } from "./types";

function createOptimisticTarget(
  targetPath: string,
  updater: (data: unknown, response?: unknown) => unknown,
  options: {
    where?: (opts: unknown) => boolean;
    timing?: "immediate" | "onSuccess";
    rollbackOnError?: boolean;
    onError?: (error: unknown) => void;
  } = {}
): OptimisticTarget {
  return {
    path: targetPath,
    method: "GET",
    where: options.where,
    updater,
    timing: options.timing ?? "immediate",
    rollbackOnError: options.rollbackOnError ?? true,
    onError: options.onError,
  };
}

function createOptimisticPluginOptions(
  path: string,
  updater: (data: unknown, response?: unknown) => unknown,
  options: {
    timing?: "immediate" | "onSuccess";
    rollbackOnError?: boolean;
    where?: (opts: unknown) => boolean;
    onError?: (error: unknown) => void;
  } = {}
): OptimisticWriteOptions {
  return {
    optimistic: (() =>
      createOptimisticTarget(
        path,
        updater,
        options
      )) as unknown as OptimisticWriteOptions["optimistic"],
  };
}

function setupCacheEntry(
  stateManager: ReturnType<typeof createStateManager>,
  key: string,
  data: unknown,
  selfTag: string
) {
  stateManager.setCache(key, {
    state: {
      data,
      error: undefined,
      timestamp: Date.now(),
    },
    tags: [selfTag],
    selfTag,
    stale: false,
  });
}

describe("optimisticPlugin", () => {
  describe("plugin configuration", () => {
    it("should have correct name", () => {
      const plugin = optimisticPlugin();
      expect(plugin.name).toBe("spoosh:optimistic");
    });

    it("should operate on write operations only", () => {
      const plugin = optimisticPlugin();
      expect(plugin.operations).toEqual(["write"]);
    });

    it("should depend on invalidation plugin", () => {
      const plugin = optimisticPlugin();
      expect(plugin.dependencies).toEqual(["spoosh:invalidation"]);
    });
  });

  describe("optimisticData applied immediately to cache", () => {
    it("should apply optimistic update to cache immediately", async () => {
      const plugin = optimisticPlugin();
      const stateManager = createStateManager();

      const cacheKey = '{"method":"GET","path":["posts"]}';
      setupCacheEntry(stateManager, cacheKey, [{ id: 1 }, { id: 2 }], "posts");

      const pluginOptions = createOptimisticPluginOptions("posts", (data) =>
        (data as Array<{ id: number }>).filter((p) => p.id !== 1)
      );

      const context = createMockContext({
        stateManager,
        pluginOptions,
      });

      const next = vi
        .fn()
        .mockResolvedValue({ data: { success: true }, status: 200 });

      await plugin.middleware!(context, next);

      const entry = stateManager.getCache(cacheKey);
      expect(entry?.state.data).toEqual([{ id: 2 }]);
    });

    it("should update cache before next() is called", async () => {
      const plugin = optimisticPlugin();
      const stateManager = createStateManager();

      const cacheKey = '{"method":"GET","path":["posts"]}';
      setupCacheEntry(stateManager, cacheKey, [{ id: 1 }], "posts");

      const pluginOptions = createOptimisticPluginOptions("posts", (data) => [
        ...(data as Array<{ id: number }>),
        { id: 2 },
      ]);

      let dataBeforeNext: unknown;

      const context = createMockContext({
        stateManager,
        pluginOptions,
      });

      const next = vi.fn().mockImplementation(() => {
        dataBeforeNext = stateManager.getCache(cacheKey)?.state.data;
        return Promise.resolve({ data: { success: true }, status: 200 });
      });

      await plugin.middleware!(context, next);

      expect(dataBeforeNext).toEqual([{ id: 1 }, { id: 2 }]);
    });

    it("should set isOptimistic plugin result to true during optimistic state", async () => {
      const plugin = optimisticPlugin();
      const stateManager = createStateManager();

      const cacheKey = '{"method":"GET","path":["posts"]}';
      setupCacheEntry(stateManager, cacheKey, [{ id: 1 }], "posts");

      const pluginOptions = createOptimisticPluginOptions(
        "posts",
        (data) => data
      );

      const context = createMockContext({
        stateManager,
        pluginOptions,
      });

      let isOptimisticDuringNext: unknown;

      const next = vi.fn().mockImplementation(() => {
        const entry = stateManager.getCache(cacheKey);
        isOptimisticDuringNext = entry?.meta.get("isOptimistic");
        return Promise.resolve({ data: { success: true }, status: 200 });
      });

      await plugin.middleware!(context, next);

      expect(isOptimisticDuringNext).toBe(true);
    });

    it("should handle multiple cache entries with same selfTag", async () => {
      const plugin = optimisticPlugin();
      const stateManager = createStateManager();

      const cacheKey1 =
        '{"method":"GET","options":{"query":{"page":1}},"path":["posts"]}';
      const cacheKey2 =
        '{"method":"GET","options":{"query":{"page":2}},"path":["posts"]}';

      setupCacheEntry(stateManager, cacheKey1, [{ id: 1 }], "posts");
      setupCacheEntry(stateManager, cacheKey2, [{ id: 2 }], "posts");

      const pluginOptions = createOptimisticPluginOptions("posts", (data) =>
        (data as Array<{ id: number }>).map((p) => ({ ...p, updated: true }))
      );

      const context = createMockContext({
        stateManager,
        pluginOptions,
      });

      const next = vi
        .fn()
        .mockResolvedValue({ data: { success: true }, status: 200 });

      await plugin.middleware!(context, next);

      const entry1 = stateManager.getCache(cacheKey1);
      const entry2 = stateManager.getCache(cacheKey2);

      expect(entry1?.state.data).toEqual([{ id: 1, updated: true }]);
      expect(entry2?.state.data).toEqual([{ id: 2, updated: true }]);
    });
  });

  describe("previousData preserved before optimistic update", () => {
    it("should store previousData in cache entry before update", async () => {
      const plugin = optimisticPlugin();
      const stateManager = createStateManager();

      const cacheKey = '{"method":"GET","path":["posts"]}';
      const originalData = [{ id: 1, title: "Original" }];
      setupCacheEntry(stateManager, cacheKey, originalData, "posts");

      const pluginOptions = createOptimisticPluginOptions("posts", (data) => [
        ...(data as Array<{ id: number; title: string }>),
        { id: 2, title: "New" },
      ]);

      const context = createMockContext({
        stateManager,
        pluginOptions,
      });

      let previousDataDuringNext: unknown;

      const next = vi.fn().mockImplementation(() => {
        previousDataDuringNext = stateManager.getCache(cacheKey)?.previousData;
        return Promise.resolve({ data: { success: true }, status: 200 });
      });

      await plugin.middleware!(context, next);

      expect(previousDataDuringNext).toEqual(originalData);
    });

    it("should store snapshots in metadata", async () => {
      const plugin = optimisticPlugin();
      const stateManager = createStateManager();
      const metadata = new Map();

      const cacheKey = '{"method":"GET","path":["posts"]}';
      setupCacheEntry(stateManager, cacheKey, [{ id: 1 }], "posts");

      const pluginOptions = createOptimisticPluginOptions(
        "posts",
        (data) => data
      );

      const context = createMockContext({
        stateManager,
        metadata,
        pluginOptions,
      });

      let snapshotsDuringNext: unknown;

      const next = vi.fn().mockImplementation(() => {
        snapshotsDuringNext = metadata.get(OPTIMISTIC_SNAPSHOTS_KEY);
        return Promise.resolve({ data: { success: true }, status: 200 });
      });

      await plugin.middleware!(context, next);

      expect(snapshotsDuringNext).toEqual([
        { key: cacheKey, previousData: [{ id: 1 }] },
      ]);
    });
  });

  describe("rollback on error (restore previousData)", () => {
    it("should restore previousData when mutation fails", async () => {
      const plugin = optimisticPlugin();
      const stateManager = createStateManager();

      const cacheKey = '{"method":"GET","path":["posts"]}';
      const originalData = [{ id: 1 }, { id: 2 }];
      setupCacheEntry(stateManager, cacheKey, originalData, "posts");

      const pluginOptions = createOptimisticPluginOptions(
        "posts",
        (data) => (data as Array<{ id: number }>).filter((p) => p.id !== 1),
        { rollbackOnError: true }
      );

      const context = createMockContext({
        stateManager,
        pluginOptions,
      });

      const next = vi.fn().mockResolvedValue({
        error: { message: "Server error" },
        status: 500,
      });

      await plugin.middleware!(context, next);

      const entry = stateManager.getCache(cacheKey);
      expect(entry?.state.data).toEqual(originalData);
    });

    it("should rollback by default when error occurs (rollbackOnError not specified)", async () => {
      const plugin = optimisticPlugin();
      const stateManager = createStateManager();

      const cacheKey = '{"method":"GET","path":["posts"]}';
      const originalData = [{ id: 1 }];
      setupCacheEntry(stateManager, cacheKey, originalData, "posts");

      const pluginOptions = createOptimisticPluginOptions("posts", (data) => [
        ...(data as Array<{ id: number }>),
        { id: 2 },
      ]);

      const context = createMockContext({
        stateManager,
        pluginOptions,
      });

      const next = vi.fn().mockResolvedValue({
        error: { message: "Failed" },
        status: 500,
      });

      await plugin.middleware!(context, next);

      const entry = stateManager.getCache(cacheKey);
      expect(entry?.state.data).toEqual(originalData);
    });

    it("should restore data after rollback", async () => {
      const plugin = optimisticPlugin();
      const stateManager = createStateManager();

      const cacheKey = '{"method":"GET","path":["posts"]}';
      const originalData = [{ id: 1 }];
      setupCacheEntry(stateManager, cacheKey, originalData, "posts");

      const pluginOptions = createOptimisticPluginOptions(
        "posts",
        (data) => [...(data as Array<{ id: number }>), { id: 99 }],
        { rollbackOnError: true }
      );

      const context = createMockContext({
        stateManager,
        pluginOptions,
      });

      const next = vi.fn().mockResolvedValue({
        error: { message: "Error" },
        status: 500,
      });

      await plugin.middleware!(context, next);

      const entry = stateManager.getCache(cacheKey);
      expect(entry?.state.data).toEqual(originalData);
    });

    it("should set isOptimistic to false after rollback", async () => {
      const plugin = optimisticPlugin();
      const stateManager = createStateManager();

      const cacheKey = '{"method":"GET","path":["posts"]}';
      setupCacheEntry(stateManager, cacheKey, [{ id: 1 }], "posts");

      const pluginOptions = createOptimisticPluginOptions(
        "posts",
        (data) => data
      );

      const context = createMockContext({
        stateManager,
        pluginOptions,
      });

      const next = vi.fn().mockResolvedValue({
        error: { message: "Error" },
        status: 500,
      });

      await plugin.middleware!(context, next);

      const entry = stateManager.getCache(cacheKey);
      expect(entry?.meta.get("isOptimistic")).toBe(false);
    });

    it("should call onError callback when error occurs", async () => {
      const plugin = optimisticPlugin();
      const stateManager = createStateManager();

      const cacheKey = '{"method":"GET","path":["posts"]}';
      setupCacheEntry(stateManager, cacheKey, [{ id: 1 }], "posts");

      const onError = vi.fn();
      const pluginOptions = createOptimisticPluginOptions(
        "posts",
        (data) => data,
        { onError }
      );

      const context = createMockContext({
        stateManager,
        pluginOptions,
      });

      const errorResponse = { message: "Server error" };
      const next = vi.fn().mockResolvedValue({
        error: errorResponse,
        status: 500,
      });

      await plugin.middleware!(context, next);

      expect(onError).toHaveBeenCalledWith(errorResponse);
    });

    it("should not rollback when rollbackOnError is false", async () => {
      const plugin = optimisticPlugin();
      const stateManager = createStateManager();

      const cacheKey = '{"method":"GET","path":["posts"]}';
      const originalData = [{ id: 1 }];
      setupCacheEntry(stateManager, cacheKey, originalData, "posts");

      const pluginOptions = createOptimisticPluginOptions(
        "posts",
        (data) => [...(data as Array<{ id: number }>), { id: 2 }],
        { rollbackOnError: false }
      );

      const context = createMockContext({
        stateManager,
        pluginOptions,
      });

      const next = vi.fn().mockResolvedValue({
        error: { message: "Error" },
        status: 500,
      });

      await plugin.middleware!(context, next);

      const entry = stateManager.getCache(cacheKey);
      expect(entry?.state.data).toEqual([{ id: 1 }, { id: 2 }]);
    });

    it("should rollback multiple cache entries on error", async () => {
      const plugin = optimisticPlugin();
      const stateManager = createStateManager();

      const cacheKey1 =
        '{"method":"GET","options":{"query":{"page":1}},"path":["posts"]}';
      const cacheKey2 =
        '{"method":"GET","options":{"query":{"page":2}},"path":["posts"]}';

      setupCacheEntry(stateManager, cacheKey1, [{ id: 1 }], "posts");
      setupCacheEntry(stateManager, cacheKey2, [{ id: 2 }], "posts");

      const pluginOptions = createOptimisticPluginOptions("posts", (data) =>
        (data as Array<{ id: number }>).map((p) => ({ ...p, deleted: true }))
      );

      const context = createMockContext({
        stateManager,
        pluginOptions,
      });

      const next = vi.fn().mockResolvedValue({
        error: { message: "Error" },
        status: 500,
      });

      await plugin.middleware!(context, next);

      const entry1 = stateManager.getCache(cacheKey1);
      const entry2 = stateManager.getCache(cacheKey2);

      expect(entry1?.state.data).toEqual([{ id: 1 }]);
      expect(entry2?.state.data).toEqual([{ id: 2 }]);
    });
  });

  describe("no rollback on success", () => {
    it("should keep optimistic data on success", async () => {
      const plugin = optimisticPlugin();
      const stateManager = createStateManager();

      const cacheKey = '{"method":"GET","path":["posts"]}';
      setupCacheEntry(stateManager, cacheKey, [{ id: 1 }, { id: 2 }], "posts");

      const pluginOptions = createOptimisticPluginOptions("posts", (data) =>
        (data as Array<{ id: number }>).filter((p) => p.id !== 1)
      );

      const context = createMockContext({
        stateManager,
        pluginOptions,
      });

      const next = vi
        .fn()
        .mockResolvedValue({ data: { success: true }, status: 200 });

      await plugin.middleware!(context, next);

      const entry = stateManager.getCache(cacheKey);
      expect(entry?.state.data).toEqual([{ id: 2 }]);
    });

    it("should preserve optimistic data on success (confirm optimistic)", async () => {
      const plugin = optimisticPlugin();
      const stateManager = createStateManager();

      const cacheKey = '{"method":"GET","path":["posts"]}';
      setupCacheEntry(stateManager, cacheKey, [{ id: 1 }], "posts");

      const pluginOptions = createOptimisticPluginOptions("posts", (data) => [
        ...(data as Array<{ id: number }>),
        { id: 2 },
      ]);

      const context = createMockContext({
        stateManager,
        pluginOptions,
      });

      const next = vi
        .fn()
        .mockResolvedValue({ data: { success: true }, status: 200 });

      await plugin.middleware!(context, next);

      const entry = stateManager.getCache(cacheKey);
      expect(entry?.state.data).toEqual([{ id: 1 }, { id: 2 }]);
    });

    it("should set isOptimistic to false on success", async () => {
      const plugin = optimisticPlugin();
      const stateManager = createStateManager();

      const cacheKey = '{"method":"GET","path":["posts"]}';
      setupCacheEntry(stateManager, cacheKey, [{ id: 1 }], "posts");

      const pluginOptions = createOptimisticPluginOptions(
        "posts",
        (data) => data
      );

      const context = createMockContext({
        stateManager,
        pluginOptions,
      });

      const next = vi
        .fn()
        .mockResolvedValue({ data: { success: true }, status: 200 });

      await plugin.middleware!(context, next);

      const entry = stateManager.getCache(cacheKey);
      expect(entry?.meta.get("isOptimistic")).toBe(false);
    });

    it("should return success response unchanged", async () => {
      const plugin = optimisticPlugin();
      const stateManager = createStateManager();

      const cacheKey = '{"method":"GET","path":["posts"]}';
      setupCacheEntry(stateManager, cacheKey, [{ id: 1 }], "posts");

      const pluginOptions = createOptimisticPluginOptions(
        "posts",
        (data) => data
      );

      const context = createMockContext({
        stateManager,
        pluginOptions,
      });

      const successResponse: SpooshResponse<unknown, unknown> = {
        data: { id: 1, deleted: true },
        status: 200,
      };

      const next = vi.fn().mockResolvedValue(successResponse);

      const result = await plugin.middleware!(context, next);

      expect(result).toEqual(successResponse);
    });
  });

  describe("timing: onSuccess", () => {
    it("should not apply update immediately when timing is onSuccess", async () => {
      const plugin = optimisticPlugin();
      const stateManager = createStateManager();

      const cacheKey = '{"method":"GET","path":["posts"]}';
      const originalData = [{ id: 1 }];
      setupCacheEntry(stateManager, cacheKey, originalData, "posts");

      const pluginOptions = createOptimisticPluginOptions(
        "posts",
        (data) => [...(data as Array<{ id: number }>), { id: 2 }],
        { timing: "onSuccess" }
      );

      const context = createMockContext({
        stateManager,
        pluginOptions,
      });

      let dataDuringNext: unknown;

      const next = vi.fn().mockImplementation(() => {
        dataDuringNext = stateManager.getCache(cacheKey)?.state.data;
        return Promise.resolve({ data: { id: 2 }, status: 201 });
      });

      await plugin.middleware!(context, next);

      expect(dataDuringNext).toEqual(originalData);
    });

    it("should apply update after successful response when timing is onSuccess", async () => {
      const plugin = optimisticPlugin();
      const stateManager = createStateManager();

      const cacheKey = '{"method":"GET","path":["posts"]}';
      setupCacheEntry(stateManager, cacheKey, [{ id: 1 }], "posts");

      const pluginOptions = createOptimisticPluginOptions(
        "posts",
        (data, response) => [
          ...(data as Array<{ id: number }>),
          response as { id: number },
        ],
        { timing: "onSuccess" }
      );

      const context = createMockContext({
        stateManager,
        pluginOptions,
      });

      const next = vi.fn().mockResolvedValue({ data: { id: 2 }, status: 201 });

      await plugin.middleware!(context, next);

      const entry = stateManager.getCache(cacheKey);
      expect(entry?.state.data).toEqual([{ id: 1 }, { id: 2 }]);
    });

    it("should not apply onSuccess update when error occurs", async () => {
      const plugin = optimisticPlugin();
      const stateManager = createStateManager();

      const cacheKey = '{"method":"GET","path":["posts"]}';
      const originalData = [{ id: 1 }];
      setupCacheEntry(stateManager, cacheKey, originalData, "posts");

      const pluginOptions = createOptimisticPluginOptions(
        "posts",
        (data, response) => [
          ...(data as Array<{ id: number }>),
          response as { id: number },
        ],
        { timing: "onSuccess" }
      );

      const context = createMockContext({
        stateManager,
        pluginOptions,
      });

      const next = vi.fn().mockResolvedValue({
        error: { message: "Failed" },
        status: 500,
      });

      await plugin.middleware!(context, next);

      const entry = stateManager.getCache(cacheKey);
      expect(entry?.state.data).toEqual(originalData);
    });
  });

  describe("autoInvalidate default behavior", () => {
    it("should set autoInvalidate default to none when optimistic is used", async () => {
      const plugin = optimisticPlugin();
      const stateManager = createStateManager();

      const cacheKey = '{"method":"GET","path":["posts"]}';
      setupCacheEntry(stateManager, cacheKey, [{ id: 1 }], "posts");

      const setAutoInvalidateDefault = vi.fn();
      const pluginOptions = createOptimisticPluginOptions(
        "posts",
        (data) => data
      );

      const context = createMockContext({
        stateManager,
        pluginOptions,
        plugins: {
          get: vi.fn().mockReturnValue({ setAutoInvalidateDefault }),
        },
      });

      const next = vi
        .fn()
        .mockResolvedValue({ data: { success: true }, status: 200 });

      await plugin.middleware!(context, next);

      expect(setAutoInvalidateDefault).toHaveBeenCalledWith("none");
    });
  });

  describe("no optimistic config", () => {
    it("should pass through when no optimistic config provided", async () => {
      const plugin = optimisticPlugin();
      const context = createMockContext({
        pluginOptions: {},
      });

      const response: SpooshResponse<unknown, unknown> = {
        data: { success: true },
        status: 200,
      };

      const next = vi.fn().mockResolvedValue(response);

      const result = await plugin.middleware!(context, next);

      expect(next).toHaveBeenCalled();
      expect(result).toEqual(response);
    });

    it("should not modify cache when no optimistic config", async () => {
      const plugin = optimisticPlugin();
      const stateManager = createStateManager();

      const cacheKey = '{"method":"GET","path":["posts"]}';
      const originalData = [{ id: 1 }];
      setupCacheEntry(stateManager, cacheKey, originalData, "posts");

      const context = createMockContext({
        stateManager,
        pluginOptions: {},
      });

      const next = vi
        .fn()
        .mockResolvedValue({ data: { success: true }, status: 200 });

      await plugin.middleware!(context, next);

      const entry = stateManager.getCache(cacheKey);
      expect(entry?.state.data).toEqual(originalData);
    });
  });

  describe("WHERE predicate matching", () => {
    it("should only update entries matching the WHERE predicate", async () => {
      const plugin = optimisticPlugin();
      const stateManager = createStateManager();

      const cacheKey1 =
        '{"method":"GET","options":{"query":{"page":1}},"path":["posts"]}';
      const cacheKey2 =
        '{"method":"GET","options":{"query":{"page":2}},"path":["posts"]}';

      setupCacheEntry(stateManager, cacheKey1, [{ id: 1 }], "posts");
      setupCacheEntry(stateManager, cacheKey2, [{ id: 2 }], "posts");

      const pluginOptions = createOptimisticPluginOptions(
        "posts",
        (data) =>
          (data as Array<{ id: number }>).map((p) => ({ ...p, updated: true })),
        {
          where: (opts) =>
            (opts as { query: { page: number } }).query.page === 1,
        }
      );

      const context = createMockContext({
        stateManager,
        pluginOptions,
      });

      const next = vi
        .fn()
        .mockResolvedValue({ data: { success: true }, status: 200 });

      await plugin.middleware!(context, next);

      const entry1 = stateManager.getCache(cacheKey1);
      const entry2 = stateManager.getCache(cacheKey2);

      expect(entry1?.state.data).toEqual([{ id: 1, updated: true }]);
      expect(entry2?.state.data).toEqual([{ id: 2 }]);
    });

    it("should update all entries when WHERE is not provided", async () => {
      const plugin = optimisticPlugin();
      const stateManager = createStateManager();

      const cacheKey1 =
        '{"method":"GET","options":{"query":{"page":1}},"path":["posts"]}';
      const cacheKey2 =
        '{"method":"GET","options":{"query":{"page":2}},"path":["posts"]}';

      setupCacheEntry(stateManager, cacheKey1, [{ id: 1 }], "posts");
      setupCacheEntry(stateManager, cacheKey2, [{ id: 2 }], "posts");

      const pluginOptions = createOptimisticPluginOptions("posts", (data) =>
        (data as Array<{ id: number }>).map((p) => ({ ...p, updated: true }))
      );

      const context = createMockContext({
        stateManager,
        pluginOptions,
      });

      const next = vi
        .fn()
        .mockResolvedValue({ data: { success: true }, status: 200 });

      await plugin.middleware!(context, next);

      const entry1 = stateManager.getCache(cacheKey1);
      const entry2 = stateManager.getCache(cacheKey2);

      expect(entry1?.state.data).toEqual([{ id: 1, updated: true }]);
      expect(entry2?.state.data).toEqual([{ id: 2, updated: true }]);
    });
  });

  describe("edge cases", () => {
    it("should skip entries without data", async () => {
      const plugin = optimisticPlugin();
      const stateManager = createStateManager();

      const cacheKey = '{"method":"GET","path":["posts"]}';
      stateManager.setCache(cacheKey, {
        state: {
          data: undefined,
          error: undefined,
          timestamp: Date.now(),
        },
        tags: ["posts"],
        selfTag: "posts",
        stale: false,
      });

      const pluginOptions = createOptimisticPluginOptions(
        "posts",
        (data) => data
      );

      const context = createMockContext({
        stateManager,
        pluginOptions,
      });

      const next = vi
        .fn()
        .mockResolvedValue({ data: { success: true }, status: 200 });

      await plugin.middleware!(context, next);

      const entry = stateManager.getCache(cacheKey);
      expect(entry?.state.data).toBeUndefined();
    });

    it("should skip infinite-tracker entries", async () => {
      const plugin = optimisticPlugin();
      const stateManager = createStateManager();

      const trackerKey =
        '{"method":"GET","path":["posts"],"type":"infinite-tracker"}';
      const regularKey = '{"method":"GET","path":["posts"]}';

      setupCacheEntry(stateManager, trackerKey, { pages: [] }, "posts");
      setupCacheEntry(stateManager, regularKey, [{ id: 1 }], "posts");

      const pluginOptions = createOptimisticPluginOptions("posts", (data) => {
        if (Array.isArray(data)) {
          return (data as Array<{ id: number }>).map((p) => ({
            ...p,
            updated: true,
          }));
        }
        return { ...(data as Record<string, unknown>), updated: true };
      });

      const context = createMockContext({
        stateManager,
        pluginOptions,
      });

      const next = vi
        .fn()
        .mockResolvedValue({ data: { success: true }, status: 200 });

      await plugin.middleware!(context, next);

      const trackerEntry = stateManager.getCache(trackerKey);
      expect(trackerEntry?.state.data).toEqual({ pages: [] });
    });

    it("should handle error response without snapshots gracefully", async () => {
      const plugin = optimisticPlugin();
      const context = createMockContext({
        pluginOptions: {},
      });

      const next = vi.fn().mockResolvedValue({
        error: { message: "Error" },
        status: 500,
      });

      const result = await plugin.middleware!(context, next);

      expect(result.error).toEqual({ message: "Error" });
    });
  });

  describe("multiple targets", () => {
    it("should update multiple targets", async () => {
      const plugin = optimisticPlugin();
      const stateManager = createStateManager();

      const postsKey = '{"method":"GET","path":["posts"]}';
      const statsKey = '{"method":"GET","path":["stats"]}';

      setupCacheEntry(stateManager, postsKey, [{ id: 1 }, { id: 2 }], "posts");
      setupCacheEntry(stateManager, statsKey, { count: 2 }, "stats");

      const pluginOptions: OptimisticWriteOptions = {
        optimistic: (() => [
          createOptimisticTarget("posts", (data) =>
            (data as Array<{ id: number }>).filter((p) => p.id !== 1)
          ),
          createOptimisticTarget("stats", (data) => ({
            count: ((data as { count: number }).count || 0) - 1,
          })),
        ]) as unknown as OptimisticWriteOptions["optimistic"],
      };

      const context = createMockContext({
        stateManager,
        pluginOptions,
      });

      const next = vi
        .fn()
        .mockResolvedValue({ data: { success: true }, status: 200 });

      await plugin.middleware!(context, next);

      const postsEntry = stateManager.getCache(postsKey);
      const statsEntry = stateManager.getCache(statsKey);

      expect(postsEntry?.state.data).toEqual([{ id: 2 }]);
      expect(statsEntry?.state.data).toEqual({ count: 1 });
    });
  });
});
