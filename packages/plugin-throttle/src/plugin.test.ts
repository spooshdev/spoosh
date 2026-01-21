import { createMockContext } from "@spoosh/test-utils";

import { throttlePlugin } from "./plugin";

describe("throttlePlugin", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("plugin configuration", () => {
    it("should have correct name", () => {
      const plugin = throttlePlugin();
      expect(plugin.name).toBe("spoosh:throttle");
    });

    it("should operate on read and infiniteRead operations", () => {
      const plugin = throttlePlugin();
      expect(plugin.operations).toEqual(["read", "infiniteRead"]);
    });
  });

  describe("allows first request immediately", () => {
    it("should allow first request without throttling", async () => {
      const plugin = throttlePlugin();
      const context = createMockContext({
        pluginOptions: { throttle: 1000 },
      });
      const expectedResponse = { data: { id: 1 }, status: 200 };
      const next = vi.fn().mockResolvedValue(expectedResponse);

      const result = await plugin.middleware!(context, next);

      expect(next).toHaveBeenCalledTimes(1);
      expect(result).toEqual(expectedResponse);
    });

    it("should allow first request with different paths", async () => {
      const plugin = throttlePlugin();
      const context1 = createMockContext({
        path: ["users", "1"],
        pluginOptions: { throttle: 1000 },
      });
      const context2 = createMockContext({
        path: ["users", "2"],
        pluginOptions: { throttle: 1000 },
      });
      const next = vi.fn().mockResolvedValue({ data: { id: 1 }, status: 200 });

      await plugin.middleware!(context1, next);
      await plugin.middleware!(context2, next);

      expect(next).toHaveBeenCalledTimes(2);
    });

    it("should throttle same path with different query params", async () => {
      const plugin = throttlePlugin();
      const context1 = createMockContext({
        path: ["users"],
        queryKey: '{"method":"GET","path":["users"],"query":{"page":1}}',
        pluginOptions: { throttle: 1000 },
      });
      const context2 = createMockContext({
        path: ["users"],
        queryKey: '{"method":"GET","path":["users"],"query":{"page":2}}',
        pluginOptions: { throttle: 1000 },
      });
      const next = vi.fn().mockResolvedValue({ data: { id: 1 }, status: 200 });

      await plugin.middleware!(context1, next);
      const result = await plugin.middleware!(context2, next);

      expect(next).toHaveBeenCalledTimes(1);
      expect(result).toEqual({ data: undefined, status: 0 });
    });
  });

  describe("throttles subsequent requests within interval", () => {
    it("should throttle second request within interval", async () => {
      const plugin = throttlePlugin();

      const context1 = createMockContext({
        path: ["users"],
        pluginOptions: { throttle: 1000 },
      });
      const context2 = createMockContext({
        path: ["users"],
        pluginOptions: { throttle: 1000 },
      });

      const next = vi
        .fn()
        .mockResolvedValue({ data: { id: 1, name: "fresh" }, status: 200 });

      await plugin.middleware!(context1, next);
      vi.advanceTimersByTime(500);
      const result = await plugin.middleware!(context2, next);

      expect(next).toHaveBeenCalledTimes(1);
      expect(result).toEqual({ data: undefined, status: 0 });
    });

    it("should throttle multiple requests within interval", async () => {
      const plugin = throttlePlugin();

      const createCtx = () =>
        createMockContext({
          path: ["users"],
          pluginOptions: { throttle: 2000 },
        });

      const next = vi
        .fn()
        .mockResolvedValue({ data: { fresh: true }, status: 200 });

      await plugin.middleware!(createCtx(), next);
      vi.advanceTimersByTime(500);
      await plugin.middleware!(createCtx(), next);
      vi.advanceTimersByTime(500);
      await plugin.middleware!(createCtx(), next);
      vi.advanceTimersByTime(500);
      await plugin.middleware!(createCtx(), next);

      expect(next).toHaveBeenCalledTimes(1);
    });
  });

  describe("returns undefined when throttled", () => {
    it("should return undefined data with status 0 when throttled", async () => {
      const plugin = throttlePlugin();

      const context1 = createMockContext({
        path: ["users"],
        pluginOptions: { throttle: 1000 },
      });
      const context2 = createMockContext({
        path: ["users"],
        pluginOptions: { throttle: 1000 },
      });

      const next = vi.fn().mockResolvedValue({ data: { id: 1 }, status: 200 });

      await plugin.middleware!(context1, next);
      vi.advanceTimersByTime(100);
      const result = await plugin.middleware!(context2, next);

      expect(result).toEqual({ data: undefined, status: 0 });
    });
  });

  describe("allows request after interval passes", () => {
    it("should allow request after throttle interval passes", async () => {
      const plugin = throttlePlugin();

      const context1 = createMockContext({
        path: ["users"],
        pluginOptions: { throttle: 1000 },
      });
      const context2 = createMockContext({
        path: ["users"],
        pluginOptions: { throttle: 1000 },
      });

      const next = vi
        .fn()
        .mockResolvedValue({ data: { fresh: true }, status: 200 });

      await plugin.middleware!(context1, next);
      vi.advanceTimersByTime(1000);
      const result = await plugin.middleware!(context2, next);

      expect(next).toHaveBeenCalledTimes(2);
      expect(result).toEqual({ data: { fresh: true }, status: 200 });
    });

    it("should allow request after interval passes (exactly at boundary)", async () => {
      const plugin = throttlePlugin();

      const createCtx = () =>
        createMockContext({
          path: ["users"],
          pluginOptions: { throttle: 500 },
        });

      const next = vi.fn().mockResolvedValue({ data: { id: 1 }, status: 200 });

      await plugin.middleware!(createCtx(), next);
      vi.advanceTimersByTime(500);
      await plugin.middleware!(createCtx(), next);

      expect(next).toHaveBeenCalledTimes(2);
    });

    it("should reset throttle timer after each successful request", async () => {
      const plugin = throttlePlugin();

      const createCtx = () =>
        createMockContext({
          path: ["users"],
          pluginOptions: { throttle: 1000 },
        });

      const next = vi
        .fn()
        .mockResolvedValue({ data: { fresh: true }, status: 200 });

      await plugin.middleware!(createCtx(), next);
      vi.advanceTimersByTime(1000);
      await plugin.middleware!(createCtx(), next);
      vi.advanceTimersByTime(500);
      await plugin.middleware!(createCtx(), next);

      expect(next).toHaveBeenCalledTimes(2);
    });
  });

  describe("edge cases", () => {
    it("should pass through when throttle is not set", async () => {
      const plugin = throttlePlugin();
      const context = createMockContext({
        pluginOptions: {},
      });
      const next = vi.fn().mockResolvedValue({ data: { id: 1 }, status: 200 });

      await plugin.middleware!(context, next);
      await plugin.middleware!(context, next);

      expect(next).toHaveBeenCalledTimes(2);
    });

    it("should pass through when throttle is 0", async () => {
      const plugin = throttlePlugin();
      const context = createMockContext({
        pluginOptions: { throttle: 0 },
      });
      const next = vi.fn().mockResolvedValue({ data: { id: 1 }, status: 200 });

      await plugin.middleware!(context, next);
      await plugin.middleware!(context, next);

      expect(next).toHaveBeenCalledTimes(2);
    });

    it("should pass through when throttle is negative", async () => {
      const plugin = throttlePlugin();
      const context = createMockContext({
        pluginOptions: { throttle: -1000 },
      });
      const next = vi.fn().mockResolvedValue({ data: { id: 1 }, status: 200 });

      await plugin.middleware!(context, next);
      await plugin.middleware!(context, next);

      expect(next).toHaveBeenCalledTimes(2);
    });

    it("should pass through when pluginOptions is undefined", async () => {
      const plugin = throttlePlugin();
      const context = createMockContext({
        pluginOptions: undefined,
      });
      const next = vi.fn().mockResolvedValue({ data: { id: 1 }, status: 200 });

      await plugin.middleware!(context, next);
      await plugin.middleware!(context, next);

      expect(next).toHaveBeenCalledTimes(2);
    });

    it("should handle very large throttle values", async () => {
      const plugin = throttlePlugin();

      const createCtx = () =>
        createMockContext({
          path: ["users"],
          pluginOptions: { throttle: 999999999 },
        });

      const next = vi
        .fn()
        .mockResolvedValue({ data: { fresh: true }, status: 200 });

      await plugin.middleware!(createCtx(), next);
      vi.advanceTimersByTime(1000000);
      await plugin.middleware!(createCtx(), next);

      expect(next).toHaveBeenCalledTimes(1);
    });
  });

  describe("infiniteRead operations", () => {
    it("should throttle infiniteRead operations", async () => {
      const plugin = throttlePlugin();

      const context1 = createMockContext({
        operationType: "infiniteRead",
        path: ["users"],
        pluginOptions: { throttle: 1000 },
      });
      const context2 = createMockContext({
        operationType: "infiniteRead",
        path: ["users"],
        pluginOptions: { throttle: 1000 },
      });

      const next = vi
        .fn()
        .mockResolvedValue({ data: { items: [1, 2, 3, 4] }, status: 200 });

      await plugin.middleware!(context1, next);
      vi.advanceTimersByTime(500);
      const result = await plugin.middleware!(context2, next);

      expect(next).toHaveBeenCalledTimes(1);
      expect(result).toEqual({ data: undefined, status: 0 });
    });
  });

  describe("throttle key uses path and method", () => {
    it("should throttle based on path and method combination", async () => {
      const plugin = throttlePlugin();

      const getContext = createMockContext({
        path: ["users"],
        method: "GET",
        pluginOptions: { throttle: 1000 },
      });
      const postContext = createMockContext({
        path: ["users"],
        method: "POST",
        pluginOptions: { throttle: 1000 },
      });

      const next = vi.fn().mockResolvedValue({ data: { id: 1 }, status: 200 });

      await plugin.middleware!(getContext, next);
      await plugin.middleware!(postContext, next);

      expect(next).toHaveBeenCalledTimes(2);
    });
  });
});
