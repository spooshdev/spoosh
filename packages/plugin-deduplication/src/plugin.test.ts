import type { SpooshResponse } from "@spoosh/core";
import { createMockContext, createStateManager } from "@spoosh/test-utils";

import { deduplicationPlugin } from "./plugin";
import type { DedupeMode } from "./types";

type DeduplicationExports = {
  getConfig: () => { read: DedupeMode; write: DedupeMode };
};

describe("deduplicationPlugin", () => {
  describe("plugin configuration", () => {
    it("should have correct name", () => {
      const plugin = deduplicationPlugin();
      expect(plugin.name).toBe("spoosh:deduplication");
    });

    it("should operate on read, pages, and write operations", () => {
      const plugin = deduplicationPlugin();
      expect(plugin.operations).toEqual(["read", "pages", "write"]);
    });

    it("should export getConfig function", () => {
      const plugin = deduplicationPlugin();
      const context = createMockContext();
      const exports = plugin.exports!(context) as DeduplicationExports;

      expect(exports.getConfig).toBeDefined();
      expect(typeof exports.getConfig).toBe("function");
    });
  });

  describe("default configuration", () => {
    it("should default to in-flight deduplication for reads", () => {
      const plugin = deduplicationPlugin();
      const context = createMockContext();
      const exports = plugin.exports!(context) as DeduplicationExports;

      expect(exports.getConfig()).toEqual({
        read: "in-flight",
        write: false,
      });
    });

    it("should default to no deduplication for writes", () => {
      const plugin = deduplicationPlugin();
      const context = createMockContext();
      const exports = plugin.exports!(context) as DeduplicationExports;

      expect(exports.getConfig().write).toBe(false);
    });
  });

  describe("custom configuration", () => {
    it("should respect custom read configuration", () => {
      const plugin = deduplicationPlugin({ read: false });
      const context = createMockContext();
      const exports = plugin.exports!(context) as DeduplicationExports;

      expect(exports.getConfig().read).toBe(false);
    });

    it("should respect custom write configuration", () => {
      const plugin = deduplicationPlugin({ write: "in-flight" });
      const context = createMockContext();
      const exports = plugin.exports!(context) as DeduplicationExports;

      expect(exports.getConfig().write).toBe("in-flight");
    });
  });

  describe("read operation deduplication", () => {
    it("should call next() when no in-flight request exists", async () => {
      const plugin = deduplicationPlugin();
      const context = createMockContext();
      const expectedResponse = { data: { id: 1 }, status: 200 };
      const next = vi.fn().mockResolvedValue(expectedResponse);

      const result = await plugin.middleware!(context, next);

      expect(next).toHaveBeenCalled();
      expect(result).toEqual(expectedResponse);
    });

    it("should return cached promise when in-flight request exists", async () => {
      const plugin = deduplicationPlugin();
      const stateManager = createStateManager();
      const queryKey = '{"method":"GET","path":["users","1"]}';

      const inFlightPromise = Promise.resolve({
        data: { id: 1, name: "User" },
        status: 200,
      });

      stateManager.setPendingPromise(queryKey, inFlightPromise);

      const context = createMockContext({
        stateManager,
        queryKey,
      });
      const next = vi.fn();

      const result = await plugin.middleware!(context, next);

      expect(next).not.toHaveBeenCalled();
      expect(result).toEqual({ data: { id: 1, name: "User" }, status: 200 });
    });

    it("should share the same promise between concurrent requests", async () => {
      const plugin = deduplicationPlugin();
      const stateManager = createStateManager();
      const queryKey = '{"method":"GET","path":["users","1"]}';

      let resolvePromise: (value: SpooshResponse<unknown, unknown>) => void;
      const sharedPromise = new Promise<SpooshResponse<unknown, unknown>>(
        (resolve) => {
          resolvePromise = resolve;
        }
      );

      stateManager.setPendingPromise(queryKey, sharedPromise);

      const context1 = createMockContext({
        stateManager,
        queryKey,
      });
      const context2 = createMockContext({
        stateManager,
        queryKey,
      });
      const next = vi.fn();

      const result1Promise = plugin.middleware!(context1, next);
      const result2Promise = plugin.middleware!(context2, next);

      resolvePromise!({ data: { id: 1 }, status: 200 });

      const [result1, result2] = await Promise.all([
        result1Promise,
        result2Promise,
      ]);

      expect(next).not.toHaveBeenCalled();
      expect(result1).toEqual(result2);
      expect(result1).toEqual({ data: { id: 1 }, status: 200 });
    });

    it("should create new request after previous promise resolves", async () => {
      const plugin = deduplicationPlugin();
      const stateManager = createStateManager();
      const queryKey = '{"method":"GET","path":["users","1"]}';

      const firstResponse = { data: { id: 1, version: 1 }, status: 200 };
      const firstPromise = Promise.resolve(firstResponse);

      stateManager.setPendingPromise(queryKey, firstPromise);

      const context1 = createMockContext({ stateManager, queryKey });
      const next1 = vi.fn();
      const result1 = await plugin.middleware!(context1, next1);

      expect(next1).not.toHaveBeenCalled();
      expect(result1).toEqual(firstResponse);

      stateManager.setPendingPromise(queryKey, undefined);
      stateManager.setCache(queryKey, {
        state: {
          data: firstResponse.data,
          error: undefined,
          timestamp: Date.now(),
        },
        tags: [],
      });

      const context2 = createMockContext({ stateManager, queryKey });
      const secondResponse = { data: { id: 1, version: 2 }, status: 200 };
      const next2 = vi.fn().mockResolvedValue(secondResponse);
      const result2 = await plugin.middleware!(context2, next2);

      expect(next2).toHaveBeenCalled();
      expect(result2).toEqual(secondResponse);
    });
  });

  describe("write operation deduplication", () => {
    it("should not dedupe writes by default", async () => {
      const plugin = deduplicationPlugin();
      const stateManager = createStateManager();
      const queryKey = '{"method":"POST","path":["users"]}';

      const inFlightPromise = Promise.resolve({
        data: { id: 1 },
        status: 200,
      });

      stateManager.setPendingPromise(queryKey, inFlightPromise);

      const context = createMockContext({
        stateManager,
        operationType: "write",
        method: "POST",
        path: "users",
        queryKey,
      });
      const expectedResponse = { data: { id: 2 }, status: 201 };
      const next = vi.fn().mockResolvedValue(expectedResponse);

      const result = await plugin.middleware!(context, next);

      expect(next).toHaveBeenCalled();
      expect(result).toEqual(expectedResponse);
    });

    it("should dedupe writes when configured", async () => {
      const plugin = deduplicationPlugin({ write: "in-flight" });
      const stateManager = createStateManager();
      const queryKey = '{"method":"POST","path":["users"]}';

      const inFlightPromise = Promise.resolve({
        data: { id: 1 },
        status: 200,
      });

      stateManager.setPendingPromise(queryKey, inFlightPromise);

      const context = createMockContext({
        stateManager,
        operationType: "write",
        method: "POST",
        path: "users",
        queryKey,
      });
      const next = vi.fn();

      const result = await plugin.middleware!(context, next);

      expect(next).not.toHaveBeenCalled();
      expect(result).toEqual({ data: { id: 1 }, status: 200 });
    });
  });

  describe("per-request override", () => {
    it("should disable deduplication when dedupe is false in options", async () => {
      const plugin = deduplicationPlugin({ read: "in-flight" });
      const stateManager = createStateManager();
      const queryKey = '{"method":"GET","path":["users","1"]}';

      const inFlightPromise = Promise.resolve({
        data: { id: 1 },
        status: 200,
      });

      stateManager.setPendingPromise(queryKey, inFlightPromise);

      const context = createMockContext({
        stateManager,
        queryKey,
        pluginOptions: { dedupe: false },
      });
      const expectedResponse = { data: { id: 2 }, status: 200 };
      const next = vi.fn().mockResolvedValue(expectedResponse);

      const result = await plugin.middleware!(context, next);

      expect(next).toHaveBeenCalled();
      expect(result).toEqual(expectedResponse);
    });

    it("should enable deduplication when dedupe is in-flight in options", async () => {
      const plugin = deduplicationPlugin({ read: false });
      const stateManager = createStateManager();
      const queryKey = '{"method":"GET","path":["users","1"]}';

      const inFlightPromise = Promise.resolve({
        data: { id: 1 },
        status: 200,
      });

      stateManager.setPendingPromise(queryKey, inFlightPromise);

      const context = createMockContext({
        stateManager,
        queryKey,
        pluginOptions: { dedupe: "in-flight" },
      });
      const next = vi.fn();

      const result = await plugin.middleware!(context, next);

      expect(next).not.toHaveBeenCalled();
      expect(result).toEqual({ data: { id: 1 }, status: 200 });
    });
  });

  describe("pages operation", () => {
    it("should dedupe pages by default", async () => {
      const plugin = deduplicationPlugin();
      const stateManager = createStateManager();
      const queryKey = '{"method":"GET","path":["posts"]}';

      const inFlightPromise = Promise.resolve({
        data: { items: [1, 2, 3] },
        status: 200,
      });

      stateManager.setPendingPromise(queryKey, inFlightPromise);

      const context = createMockContext({
        stateManager,
        operationType: "pages",
        path: "posts",
        queryKey,
      });
      const next = vi.fn();

      const result = await plugin.middleware!(context, next);

      expect(next).not.toHaveBeenCalled();
      expect(result).toEqual({ data: { items: [1, 2, 3] }, status: 200 });
    });
  });

  describe("edge cases", () => {
    it("should call next() when cache entry exists but has no pending promise", async () => {
      const plugin = deduplicationPlugin();
      const stateManager = createStateManager();

      stateManager.setCache('{"method":"GET","path":["users","1"]}', {
        state: {
          data: { id: 1 },
          error: undefined,
          timestamp: Date.now(),
        },
        tags: [],
      });

      const context = createMockContext({ stateManager });
      const expectedResponse = { data: { id: 1, updated: true }, status: 200 };
      const next = vi.fn().mockResolvedValue(expectedResponse);

      const result = await plugin.middleware!(context, next);

      expect(next).toHaveBeenCalled();
      expect(result).toEqual(expectedResponse);
    });

    it("should call next() when no cache entry exists", async () => {
      const plugin = deduplicationPlugin();
      const stateManager = createStateManager();
      const context = createMockContext({ stateManager });
      const expectedResponse = { data: { id: 1 }, status: 200 };
      const next = vi.fn().mockResolvedValue(expectedResponse);

      const result = await plugin.middleware!(context, next);

      expect(next).toHaveBeenCalled();
      expect(result).toEqual(expectedResponse);
    });
  });
});
