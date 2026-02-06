import {
  createMockContext,
  createStateManager,
  createEventEmitter,
} from "@spoosh/test-utils";

import { debouncePlugin } from "./plugin";

describe("debouncePlugin", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("plugin configuration", () => {
    it("should have correct name", () => {
      const plugin = debouncePlugin();
      expect(plugin.name).toBe("spoosh:debounce");
    });

    it("should operate on read and infiniteRead operations", () => {
      const plugin = debouncePlugin();
      expect(plugin.operations).toEqual(["read", "infiniteRead"]);
    });
  });

  describe("no debounce behavior", () => {
    it("should call next() when debounce option is undefined", async () => {
      const plugin = debouncePlugin();
      const context = createMockContext();
      const expectedResponse = { data: { id: 1 }, status: 200 };
      const next = vi.fn().mockResolvedValue(expectedResponse);

      const result = await plugin.middleware!(context, next);

      expect(next).toHaveBeenCalled();
      expect(result).toEqual(expectedResponse);
    });

    it("should call next() when debounce is 0", async () => {
      const plugin = debouncePlugin();
      const context = createMockContext({
        pluginOptions: { debounce: 0 },
      });
      const expectedResponse = { data: { id: 1 }, status: 200 };
      const next = vi.fn().mockResolvedValue(expectedResponse);

      const result = await plugin.middleware!(context, next);

      expect(next).toHaveBeenCalled();
      expect(result).toEqual(expectedResponse);
    });
  });

  describe("debounces rapid requests", () => {
    it("should debounce rapid requests and return undefined data initially", async () => {
      const plugin = debouncePlugin();
      const stateManager = createStateManager();
      const eventEmitter = createEventEmitter();

      const context1 = createMockContext({
        stateManager,
        eventEmitter,
        queryKey: '{"method":"GET","path":["users"],"query":{"search":"a"}}',
        request: { query: { search: "a" } },
        pluginOptions: { debounce: 300 },
      });
      const next = vi.fn().mockResolvedValue({ data: [], status: 200 });

      const result1 = await plugin.middleware!(context1, next);

      expect(next).not.toHaveBeenCalled();
      expect(result1).toEqual({ data: undefined, status: 0 });
    });

    it("should cancel previous timer when new request arrives", async () => {
      const plugin = debouncePlugin();
      const stateManager = createStateManager();
      const eventEmitter = createEventEmitter();
      const emitSpy = vi.spyOn(eventEmitter, "emit");

      const next = vi.fn().mockResolvedValue({ data: [], status: 200 });

      const context1 = createMockContext({
        stateManager,
        eventEmitter,
        queryKey: '{"method":"GET","path":["users"],"query":{"search":"a"}}',
        request: { query: { search: "a" } },
        pluginOptions: { debounce: 300 },
      });

      await plugin.middleware!(context1, next);

      vi.advanceTimersByTime(100);

      const context2 = createMockContext({
        stateManager,
        eventEmitter,
        queryKey: '{"method":"GET","path":["users"],"query":{"search":"ab"}}',
        request: { query: { search: "ab" } },
        pluginOptions: { debounce: 300 },
      });

      await plugin.middleware!(context2, next);

      vi.advanceTimersByTime(200);
      expect(emitSpy).not.toHaveBeenCalled();

      vi.advanceTimersByTime(100);
      expect(emitSpy).toHaveBeenCalledWith("refetch", {
        queryKey: '{"method":"GET","path":["users"],"query":{"search":"ab"}}',
        reason: "invalidate",
      });
      expect(emitSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe("returns cached data during debounce", () => {
    it("should return cached data when available during debounce", async () => {
      const plugin = debouncePlugin();
      const stateManager = createStateManager();
      const eventEmitter = createEventEmitter();

      stateManager.setCache(
        '{"method":"GET","path":["users"],"query":{"search":"a"}}',
        {
          state: {
            data: [{ id: 1, name: "User A" }],
            error: undefined,
            timestamp: Date.now(),
          },
          tags: [],
        }
      );

      const context = createMockContext({
        stateManager,
        eventEmitter,
        queryKey: '{"method":"GET","path":["users"],"query":{"search":"ab"}}',
        request: { query: { search: "ab" } },
        pluginOptions: { debounce: 300 },
      });
      const next = vi.fn();

      await plugin.middleware!(context, next);

      stateManager.setCache(
        '{"method":"GET","path":["users"],"query":{"search":"ab"}}',
        {
          state: {
            data: [{ id: 1, name: "User AB" }],
            error: undefined,
            timestamp: Date.now(),
          },
          tags: [],
        }
      );

      const context2 = createMockContext({
        stateManager,
        eventEmitter,
        queryKey: '{"method":"GET","path":["users"],"query":{"search":"ab"}}',
        request: { query: { search: "ab" } },
        pluginOptions: { debounce: 300 },
      });

      const result = await plugin.middleware!(context2, next);

      expect(next).not.toHaveBeenCalled();
      expect(result).toEqual({
        data: [{ id: 1, name: "User AB" }],
        status: 200,
      });
    });

    it("should return cached data for new queryKey during debounce", async () => {
      const plugin = debouncePlugin();
      const stateManager = createStateManager();
      const eventEmitter = createEventEmitter();

      const cachedData = [{ id: 1, name: "User" }];
      const queryKey =
        '{"method":"GET","path":["users"],"query":{"search":"abc"}}';

      stateManager.setCache(queryKey, {
        state: {
          data: cachedData,
          error: undefined,
          timestamp: Date.now(),
        },
        tags: [],
      });

      const context = createMockContext({
        stateManager,
        eventEmitter,
        queryKey,
        request: { query: { search: "abc" } },
        pluginOptions: { debounce: 300 },
      });
      const next = vi.fn();

      const result = await plugin.middleware!(context, next);

      expect(next).not.toHaveBeenCalled();
      expect(result).toEqual({ data: cachedData, status: 200 });
    });
  });

  describe("emits refetch after debounce delay", () => {
    it("should emit refetch event after debounce delay", async () => {
      const plugin = debouncePlugin();
      const stateManager = createStateManager();
      const eventEmitter = createEventEmitter();
      const emitSpy = vi.spyOn(eventEmitter, "emit");

      const context = createMockContext({
        stateManager,
        eventEmitter,
        queryKey: '{"method":"GET","path":["users"],"query":{"search":"test"}}',
        request: { query: { search: "test" } },
        pluginOptions: { debounce: 500 },
      });
      const next = vi.fn();

      await plugin.middleware!(context, next);

      expect(emitSpy).not.toHaveBeenCalled();

      vi.advanceTimersByTime(499);
      expect(emitSpy).not.toHaveBeenCalled();

      vi.advanceTimersByTime(1);
      expect(emitSpy).toHaveBeenCalledWith("refetch", {
        queryKey: '{"method":"GET","path":["users"],"query":{"search":"test"}}',
        reason: "invalidate",
      });
    });

    it("should emit refetch with latest queryKey after multiple rapid requests", async () => {
      const plugin = debouncePlugin();
      const stateManager = createStateManager();
      const eventEmitter = createEventEmitter();
      const emitSpy = vi.spyOn(eventEmitter, "emit");

      const next = vi.fn();

      const context1 = createMockContext({
        stateManager,
        eventEmitter,
        queryKey: '{"method":"GET","path":["search"],"query":{"q":"h"}}',
        request: { query: { q: "h" } },
        pluginOptions: { debounce: 200 },
      });
      await plugin.middleware!(context1, next);

      vi.advanceTimersByTime(50);

      const context2 = createMockContext({
        stateManager,
        eventEmitter,
        queryKey: '{"method":"GET","path":["search"],"query":{"q":"he"}}',
        request: { query: { q: "he" } },
        pluginOptions: { debounce: 200 },
      });
      await plugin.middleware!(context2, next);

      vi.advanceTimersByTime(50);

      const context3 = createMockContext({
        stateManager,
        eventEmitter,
        queryKey: '{"method":"GET","path":["search"],"query":{"q":"hel"}}',
        request: { query: { q: "hel" } },
        pluginOptions: { debounce: 200 },
      });
      await plugin.middleware!(context3, next);

      vi.advanceTimersByTime(200);

      expect(emitSpy).toHaveBeenCalledTimes(1);
      expect(emitSpy).toHaveBeenCalledWith("refetch", {
        queryKey: '{"method":"GET","path":["search"],"query":{"q":"hel"}}',
        reason: "invalidate",
      });
    });
  });

  describe("forceRefetch bypasses debounce", () => {
    it("should call next() when forceRefetch is true", async () => {
      const plugin = debouncePlugin();
      const stateManager = createStateManager();
      const eventEmitter = createEventEmitter();

      const context = createMockContext({
        stateManager,
        eventEmitter,
        forceRefetch: true,
        queryKey: '{"method":"GET","path":["users"],"query":{"search":"test"}}',
        request: { query: { search: "test" } },
        pluginOptions: { debounce: 300 },
      });
      const expectedResponse = { data: [{ id: 1 }], status: 200 };
      const next = vi.fn().mockResolvedValue(expectedResponse);

      const result = await plugin.middleware!(context, next);

      expect(next).toHaveBeenCalled();
      expect(result).toEqual(expectedResponse);
    });

    it("should not set up debounce timer when forceRefetch is true", async () => {
      const plugin = debouncePlugin();
      const stateManager = createStateManager();
      const eventEmitter = createEventEmitter();
      const emitSpy = vi.spyOn(eventEmitter, "emit");

      const context = createMockContext({
        stateManager,
        eventEmitter,
        forceRefetch: true,
        queryKey: '{"method":"GET","path":["users"],"query":{"search":"test"}}',
        request: { query: { search: "test" } },
        pluginOptions: { debounce: 300 },
      });
      const next = vi.fn().mockResolvedValue({ data: [], status: 200 });

      await plugin.middleware!(context, next);

      vi.advanceTimersByTime(500);

      expect(emitSpy).not.toHaveBeenCalled();
    });
  });

  describe("dynamic debounce function", () => {
    it("should call debounce function with previous request context", async () => {
      const plugin = debouncePlugin();
      const stateManager = createStateManager();
      const eventEmitter = createEventEmitter();

      const debounceFn = vi.fn().mockReturnValue(500);

      const context1 = createMockContext({
        stateManager,
        eventEmitter,
        queryKey: '{"method":"GET","path":["users"],"query":{"page":1}}',
        request: { query: { page: 1 } },
        pluginOptions: { debounce: debounceFn },
      });
      const next = vi.fn().mockResolvedValue({ data: [], status: 200 });

      await plugin.middleware!(context1, next);

      expect(debounceFn).toHaveBeenCalledWith({});

      vi.advanceTimersByTime(600);

      const context2 = createMockContext({
        stateManager,
        eventEmitter,
        queryKey: '{"method":"GET","path":["users"],"query":{"page":2}}',
        request: { query: { page: 2 } },
        pluginOptions: { debounce: debounceFn },
      });

      await plugin.middleware!(context2, next);

      expect(debounceFn).toHaveBeenLastCalledWith({
        prevQuery: { page: 1 },
      });
    });

    it("should use debounce value returned by function", async () => {
      const plugin = debouncePlugin();
      const stateManager = createStateManager();
      const eventEmitter = createEventEmitter();
      const emitSpy = vi.spyOn(eventEmitter, "emit");

      const debounceFn = vi.fn().mockReturnValue(100);

      const context = createMockContext({
        stateManager,
        eventEmitter,
        queryKey: '{"method":"GET","path":["users"],"query":{"search":"x"}}',
        request: { query: { search: "x" } },
        pluginOptions: { debounce: debounceFn },
      });
      const next = vi.fn();

      await plugin.middleware!(context, next);

      vi.advanceTimersByTime(99);
      expect(emitSpy).not.toHaveBeenCalled();

      vi.advanceTimersByTime(1);
      expect(emitSpy).toHaveBeenCalled();
    });

    it("should not debounce when function returns 0", async () => {
      const plugin = debouncePlugin();
      const stateManager = createStateManager();
      const eventEmitter = createEventEmitter();

      const debounceFn = vi.fn().mockReturnValue(0);

      const context = createMockContext({
        stateManager,
        eventEmitter,
        queryKey: '{"method":"GET","path":["users"],"query":{"search":"x"}}',
        request: { query: { search: "x" } },
        pluginOptions: { debounce: debounceFn },
      });
      const expectedResponse = { data: [], status: 200 };
      const next = vi.fn().mockResolvedValue(expectedResponse);

      const result = await plugin.middleware!(context, next);

      expect(next).toHaveBeenCalled();
      expect(result).toEqual(expectedResponse);
    });

    it("should pass prevParams when available", async () => {
      const plugin = debouncePlugin();
      const stateManager = createStateManager();
      const eventEmitter = createEventEmitter();

      const debounceFn = vi.fn().mockReturnValue(200);

      const context1 = createMockContext({
        stateManager,
        eventEmitter,
        path: "users/1",
        queryKey: '{"method":"GET","path":["users","1"]}',
        request: { params: { id: 1 } },
        pluginOptions: { debounce: debounceFn },
      });
      const next = vi.fn().mockResolvedValue({ data: [], status: 200 });

      await plugin.middleware!(context1, next);
      vi.advanceTimersByTime(300);

      const context2 = createMockContext({
        stateManager,
        eventEmitter,
        path: "users/1",
        queryKey: '{"method":"GET","path":["users","2"]}',
        request: { params: { id: 2 } },
        pluginOptions: { debounce: debounceFn },
      });

      await plugin.middleware!(context2, next);

      expect(debounceFn).toHaveBeenLastCalledWith({
        prevParams: { id: 1 },
      });
    });
  });

  describe("infiniteRead operation", () => {
    it("should debounce infiniteRead operations", async () => {
      const plugin = debouncePlugin();
      const stateManager = createStateManager();
      const eventEmitter = createEventEmitter();
      const emitSpy = vi.spyOn(eventEmitter, "emit");

      const context = createMockContext({
        stateManager,
        eventEmitter,
        operationType: "infiniteRead",
        queryKey: '{"method":"GET","path":["posts"],"query":{"cursor":"abc"}}',
        request: { query: { cursor: "abc" } },
        pluginOptions: { debounce: 250 },
      });
      const next = vi.fn();

      await plugin.middleware!(context, next);

      expect(next).not.toHaveBeenCalled();

      vi.advanceTimersByTime(250);

      expect(emitSpy).toHaveBeenCalledWith("refetch", {
        queryKey: '{"method":"GET","path":["posts"],"query":{"cursor":"abc"}}',
        reason: "invalidate",
      });
    });
  });

  describe("stable key behavior", () => {
    it("should use path and method as stable key for debouncing", async () => {
      const plugin = debouncePlugin();
      const stateManager = createStateManager();
      const eventEmitter = createEventEmitter();
      const emitSpy = vi.spyOn(eventEmitter, "emit");

      const next = vi.fn();

      const context1 = createMockContext({
        stateManager,
        eventEmitter,
        path: "api/search",
        method: "GET",
        queryKey: '{"method":"GET","path":["api","search"],"query":{"q":"a"}}',
        request: { query: { q: "a" } },
        pluginOptions: { debounce: 200 },
      });
      await plugin.middleware!(context1, next);

      const context2 = createMockContext({
        stateManager,
        eventEmitter,
        path: "api/users",
        method: "GET",
        queryKey: '{"method":"GET","path":["api","users"],"query":{"q":"b"}}',
        request: { query: { q: "b" } },
        pluginOptions: { debounce: 200 },
      });
      await plugin.middleware!(context2, next);

      vi.advanceTimersByTime(200);

      expect(emitSpy).toHaveBeenCalledTimes(2);
      expect(emitSpy).toHaveBeenCalledWith("refetch", {
        queryKey: '{"method":"GET","path":["api","search"],"query":{"q":"a"}}',
        reason: "invalidate",
      });
      expect(emitSpy).toHaveBeenCalledWith("refetch", {
        queryKey: '{"method":"GET","path":["api","users"],"query":{"q":"b"}}',
        reason: "invalidate",
      });
    });

    it("should treat different methods on same path as separate stable keys", async () => {
      const plugin = debouncePlugin();
      const stateManager = createStateManager();
      const eventEmitter = createEventEmitter();
      const emitSpy = vi.spyOn(eventEmitter, "emit");

      const next = vi.fn();

      const getContext = createMockContext({
        stateManager,
        eventEmitter,
        path: "api/data",
        method: "GET",
        queryKey: '{"method":"GET","path":["api","data"]}',
        request: {},
        pluginOptions: { debounce: 200 },
      });
      await plugin.middleware!(getContext, next);

      const postContext = createMockContext({
        stateManager,
        eventEmitter,
        path: "api/data",
        method: "POST",
        queryKey: '{"method":"POST","path":["api","data"]}',
        request: {},
        pluginOptions: { debounce: 200 },
      });
      await plugin.middleware!(postContext, next);

      vi.advanceTimersByTime(200);

      expect(emitSpy).toHaveBeenCalledTimes(2);
    });
  });

  describe("edge cases", () => {
    it("should handle negative debounce value as no debounce", async () => {
      const plugin = debouncePlugin();
      const context = createMockContext({
        pluginOptions: { debounce: -100 },
      });
      const expectedResponse = { data: { id: 1 }, status: 200 };
      const next = vi.fn().mockResolvedValue(expectedResponse);

      const result = await plugin.middleware!(context, next);

      expect(next).toHaveBeenCalled();
      expect(result).toEqual(expectedResponse);
    });

    it("should handle undefined requestOptions gracefully", async () => {
      const plugin = debouncePlugin();
      const stateManager = createStateManager();
      const eventEmitter = createEventEmitter();

      const context = createMockContext({
        stateManager,
        eventEmitter,
        request: undefined as unknown as Record<string, unknown>,
        pluginOptions: { debounce: 200 },
      });
      const next = vi.fn();

      await expect(plugin.middleware!(context, next)).resolves.not.toThrow();
    });
  });
});
