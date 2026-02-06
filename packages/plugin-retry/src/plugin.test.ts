import { createMockContext } from "@spoosh/test-utils";

import { retryPlugin } from "./plugin";

describe("retryPlugin", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("plugin configuration", () => {
    it("should have correct name", () => {
      const plugin = retryPlugin();
      expect(plugin.name).toBe("spoosh:retry");
    });

    it("should operate on read, write, and infiniteRead operations", () => {
      const plugin = retryPlugin();
      expect(plugin.operations).toEqual(["read", "write", "infiniteRead"]);
    });
  });

  describe("default configuration", () => {
    it("should use default retries of 3", async () => {
      const plugin = retryPlugin();
      const context = createMockContext();
      const next = vi.fn().mockResolvedValue({ data: { id: 1 }, status: 200 });

      await plugin.middleware!(context, next);

      expect(context.request.retries).toBe(3);
    });

    it("should use default retryDelay of 1000ms", async () => {
      const plugin = retryPlugin();
      const context = createMockContext();
      const next = vi.fn().mockResolvedValue({ data: { id: 1 }, status: 200 });

      await plugin.middleware!(context, next);

      expect(context.request.retryDelay).toBe(1000);
    });
  });

  describe("custom plugin configuration", () => {
    it("should use custom retries from config", async () => {
      const plugin = retryPlugin({ retries: 5 });
      const context = createMockContext();
      const next = vi.fn().mockResolvedValue({ data: { id: 1 }, status: 200 });

      await plugin.middleware!(context, next);

      expect(context.request.retries).toBe(5);
    });

    it("should use custom retryDelay from config", async () => {
      const plugin = retryPlugin({ retryDelay: 2000 });
      const context = createMockContext();
      const next = vi.fn().mockResolvedValue({ data: { id: 1 }, status: 200 });

      await plugin.middleware!(context, next);

      expect(context.request.retryDelay).toBe(2000);
    });

    it("should disable retries when set to false", async () => {
      const plugin = retryPlugin({ retries: false });
      const context = createMockContext();
      const next = vi.fn().mockResolvedValue({ data: { id: 1 }, status: 200 });

      await plugin.middleware!(context, next);

      expect(context.request.retries).toBe(false);
    });
  });

  describe("per-request override", () => {
    it("should override retries with request option", async () => {
      const plugin = retryPlugin({ retries: 3 });
      const context = createMockContext({
        pluginOptions: { retries: 10 },
      });
      const next = vi.fn().mockResolvedValue({ data: { id: 1 }, status: 200 });

      await plugin.middleware!(context, next);

      expect(context.request.retries).toBe(10);
    });

    it("should override retryDelay with request option", async () => {
      const plugin = retryPlugin({ retryDelay: 1000 });
      const context = createMockContext({
        pluginOptions: { retryDelay: 5000 },
      });
      const next = vi.fn().mockResolvedValue({ data: { id: 1 }, status: 200 });

      await plugin.middleware!(context, next);

      expect(context.request.retryDelay).toBe(5000);
    });

    it("should disable retries with request option", async () => {
      const plugin = retryPlugin({ retries: 3 });
      const context = createMockContext({
        pluginOptions: { retries: false },
      });
      const next = vi.fn().mockResolvedValue({ data: { id: 1 }, status: 200 });

      await plugin.middleware!(context, next);

      expect(context.request.retries).toBe(false);
    });

    it("should use 0 retries when explicitly set", async () => {
      const plugin = retryPlugin({ retries: 3 });
      const context = createMockContext({
        pluginOptions: { retries: 0 },
      });
      const next = vi.fn().mockResolvedValue({ data: { id: 1 }, status: 200 });

      await plugin.middleware!(context, next);

      expect(context.request.retries).toBe(0);
    });
  });

  describe("middleware behavior", () => {
    it("should call next() and return its result", async () => {
      const plugin = retryPlugin();
      const context = createMockContext();
      const expectedResponse = { data: { id: 1, name: "User" }, status: 200 };
      const next = vi.fn().mockResolvedValue(expectedResponse);

      const result = await plugin.middleware!(context, next);

      expect(next).toHaveBeenCalled();
      expect(result).toEqual(expectedResponse);
    });

    it("should preserve existing request", async () => {
      const plugin = retryPlugin();
      const context = createMockContext({
        request: {
          headers: { "X-Custom": "value" },
        },
      });
      const next = vi.fn().mockResolvedValue({ data: {}, status: 200 });

      await plugin.middleware!(context, next);

      expect(context.request.headers).toEqual({ "X-Custom": "value" });
      expect(context.request.retries).toBe(3);
      expect(context.request.retryDelay).toBe(1000);
    });

    it("should handle error responses", async () => {
      const plugin = retryPlugin();
      const context = createMockContext();
      const errorResponse = { error: { message: "Not found" }, status: 404 };
      const next = vi.fn().mockResolvedValue(errorResponse);

      const result = await plugin.middleware!(context, next);

      expect(next).toHaveBeenCalled();
      expect(result).toEqual(errorResponse);
    });
  });

  describe("write operations", () => {
    it("should apply retry settings to write operations", async () => {
      const plugin = retryPlugin({ retries: 2 });
      const context = createMockContext({
        operationType: "write",
        method: "POST",
      });
      const next = vi.fn().mockResolvedValue({ data: { id: 1 }, status: 201 });

      await plugin.middleware!(context, next);

      expect(context.request.retries).toBe(2);
      expect(next).toHaveBeenCalled();
    });
  });

  describe("infiniteRead operations", () => {
    it("should apply retry settings to infiniteRead operations", async () => {
      const plugin = retryPlugin({ retries: 4, retryDelay: 500 });
      const context = createMockContext({
        operationType: "infiniteRead",
      });
      const next = vi
        .fn()
        .mockResolvedValue({ data: { items: [] }, status: 200 });

      await plugin.middleware!(context, next);

      expect(context.request.retries).toBe(4);
      expect(context.request.retryDelay).toBe(500);
    });
  });

  describe("retries on error response", () => {
    it("should configure retries for error responses to be handled by core", async () => {
      const plugin = retryPlugin({ retries: 3, retryDelay: 1000 });
      const context = createMockContext();
      const errorResponse = { error: { message: "Server error" }, status: 500 };
      const next = vi.fn().mockResolvedValue(errorResponse);

      await plugin.middleware!(context, next);

      expect(context.request.retries).toBe(3);
      expect(context.request.retryDelay).toBe(1000);
      expect(next).toHaveBeenCalledTimes(1);
    });

    it("should pass retry config when next throws network error", async () => {
      const plugin = retryPlugin({ retries: 2, retryDelay: 500 });
      const context = createMockContext();
      const networkError = new TypeError("Failed to fetch");
      const next = vi.fn().mockRejectedValue(networkError);

      await expect(plugin.middleware!(context, next)).rejects.toThrow(
        networkError
      );

      expect(context.request.retries).toBe(2);
      expect(context.request.retryDelay).toBe(500);
    });
  });

  describe("respects retries count option", () => {
    it("should set exact retry count from plugin config", async () => {
      const plugin = retryPlugin({ retries: 5 });
      const context = createMockContext();
      const next = vi.fn().mockResolvedValue({ data: {}, status: 200 });

      await plugin.middleware!(context, next);

      expect(context.request.retries).toBe(5);
    });

    it("should set exact retry count from request option override", async () => {
      const plugin = retryPlugin({ retries: 3 });
      const context = createMockContext({
        pluginOptions: { retries: 7 },
      });
      const next = vi.fn().mockResolvedValue({ data: {}, status: 200 });

      await plugin.middleware!(context, next);

      expect(context.request.retries).toBe(7);
    });

    it("should support large retry counts", async () => {
      const plugin = retryPlugin({ retries: 100 });
      const context = createMockContext();
      const next = vi.fn().mockResolvedValue({ data: {}, status: 200 });

      await plugin.middleware!(context, next);

      expect(context.request.retries).toBe(100);
    });
  });

  describe("retryDelay between retries", () => {
    it("should configure delay for core to use between retry attempts", async () => {
      const plugin = retryPlugin({ retryDelay: 2000 });
      const context = createMockContext();
      const next = vi.fn().mockResolvedValue({ data: {}, status: 200 });

      await plugin.middleware!(context, next);

      expect(context.request.retryDelay).toBe(2000);
    });

    it("should support small delays", async () => {
      const plugin = retryPlugin({ retryDelay: 100 });
      const context = createMockContext();
      const next = vi.fn().mockResolvedValue({ data: {}, status: 200 });

      await plugin.middleware!(context, next);

      expect(context.request.retryDelay).toBe(100);
    });

    it("should support large delays", async () => {
      const plugin = retryPlugin({ retryDelay: 30000 });
      const context = createMockContext();
      const next = vi.fn().mockResolvedValue({ data: {}, status: 200 });

      await plugin.middleware!(context, next);

      expect(context.request.retryDelay).toBe(30000);
    });

    it("should allow per-request delay override", async () => {
      const plugin = retryPlugin({ retryDelay: 1000 });
      const context = createMockContext({
        pluginOptions: { retryDelay: 3000 },
      });
      const next = vi.fn().mockResolvedValue({ data: {}, status: 200 });

      await plugin.middleware!(context, next);

      expect(context.request.retryDelay).toBe(3000);
    });
  });

  describe("retries: false disables retries", () => {
    it("should set retries to false via plugin config", async () => {
      const plugin = retryPlugin({ retries: false });
      const context = createMockContext();
      const next = vi.fn().mockResolvedValue({ data: {}, status: 200 });

      await plugin.middleware!(context, next);

      expect(context.request.retries).toBe(false);
    });

    it("should set retries to false via request option", async () => {
      const plugin = retryPlugin({ retries: 5 });
      const context = createMockContext({
        pluginOptions: { retries: false },
      });
      const next = vi.fn().mockResolvedValue({ data: {}, status: 200 });

      await plugin.middleware!(context, next);

      expect(context.request.retries).toBe(false);
    });

    it("should still set retryDelay even when retries is false", async () => {
      const plugin = retryPlugin({ retries: false, retryDelay: 2000 });
      const context = createMockContext();
      const next = vi.fn().mockResolvedValue({ data: {}, status: 200 });

      await plugin.middleware!(context, next);

      expect(context.request.retries).toBe(false);
      expect(context.request.retryDelay).toBe(2000);
    });
  });

  describe("returns success without retry if first attempt succeeds", () => {
    it("should return success response immediately", async () => {
      const plugin = retryPlugin({ retries: 3, retryDelay: 1000 });
      const context = createMockContext();
      const successResponse = { data: { id: 1, name: "User" }, status: 200 };
      const next = vi.fn().mockResolvedValue(successResponse);

      const result = await plugin.middleware!(context, next);

      expect(next).toHaveBeenCalledTimes(1);
      expect(result).toEqual(successResponse);
    });

    it("should not delay on successful first attempt", async () => {
      const plugin = retryPlugin({ retries: 3, retryDelay: 5000 });
      const context = createMockContext();
      const next = vi.fn().mockResolvedValue({ data: {}, status: 200 });

      const startTime = Date.now();
      await plugin.middleware!(context, next);
      const elapsed = Date.now() - startTime;

      expect(elapsed).toBeLessThan(100);
    });

    it("should return 201 created response without retry", async () => {
      const plugin = retryPlugin({ retries: 3 });
      const context = createMockContext({
        operationType: "write",
        method: "POST",
      });
      const createdResponse = { data: { id: 1 }, status: 201 };
      const next = vi.fn().mockResolvedValue(createdResponse);

      const result = await plugin.middleware!(context, next);

      expect(next).toHaveBeenCalledTimes(1);
      expect(result).toEqual(createdResponse);
    });
  });

  describe("returns error after all retries exhausted", () => {
    it("should return error response from next", async () => {
      const plugin = retryPlugin({ retries: 3 });
      const context = createMockContext();
      const errorResponse = {
        error: { message: "Internal Server Error" },
        status: 500,
      };
      const next = vi.fn().mockResolvedValue(errorResponse);

      const result = await plugin.middleware!(context, next);

      expect(result).toEqual(errorResponse);
    });

    it("should propagate thrown errors from next", async () => {
      const plugin = retryPlugin({ retries: 3 });
      const context = createMockContext();
      const error = new Error("Connection refused");
      const next = vi.fn().mockRejectedValue(error);

      await expect(plugin.middleware!(context, next)).rejects.toThrow(error);
    });

    it("should return 4xx error responses", async () => {
      const plugin = retryPlugin({ retries: 3 });
      const context = createMockContext();
      const notFoundResponse = {
        error: { message: "Not found" },
        status: 404,
      };
      const next = vi.fn().mockResolvedValue(notFoundResponse);

      const result = await plugin.middleware!(context, next);

      expect(result).toEqual(notFoundResponse);
      expect(result.status).toBe(404);
    });

    it("should return 5xx error responses", async () => {
      const plugin = retryPlugin({ retries: 3 });
      const context = createMockContext();
      const serverErrorResponse = {
        error: { message: "Service unavailable" },
        status: 503,
      };
      const next = vi.fn().mockResolvedValue(serverErrorResponse);

      const result = await plugin.middleware!(context, next);

      expect(result).toEqual(serverErrorResponse);
      expect(result.status).toBe(503);
    });
  });

  describe("edge cases", () => {
    it("should handle undefined pluginOptions", async () => {
      const plugin = retryPlugin({ retries: 3, retryDelay: 1000 });
      const context = createMockContext({
        pluginOptions: undefined,
      });
      const next = vi.fn().mockResolvedValue({ data: {}, status: 200 });

      await plugin.middleware!(context, next);

      expect(context.request.retries).toBe(3);
      expect(context.request.retryDelay).toBe(1000);
    });

    it("should handle empty pluginOptions", async () => {
      const plugin = retryPlugin({ retries: 3, retryDelay: 1000 });
      const context = createMockContext({
        pluginOptions: {},
      });
      const next = vi.fn().mockResolvedValue({ data: {}, status: 200 });

      await plugin.middleware!(context, next);

      expect(context.request.retries).toBe(3);
      expect(context.request.retryDelay).toBe(1000);
    });

    it("should handle zero retryDelay", async () => {
      const plugin = retryPlugin({ retryDelay: 0 });
      const context = createMockContext();
      const next = vi.fn().mockResolvedValue({ data: {}, status: 200 });

      await plugin.middleware!(context, next);

      expect(context.request.retryDelay).toBe(0);
    });

    it("should handle both retries and retryDelay from config", async () => {
      const plugin = retryPlugin({ retries: 5, retryDelay: 2500 });
      const context = createMockContext();
      const next = vi.fn().mockResolvedValue({ data: {}, status: 200 });

      await plugin.middleware!(context, next);

      expect(context.request.retries).toBe(5);
      expect(context.request.retryDelay).toBe(2500);
    });

    it("should handle both retries and retryDelay from pluginOptions", async () => {
      const plugin = retryPlugin();
      const context = createMockContext({
        pluginOptions: { retries: 8, retryDelay: 3000 },
      });
      const next = vi.fn().mockResolvedValue({ data: {}, status: 200 });

      await plugin.middleware!(context, next);

      expect(context.request.retries).toBe(8);
      expect(context.request.retryDelay).toBe(3000);
    });

    it("should handle mixed config and pluginOptions", async () => {
      const plugin = retryPlugin({ retries: 3, retryDelay: 1000 });
      const context = createMockContext({
        pluginOptions: { retries: 10 },
      });
      const next = vi.fn().mockResolvedValue({ data: {}, status: 200 });

      await plugin.middleware!(context, next);

      expect(context.request.retries).toBe(10);
      expect(context.request.retryDelay).toBe(1000);
    });
  });
});
