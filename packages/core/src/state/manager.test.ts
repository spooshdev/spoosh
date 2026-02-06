import type { OperationState } from "../plugins/types";
import { createStateManager, createInitialState } from "./manager";

function createState<TData = unknown, TError = unknown>(
  overrides: Partial<OperationState<TData, TError>> = {}
): OperationState<TData, TError> {
  return {
    data: undefined,
    error: undefined,
    timestamp: 0,
    ...overrides,
  };
}

describe("createInitialState", () => {
  it("should return initial state with all properties set to default values", () => {
    const state = createInitialState();

    expect(state).toEqual({
      data: undefined,
      error: undefined,
      timestamp: 0,
    });
  });
});

describe("createStateManager", () => {
  describe("creation and initialization", () => {
    it("should create a state manager with all required methods", () => {
      const manager = createStateManager();

      expect(manager.createQueryKey).toBeDefined();
      expect(manager.getCache).toBeDefined();
      expect(manager.setCache).toBeDefined();
      expect(manager.deleteCache).toBeDefined();
      expect(manager.subscribeCache).toBeDefined();
      expect(manager.getCacheByTags).toBeDefined();
      expect(manager.getCacheEntriesByTags).toBeDefined();
      expect(manager.getCacheEntriesBySelfTag).toBeDefined();
      expect(manager.setMeta).toBeDefined();
      expect(manager.markStale).toBeDefined();
      expect(manager.clear).toBeDefined();
    });

    it("should create independent state managers with separate caches", () => {
      const manager1 = createStateManager();
      const manager2 = createStateManager();

      const key = manager1.createQueryKey({
        path: "users",
        method: "GET",
      });

      manager1.setCache(key, { state: createState({ data: "manager1-data" }) });

      expect(manager1.getCache(key)?.state.data).toBe("manager1-data");
      expect(manager2.getCache(key)).toBeUndefined();
    });
  });

  describe("createQueryKey", () => {
    it("should generate a key from path and method", () => {
      const manager = createStateManager();
      const key = manager.createQueryKey({
        path: "users/123",
        method: "GET",
      });

      expect(key).toContain("users");
      expect(key).toContain("123");
      expect(key).toContain("GET");
    });

    it("should include options in the key", () => {
      const manager = createStateManager();
      const key = manager.createQueryKey({
        path: "users",
        method: "GET",
        options: { page: 1, limit: 10 },
      });

      expect(key).toContain("page");
      expect(key).toContain("limit");
    });

    it("should generate different keys for different paths", () => {
      const manager = createStateManager();

      const key1 = manager.createQueryKey({ path: "users", method: "GET" });
      const key2 = manager.createQueryKey({ path: "posts", method: "GET" });

      expect(key1).not.toBe(key2);
    });

    it("should generate different keys for different methods", () => {
      const manager = createStateManager();

      const key1 = manager.createQueryKey({ path: "users", method: "GET" });
      const key2 = manager.createQueryKey({ path: "users", method: "POST" });

      expect(key1).not.toBe(key2);
    });

    it("should generate different keys for different options", () => {
      const manager = createStateManager();

      const key1 = manager.createQueryKey({
        path: "users",
        method: "GET",
        options: { page: 1 },
      });
      const key2 = manager.createQueryKey({
        path: "users",
        method: "GET",
        options: { page: 2 },
      });

      expect(key1).not.toBe(key2);
    });

    it("should generate the same key for equivalent options regardless of property order", () => {
      const manager = createStateManager();

      const key1 = manager.createQueryKey({
        path: "users",
        method: "GET",
        options: { a: 1, b: 2 },
      });
      const key2 = manager.createQueryKey({
        path: "users",
        method: "GET",
        options: { b: 2, a: 1 },
      });

      expect(key1).toBe(key2);
    });

    it("should handle undefined options", () => {
      const manager = createStateManager();
      const key = manager.createQueryKey({
        path: "users",
        method: "GET",
        options: undefined,
      });

      expect(key).toBeDefined();
      expect(typeof key).toBe("string");
    });

    it("should handle empty path array", () => {
      const manager = createStateManager();
      const key = manager.createQueryKey({
        path: "",
        method: "GET",
      });

      expect(key).toBeDefined();
      expect(typeof key).toBe("string");
    });

    it("should handle nested options objects", () => {
      const manager = createStateManager();
      const key = manager.createQueryKey({
        path: "users",
        method: "GET",
        options: { filter: { status: "active", role: "admin" } },
      });

      expect(key).toContain("filter");
      expect(key).toContain("status");
      expect(key).toContain("active");
    });
  });

  describe("setCache / getCache", () => {
    it("should set and get cache entries", () => {
      const manager = createStateManager();
      const key = "test-key";
      const state = createState({ data: "test-data" });

      manager.setCache(key, { state });

      const cached = manager.getCache(key);
      expect(cached?.state.data).toBe("test-data");
    });

    it("should return undefined for non-existent keys", () => {
      const manager = createStateManager();
      const cached = manager.getCache("non-existent-key");

      expect(cached).toBeUndefined();
    });

    it("should merge state when updating existing entry", () => {
      const manager = createStateManager();
      const key = "test-key";

      manager.setCache(key, {
        state: createState({ data: "initial" }),
      });
      manager.setCache(key, {
        state: { error: new Error("test") } as unknown as OperationState,
      });

      const cached = manager.getCache(key);
      expect(cached?.state.data).toBe("initial");
      expect(cached?.state.error).toBeInstanceOf(Error);
    });

    it("should update tags on existing entry", () => {
      const manager = createStateManager();
      const key = "test-key";

      manager.setCache(key, {
        state: createState({ data: "data" }),
        tags: ["tag1"],
      });
      manager.setCache(key, { tags: ["tag2", "tag3"] });

      const cached = manager.getCache(key);
      expect(cached?.tags).toEqual(["tag2", "tag3"]);
    });

    it("should initialize with empty tags if not provided", () => {
      const manager = createStateManager();
      const key = "test-key";

      manager.setCache(key, { state: createState({ data: "data" }) });

      const cached = manager.getCache(key);
      expect(cached?.tags).toEqual([]);
    });

    it("should set and get pending promise", () => {
      const manager = createStateManager();
      const key = "test-key";
      const promise = Promise.resolve("result");

      manager.setPendingPromise(key, promise);

      expect(manager.getPendingPromise(key)).toBe(promise);
    });

    it("should clear pending promise when set to undefined", () => {
      const manager = createStateManager();
      const key = "test-key";

      manager.setPendingPromise(key, Promise.resolve("pending"));
      manager.setPendingPromise(key, undefined);

      expect(manager.getPendingPromise(key)).toBeUndefined();
    });

    it("should return undefined for non-existent pending promise", () => {
      const manager = createStateManager();

      expect(manager.getPendingPromise("non-existent")).toBeUndefined();
    });

    it("should update previousData on existing entry", () => {
      const manager = createStateManager();
      const key = "test-key";

      manager.setCache(key, { state: createState({ data: "current" }) });
      manager.setCache(key, { previousData: "old-data" });

      const cached = manager.getCache(key);
      expect(cached?.previousData).toBe("old-data");
    });

    it("should update stale flag on existing entry", () => {
      const manager = createStateManager();
      const key = "test-key";

      manager.setCache(key, { state: createState({ data: "data" }) });
      manager.setCache(key, { stale: true });

      const cached = manager.getCache(key);
      expect(cached?.stale).toBe(true);
    });

    it("should generate selfTag from key path", () => {
      const manager = createStateManager();
      const key = manager.createQueryKey({
        path: "posts/1/comments",
        method: "GET",
      });

      manager.setCache(key, { state: createState({ data: "data" }) });

      const cached = manager.getCache(key);
      expect(cached?.selfTag).toBe("posts/1/comments");
    });

    it("should handle invalid JSON key gracefully for selfTag", () => {
      const manager = createStateManager();
      const key = "invalid-json-key";

      manager.setCache(key, { state: createState({ data: "data" }) });

      const cached = manager.getCache(key);
      expect(cached?.selfTag).toBeUndefined();
    });
  });

  describe("subscribeCache", () => {
    it("should subscribe to cache changes and receive notifications", () => {
      const manager = createStateManager();
      const key = "test-key";
      const callback = vi.fn();

      manager.setCache(key, { state: createState({ data: "initial" }) });
      manager.subscribeCache(key, callback);
      manager.setCache(key, { state: createState({ data: "updated" }) });

      expect(callback).toHaveBeenCalledTimes(1);
    });

    it("should NOT create cache entry when subscribing", () => {
      const manager = createStateManager();
      const key = "new-key";
      const callback = vi.fn();

      manager.subscribeCache(key, callback);

      const cached = manager.getCache(key);
      expect(cached).toBeUndefined();
    });

    it("should return an unsubscribe function", () => {
      const manager = createStateManager();
      const key = "test-key";
      const callback = vi.fn();

      manager.setCache(key, { state: createState({ data: "initial" }) });
      const unsubscribe = manager.subscribeCache(key, callback);
      unsubscribe();
      manager.setCache(key, { state: createState({ data: "updated" }) });

      expect(callback).not.toHaveBeenCalled();
    });

    it("should support multiple subscribers for the same key", () => {
      const manager = createStateManager();
      const key = "test-key";
      const callback1 = vi.fn();
      const callback2 = vi.fn();

      manager.setCache(key, { state: createState({ data: "initial" }) });
      manager.subscribeCache(key, callback1);
      manager.subscribeCache(key, callback2);
      manager.setCache(key, { state: createState({ data: "updated" }) });

      expect(callback1).toHaveBeenCalledTimes(1);
      expect(callback2).toHaveBeenCalledTimes(1);
    });

    it("should only unsubscribe the specific callback", () => {
      const manager = createStateManager();
      const key = "test-key";
      const callback1 = vi.fn();
      const callback2 = vi.fn();

      manager.setCache(key, { state: createState({ data: "initial" }) });
      const unsubscribe1 = manager.subscribeCache(key, callback1);
      manager.subscribeCache(key, callback2);
      unsubscribe1();
      manager.setCache(key, { state: createState({ data: "updated" }) });

      expect(callback1).not.toHaveBeenCalled();
      expect(callback2).toHaveBeenCalledTimes(1);
    });

    it("should notify subscribers when setMeta is called", () => {
      const manager = createStateManager();
      const key = "test-key";
      const callback = vi.fn();

      manager.setCache(key, { state: createState({ data: "data" }) });
      manager.subscribeCache(key, callback);
      manager.setMeta(key, { isOptimistic: true });

      expect(callback).toHaveBeenCalledTimes(1);
    });
  });

  describe("deleteCache", () => {
    it("should delete a cache entry", () => {
      const manager = createStateManager();
      const key = "test-key";

      manager.setCache(key, { state: createState({ data: "data" }) });
      manager.deleteCache(key);

      expect(manager.getCache(key)).toBeUndefined();
    });

    it("should not throw when deleting non-existent key", () => {
      const manager = createStateManager();

      expect(() => manager.deleteCache("non-existent")).not.toThrow();
    });
  });

  describe("getCacheByTags", () => {
    it("should find cache entry with matching tag", () => {
      const manager = createStateManager();
      const key = "test-key";

      manager.setCache(key, {
        state: createState({ data: "tagged-data" }),
        tags: ["users", "list"],
      });

      const result = manager.getCacheByTags(["users"]);
      expect(result?.state.data).toBe("tagged-data");
    });

    it("should return undefined if no matching tag is found", () => {
      const manager = createStateManager();
      const key = "test-key";

      manager.setCache(key, {
        state: createState({ data: "data" }),
        tags: ["posts"],
      });

      const result = manager.getCacheByTags(["users"]);
      expect(result).toBeUndefined();
    });

    it("should return undefined if matching entry has no data", () => {
      const manager = createStateManager();
      const key = "test-key";

      manager.setCache(key, {
        state: createState(),
        tags: ["users"],
      });

      const result = manager.getCacheByTags(["users"]);
      expect(result).toBeUndefined();
    });

    it("should find first entry matching any of the provided tags", () => {
      const manager = createStateManager();

      manager.setCache("key1", {
        state: createState({ data: "data1" }),
        tags: ["posts"],
      });
      manager.setCache("key2", {
        state: createState({ data: "data2" }),
        tags: ["users"],
      });

      const result = manager.getCacheByTags(["users", "comments"]);
      expect(result?.state.data).toBe("data2");
    });
  });

  describe("getCacheEntriesByTags", () => {
    it("should return all entries matching any of the provided tags", () => {
      const manager = createStateManager();

      manager.setCache("key1", {
        state: createState({ data: "data1" }),
        tags: ["users"],
      });
      manager.setCache("key2", {
        state: createState({ data: "data2" }),
        tags: ["users", "admin"],
      });
      manager.setCache("key3", {
        state: createState({ data: "data3" }),
        tags: ["posts"],
      });

      const results = manager.getCacheEntriesByTags(["users"]);
      expect(results).toHaveLength(2);
      expect(results.map((r) => r.key)).toContain("key1");
      expect(results.map((r) => r.key)).toContain("key2");
    });

    it("should return empty array if no tags match", () => {
      const manager = createStateManager();

      manager.setCache("key1", {
        state: createState({ data: "data1" }),
        tags: ["posts"],
      });

      const results = manager.getCacheEntriesByTags(["users"]);
      expect(results).toEqual([]);
    });

    it("should include entries without data", () => {
      const manager = createStateManager();

      manager.setCache("key1", {
        state: createState(),
        tags: ["users"],
      });

      const results = manager.getCacheEntriesByTags(["users"]);
      expect(results).toHaveLength(1);
    });

    it("should return entries matching multiple tags", () => {
      const manager = createStateManager();

      manager.setCache("key1", {
        state: createState({ data: "data1" }),
        tags: ["users"],
      });
      manager.setCache("key2", {
        state: createState({ data: "data2" }),
        tags: ["posts"],
      });

      const results = manager.getCacheEntriesByTags(["users", "posts"]);
      expect(results).toHaveLength(2);
    });
  });

  describe("getCacheEntriesBySelfTag", () => {
    it("should return entries matching the selfTag", () => {
      const manager = createStateManager();
      const key = manager.createQueryKey({
        path: "users/123",
        method: "GET",
      });

      manager.setCache(key, { state: createState({ data: "user-data" }) });

      const results = manager.getCacheEntriesBySelfTag("users/123");
      expect(results).toHaveLength(1);
      expect(results[0]?.entry.state.data).toBe("user-data");
    });

    it("should return empty array if no selfTag matches", () => {
      const manager = createStateManager();
      const key = manager.createQueryKey({
        path: "users/123",
        method: "GET",
      });

      manager.setCache(key, { state: createState({ data: "data" }) });

      const results = manager.getCacheEntriesBySelfTag("posts/456");
      expect(results).toEqual([]);
    });

    it("should return multiple entries with the same selfTag", () => {
      const manager = createStateManager();

      const key1 = manager.createQueryKey({
        path: "users/123",
        method: "GET",
      });
      const key2 = manager.createQueryKey({
        path: "users/123",
        method: "GET",
        options: { include: "profile" },
      });

      manager.setCache(key1, { state: createState({ data: "data1" }) });
      manager.setCache(key2, { state: createState({ data: "data2" }) });

      const results = manager.getCacheEntriesBySelfTag("users/123");
      expect(results).toHaveLength(2);
    });
  });

  describe("setMeta", () => {
    it("should set plugin result data on cache entry", () => {
      const manager = createStateManager();
      const key = "test-key";

      manager.setCache(key, { state: createState({ data: "data" }) });
      manager.setMeta(key, { isOptimistic: true, retryCount: 3 });

      const cached = manager.getCache(key);
      expect(cached?.meta.get("isOptimistic")).toBe(true);
      expect(cached?.meta.get("retryCount")).toBe(3);
    });

    it("should allow setCache to update tags on entry created by setMeta", () => {
      const manager = createStateManager();
      const key = "test-key";

      manager.setMeta(key, { fromPlugin: true });

      const entryAfterSetMeta = manager.getCache(key);
      expect(entryAfterSetMeta?.tags).toEqual([]);

      manager.setCache(key, {
        state: createState({ data: "data" }),
        tags: ["posts", "list"],
      });

      const entryAfterSetCache = manager.getCache(key);
      expect(entryAfterSetCache?.tags).toEqual(["posts", "list"]);
      expect(entryAfterSetCache?.meta.get("fromPlugin")).toBe(true);
    });

    it("should preserve meta when setCache updates tags on setMeta-created entry", () => {
      const manager = createStateManager();
      const key = "test-key";

      manager.setMeta(key, { initialData: true, timestamp: 12345 });
      manager.setCache(key, {
        state: createState({ data: "fetched-data" }),
        tags: ["users"],
      });

      const cached = manager.getCache(key);
      expect(cached?.meta.get("initialData")).toBe(true);
      expect(cached?.meta.get("timestamp")).toBe(12345);
      expect(cached?.tags).toEqual(["users"]);
      expect(cached?.state.data).toBe("fetched-data");
    });

    it("should merge multiple plugin results", () => {
      const manager = createStateManager();
      const key = "test-key";

      manager.setCache(key, { state: createState({ data: "data" }) });
      manager.setMeta(key, { isOptimistic: true });
      manager.setMeta(key, { isStale: false });

      const cached = manager.getCache(key);
      expect(cached?.meta.get("isOptimistic")).toBe(true);
      expect(cached?.meta.get("isStale")).toBe(false);
    });

    it("should not throw when setting meta on non-existent entry", () => {
      const manager = createStateManager();

      expect(() =>
        manager.setMeta("non-existent", { data: "value" })
      ).not.toThrow();
    });

    it("should create entry when setting meta on non-existent key", () => {
      const manager = createStateManager();

      manager.setMeta("non-existent", { data: "value" });

      const entry = manager.getCache("non-existent");
      expect(entry).toBeDefined();
      expect(entry?.meta.get("data")).toBe("value");
      expect(entry?.state.data).toBeUndefined();
    });
  });

  describe("markStale", () => {
    it("should mark entries with matching tags as stale", () => {
      const manager = createStateManager();

      manager.setCache("key1", {
        state: createState({ data: "data1" }),
        tags: ["users"],
      });
      manager.setCache("key2", {
        state: createState({ data: "data2" }),
        tags: ["posts"],
      });

      manager.markStale(["users"]);

      expect(manager.getCache("key1")?.stale).toBe(true);
      expect(manager.getCache("key2")?.stale).toBeUndefined();
    });

    it("should mark multiple entries with matching tags as stale", () => {
      const manager = createStateManager();

      manager.setCache("key1", {
        state: createState({ data: "data1" }),
        tags: ["users"],
      });
      manager.setCache("key2", {
        state: createState({ data: "data2" }),
        tags: ["users", "admin"],
      });

      manager.markStale(["users"]);

      expect(manager.getCache("key1")?.stale).toBe(true);
      expect(manager.getCache("key2")?.stale).toBe(true);
    });

    it("should mark entries matching any of the provided tags as stale", () => {
      const manager = createStateManager();

      manager.setCache("key1", {
        state: createState({ data: "data1" }),
        tags: ["users"],
      });
      manager.setCache("key2", {
        state: createState({ data: "data2" }),
        tags: ["posts"],
      });
      manager.setCache("key3", {
        state: createState({ data: "data3" }),
        tags: ["comments"],
      });

      manager.markStale(["users", "posts"]);

      expect(manager.getCache("key1")?.stale).toBe(true);
      expect(manager.getCache("key2")?.stale).toBe(true);
      expect(manager.getCache("key3")?.stale).toBeUndefined();
    });

    it("should not throw when no entries match", () => {
      const manager = createStateManager();

      manager.setCache("key1", {
        state: createState({ data: "data1" }),
        tags: ["users"],
      });

      expect(() => manager.markStale(["nonexistent"])).not.toThrow();
    });

    it("should mark entry as stale after setCache updates tags on setMeta-created entry", () => {
      const manager = createStateManager();
      const key = "test-key";

      manager.setMeta(key, { fromInitialDataPlugin: true });

      const entryBeforeTagUpdate = manager.getCache(key);
      expect(entryBeforeTagUpdate?.tags).toEqual([]);

      manager.setCache(key, {
        state: createState({ data: "data" }),
        tags: ["posts"],
      });

      manager.markStale(["posts"]);

      const cached = manager.getCache(key);
      expect(cached?.stale).toBe(true);
    });

    it("should NOT mark entry as stale if setMeta created it and tags were never updated", () => {
      const manager = createStateManager();
      const key = "test-key";

      manager.setMeta(key, { fromPlugin: true });

      manager.markStale(["posts"]);

      const cached = manager.getCache(key);
      expect(cached?.stale).toBeUndefined();
    });
  });

  describe("clear", () => {
    it("should clear all cache entries", () => {
      const manager = createStateManager();

      manager.setCache("key1", { state: createState({ data: "data1" }) });
      manager.setCache("key2", { state: createState({ data: "data2" }) });

      manager.clear();

      expect(manager.getCache("key1")).toBeUndefined();
      expect(manager.getCache("key2")).toBeUndefined();
    });

    it("should not throw when clearing empty cache", () => {
      const manager = createStateManager();

      expect(() => manager.clear()).not.toThrow();
    });
  });

  describe("edge cases", () => {
    it("should handle empty cache operations gracefully", () => {
      const manager = createStateManager();

      expect(manager.getCache("any-key")).toBeUndefined();
      expect(manager.getCacheByTags(["any-tag"])).toBeUndefined();
      expect(manager.getCacheEntriesByTags(["any-tag"])).toEqual([]);
      expect(manager.getCacheEntriesBySelfTag("any/path")).toEqual([]);
    });

    it("should handle special characters in path", () => {
      const manager = createStateManager();
      const key = manager.createQueryKey({
        path: "users/email@example.com",
        method: "GET",
      });

      manager.setCache(key, { state: createState({ data: "user-data" }) });

      expect(manager.getCache(key)?.state.data).toBe("user-data");
    });

    it("should handle empty tags array in getCacheByTags", () => {
      const manager = createStateManager();

      manager.setCache("key1", {
        state: createState({ data: "data" }),
        tags: ["users"],
      });

      const result = manager.getCacheByTags([]);
      expect(result).toBeUndefined();
    });

    it("should handle empty tags array in getCacheEntriesByTags", () => {
      const manager = createStateManager();

      manager.setCache("key1", {
        state: createState({ data: "data" }),
        tags: ["users"],
      });

      const results = manager.getCacheEntriesByTags([]);
      expect(results).toEqual([]);
    });

    it("should handle entries with empty tags array", () => {
      const manager = createStateManager();

      manager.setCache("key1", {
        state: createState({ data: "data" }),
        tags: [],
      });

      const result = manager.getCacheByTags(["users"]);
      expect(result).toBeUndefined();
    });

    it("should handle null values in options", () => {
      const manager = createStateManager();
      const key = manager.createQueryKey({
        path: "users",
        method: "GET",
        options: { filter: null },
      });

      manager.setCache(key, { state: createState({ data: "data" }) });

      expect(manager.getCache(key)?.state.data).toBe("data");
    });

    it("should handle array values in options", () => {
      const manager = createStateManager();
      const key = manager.createQueryKey({
        path: "users",
        method: "GET",
        options: { ids: [1, 2, 3] },
      });

      expect(key).toContain("[1,2,3]");
    });

    it("should preserve type information when getting cache", () => {
      const manager = createStateManager();
      const key = "test-key";

      interface UserData {
        id: number;
        name: string;
      }

      manager.setCache<UserData, Error>(key, {
        state: createState({ data: { id: 1, name: "John" } }),
      });

      const cached = manager.getCache<UserData, Error>(key);
      expect(cached?.state.data?.id).toBe(1);
      expect(cached?.state.data?.name).toBe("John");
    });
  });
});
