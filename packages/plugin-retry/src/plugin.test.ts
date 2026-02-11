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

  describe("successful requests", () => {
    it("should return response immediately on first success", async () => {
      const plugin = retryPlugin({ retries: 3 });
      const context = createMockContext();
      const successResponse = { data: { id: 1 }, status: 200 };
      const next = vi.fn().mockResolvedValue(successResponse);

      const result = await plugin.middleware!(context, next);

      expect(next).toHaveBeenCalledTimes(1);
      expect(result).toEqual(successResponse);
    });

    it("should not retry on successful response", async () => {
      const plugin = retryPlugin({ retries: 5 });
      const context = createMockContext();
      const next = vi.fn().mockResolvedValue({ data: {}, status: 200 });

      await plugin.middleware!(context, next);

      expect(next).toHaveBeenCalledTimes(1);
    });
  });

  describe("HTTP error responses (4xx, 5xx)", () => {
    it("should not retry on 404 error response", async () => {
      const plugin = retryPlugin({ retries: 3 });
      const context = createMockContext();
      const errorResponse = { error: { message: "Not found" }, status: 404 };
      const next = vi.fn().mockResolvedValue(errorResponse);

      const result = await plugin.middleware!(context, next);

      expect(next).toHaveBeenCalledTimes(1);
      expect(result).toEqual(errorResponse);
    });

    it("should retry on 500 error response by default", async () => {
      const plugin = retryPlugin({ retries: 3, retryDelay: 1000 });
      const context = createMockContext();
      const errorResponse = {
        error: { message: "Server error" },
        status: 500,
      };
      const successResponse = { data: { id: 1 }, status: 200 };

      const next = vi
        .fn()
        .mockResolvedValueOnce(errorResponse)
        .mockResolvedValueOnce(successResponse);

      const resultPromise = plugin.middleware!(context, next);

      await vi.advanceTimersByTimeAsync(1000);

      const result = await resultPromise;

      expect(next).toHaveBeenCalledTimes(2);
      expect(result).toEqual(successResponse);
    });

    it("should retry on all default retry status codes (408, 429, 500, 502, 503, 504)", async () => {
      const retryCodes = [408, 429, 500, 502, 503, 504];

      for (const statusCode of retryCodes) {
        const plugin = retryPlugin({ retries: 1, retryDelay: 100 });
        const context = createMockContext();
        const errorResponse = { error: { message: "Error" }, status: statusCode };
        const successResponse = { data: {}, status: 200 };

        const next = vi
          .fn()
          .mockResolvedValueOnce(errorResponse)
          .mockResolvedValueOnce(successResponse);

        const resultPromise = plugin.middleware!(context, next);

        await vi.advanceTimersByTimeAsync(100);

        const result = await resultPromise;

        expect(next).toHaveBeenCalledTimes(2);
        expect(result).toEqual(successResponse);
      }
    });

    it("should not retry on 400 error response", async () => {
      const plugin = retryPlugin({ retries: 3 });
      const context = createMockContext();
      const errorResponse = { error: { message: "Bad request" }, status: 400 };
      const next = vi.fn().mockResolvedValue(errorResponse);

      const result = await plugin.middleware!(context, next);

      expect(next).toHaveBeenCalledTimes(1);
      expect(result).toEqual(errorResponse);
    });

    it("should return error response immediately without delay for non-retryable status", async () => {
      const plugin = retryPlugin({ retries: 3, retryDelay: 5000 });
      const context = createMockContext();
      const errorResponse = { error: { message: "Bad request" }, status: 400 };
      const next = vi.fn().mockResolvedValue(errorResponse);

      await plugin.middleware!(context, next);

      expect(vi.getTimerCount()).toBe(0);
    });
  });

  describe("shouldRetry callback", () => {
    it("should use custom shouldRetry callback", async () => {
      const shouldRetry = vi.fn().mockReturnValue(true);
      const plugin = retryPlugin({ retries: 2, retryDelay: 100, shouldRetry });
      const context = createMockContext();
      const errorResponse = { error: { message: "Custom error" }, status: 418 };
      const successResponse = { data: {}, status: 200 };

      const next = vi
        .fn()
        .mockResolvedValueOnce(errorResponse)
        .mockResolvedValueOnce(successResponse);

      const resultPromise = plugin.middleware!(context, next);

      await vi.advanceTimersByTimeAsync(100);

      const result = await resultPromise;

      expect(shouldRetry).toHaveBeenCalledWith({
        status: 418,
        error: { message: "Custom error" },
        attempt: 0,
        maxRetries: 2,
      });
      expect(next).toHaveBeenCalledTimes(2);
      expect(result).toEqual(successResponse);
    });

    it("should disable status code retries with shouldRetry returning false", async () => {
      const shouldRetry = vi.fn().mockReturnValue(false);
      const plugin = retryPlugin({ retries: 3, shouldRetry });
      const context = createMockContext();
      const errorResponse = { error: { message: "Server error" }, status: 500 };
      const next = vi.fn().mockResolvedValue(errorResponse);

      const result = await plugin.middleware!(context, next);

      expect(next).toHaveBeenCalledTimes(1);
      expect(result).toEqual(errorResponse);
    });

    it("should override plugin shouldRetry with per-request option", async () => {
      const pluginShouldRetry = vi.fn().mockReturnValue(true);
      const requestShouldRetry = vi.fn().mockReturnValue(false);

      const plugin = retryPlugin({ retries: 3, shouldRetry: pluginShouldRetry });
      const context = createMockContext({
        pluginOptions: { shouldRetry: requestShouldRetry },
      });
      const errorResponse = { error: { message: "Error" }, status: 500 };
      const next = vi.fn().mockResolvedValue(errorResponse);

      const result = await plugin.middleware!(context, next);

      expect(pluginShouldRetry).not.toHaveBeenCalled();
      expect(requestShouldRetry).toHaveBeenCalled();
      expect(next).toHaveBeenCalledTimes(1);
      expect(result).toEqual(errorResponse);
    });

    it("should always retry network errors regardless of shouldRetry", async () => {
      const shouldRetry = vi.fn().mockReturnValue(false);
      const plugin = retryPlugin({ retries: 2, retryDelay: 100, shouldRetry });
      const context = createMockContext();
      const networkError = new TypeError("Failed to fetch");
      const successResponse = { data: {}, status: 200 };

      const next = vi
        .fn()
        .mockResolvedValueOnce({ error: networkError, status: 0 })
        .mockResolvedValueOnce(successResponse);

      const resultPromise = plugin.middleware!(context, next);

      await vi.advanceTimersByTimeAsync(100);

      const result = await resultPromise;

      expect(shouldRetry).not.toHaveBeenCalled();
      expect(next).toHaveBeenCalledTimes(2);
      expect(result).toEqual(successResponse);
    });
  });

  describe("network errors (TypeError)", () => {
    it("should retry on network error", async () => {
      const plugin = retryPlugin({ retries: 3, retryDelay: 1000 });
      const context = createMockContext();
      const networkError = new TypeError("Failed to fetch");
      const successResponse = { data: { id: 1 }, status: 200 };

      const next = vi
        .fn()
        .mockResolvedValueOnce({ error: networkError, status: 0 })
        .mockResolvedValueOnce({ error: networkError, status: 0 })
        .mockResolvedValueOnce(successResponse);

      const resultPromise = plugin.middleware!(context, next);

      await vi.advanceTimersByTimeAsync(1000);
      await vi.advanceTimersByTimeAsync(2000);

      const result = await resultPromise;

      expect(next).toHaveBeenCalledTimes(3);
      expect(result).toEqual(successResponse);
    });

    it("should use exponential backoff (1s, 2s, 4s)", async () => {
      const plugin = retryPlugin({ retries: 3, retryDelay: 1000 });
      const context = createMockContext();
      const networkError = new TypeError("Failed to fetch");

      const next = vi
        .fn()
        .mockResolvedValue({ error: networkError, status: 0 });

      const resultPromise = plugin.middleware!(context, next);

      await vi.advanceTimersByTimeAsync(1000);
      expect(next).toHaveBeenCalledTimes(2);

      await vi.advanceTimersByTimeAsync(2000);
      expect(next).toHaveBeenCalledTimes(3);

      await vi.advanceTimersByTimeAsync(4000);
      expect(next).toHaveBeenCalledTimes(4);

      const result = await resultPromise;

      expect(result).toEqual({ error: networkError, status: 0 });
    });

    it("should return error after max retries exhausted", async () => {
      const plugin = retryPlugin({ retries: 2, retryDelay: 1000 });
      const context = createMockContext();
      const networkError = new TypeError("Failed to fetch");
      const next = vi
        .fn()
        .mockResolvedValue({ error: networkError, status: 0 });

      const resultPromise = plugin.middleware!(context, next);

      await vi.advanceTimersByTimeAsync(1000);
      await vi.advanceTimersByTimeAsync(2000);

      const result = await resultPromise;

      expect(next).toHaveBeenCalledTimes(3);
      expect(result).toEqual({ error: networkError, status: 0 });
    });

    it("should succeed after N retries", async () => {
      const plugin = retryPlugin({ retries: 5, retryDelay: 1000 });
      const context = createMockContext();
      const networkError = new TypeError("Failed to fetch");
      const successResponse = { data: { id: 1 }, status: 200 };

      const next = vi
        .fn()
        .mockResolvedValueOnce({ error: networkError, status: 0 })
        .mockResolvedValueOnce({ error: networkError, status: 0 })
        .mockResolvedValueOnce({ error: networkError, status: 0 })
        .mockResolvedValueOnce({ error: networkError, status: 0 })
        .mockResolvedValueOnce(successResponse);

      const resultPromise = plugin.middleware!(context, next);

      await vi.advanceTimersByTimeAsync(1000);
      await vi.advanceTimersByTimeAsync(2000);
      await vi.advanceTimersByTimeAsync(4000);
      await vi.advanceTimersByTimeAsync(8000);

      const result = await resultPromise;

      expect(next).toHaveBeenCalledTimes(5);
      expect(result).toEqual(successResponse);
    });
  });

  describe("abort errors", () => {
    it("should not retry on abort error", async () => {
      const plugin = retryPlugin({ retries: 3 });
      const context = createMockContext();
      const abortError = new DOMException("Aborted", "AbortError");
      const next = vi
        .fn()
        .mockResolvedValue({ error: abortError, status: 0, aborted: true });

      const result = await plugin.middleware!(context, next);

      expect(next).toHaveBeenCalledTimes(1);
      expect(result).toEqual({ error: abortError, status: 0, aborted: true });
    });

    it("should return abort error immediately without delay", async () => {
      const plugin = retryPlugin({ retries: 3, retryDelay: 5000 });
      const context = createMockContext();
      const abortError = new DOMException("Aborted", "AbortError");
      const next = vi
        .fn()
        .mockResolvedValue({ error: abortError, status: 0, aborted: true });

      await plugin.middleware!(context, next);

      expect(vi.getTimerCount()).toBe(0);
    });
  });

  describe("retries: false configuration", () => {
    it("should disable retries with plugin config", async () => {
      const plugin = retryPlugin({ retries: false });
      const context = createMockContext();
      const networkError = new TypeError("Failed to fetch");
      const next = vi
        .fn()
        .mockResolvedValue({ error: networkError, status: 0 });

      const result = await plugin.middleware!(context, next);

      expect(next).toHaveBeenCalledTimes(1);
      expect(result).toEqual({ error: networkError, status: 0 });
    });

    it("should disable retries with per-request option", async () => {
      const plugin = retryPlugin({ retries: 5 });
      const context = createMockContext({
        pluginOptions: { retries: false },
      });
      const networkError = new TypeError("Failed to fetch");
      const next = vi
        .fn()
        .mockResolvedValue({ error: networkError, status: 0 });

      const result = await plugin.middleware!(context, next);

      expect(next).toHaveBeenCalledTimes(1);
      expect(result).toEqual({ error: networkError, status: 0 });
    });
  });

  describe("retries: 0 configuration", () => {
    it("should not retry when retries is 0", async () => {
      const plugin = retryPlugin({ retries: 0 });
      const context = createMockContext();
      const networkError = new TypeError("Failed to fetch");
      const next = vi
        .fn()
        .mockResolvedValue({ error: networkError, status: 0 });

      const result = await plugin.middleware!(context, next);

      expect(next).toHaveBeenCalledTimes(1);
      expect(result).toEqual({ error: networkError, status: 0 });
    });
  });

  describe("per-request overrides", () => {
    it("should override retries count", async () => {
      const plugin = retryPlugin({ retries: 3, retryDelay: 1000 });
      const context = createMockContext({
        pluginOptions: { retries: 1 },
      });
      const networkError = new TypeError("Failed to fetch");
      const next = vi
        .fn()
        .mockResolvedValue({ error: networkError, status: 0 });

      const resultPromise = plugin.middleware!(context, next);

      await vi.advanceTimersByTimeAsync(1000);

      const result = await resultPromise;

      expect(next).toHaveBeenCalledTimes(2);
      expect(result).toEqual({ error: networkError, status: 0 });
    });

    it("should override retryDelay", async () => {
      const plugin = retryPlugin({ retries: 3, retryDelay: 1000 });
      const context = createMockContext({
        pluginOptions: { retryDelay: 500 },
      });
      const networkError = new TypeError("Failed to fetch");
      const successResponse = { data: { id: 1 }, status: 200 };

      const next = vi
        .fn()
        .mockResolvedValueOnce({ error: networkError, status: 0 })
        .mockResolvedValueOnce({ error: networkError, status: 0 })
        .mockResolvedValueOnce(successResponse);

      const resultPromise = plugin.middleware!(context, next);

      await vi.advanceTimersByTimeAsync(500);
      await vi.advanceTimersByTimeAsync(1000);

      const result = await resultPromise;

      expect(result).toEqual(successResponse);
    });

    it("should override both retries and retryDelay", async () => {
      const plugin = retryPlugin({ retries: 5, retryDelay: 2000 });
      const context = createMockContext({
        pluginOptions: { retries: 2, retryDelay: 100 },
      });
      const networkError = new TypeError("Failed to fetch");
      const next = vi
        .fn()
        .mockResolvedValue({ error: networkError, status: 0 });

      const resultPromise = plugin.middleware!(context, next);

      await vi.advanceTimersByTimeAsync(100);
      expect(next).toHaveBeenCalledTimes(2);

      await vi.advanceTimersByTimeAsync(200);
      expect(next).toHaveBeenCalledTimes(3);

      const result = await resultPromise;

      expect(result).toEqual({ error: networkError, status: 0 });
    });
  });

  describe("different operation types", () => {
    it("should retry write operations", async () => {
      const plugin = retryPlugin({ retries: 2, retryDelay: 1000 });
      const context = createMockContext({
        operationType: "write",
        method: "POST",
      });
      const networkError = new TypeError("Failed to fetch");
      const successResponse = { data: { id: 1 }, status: 201 };

      const next = vi
        .fn()
        .mockResolvedValueOnce({ error: networkError, status: 0 })
        .mockResolvedValueOnce(successResponse);

      const resultPromise = plugin.middleware!(context, next);

      await vi.advanceTimersByTimeAsync(1000);

      const result = await resultPromise;

      expect(next).toHaveBeenCalledTimes(2);
      expect(result).toEqual(successResponse);
    });

    it("should retry infiniteRead operations", async () => {
      const plugin = retryPlugin({ retries: 2, retryDelay: 1000 });
      const context = createMockContext({
        operationType: "infiniteRead",
      });
      const networkError = new TypeError("Failed to fetch");
      const successResponse = { data: { items: [] }, status: 200 };

      const next = vi
        .fn()
        .mockResolvedValueOnce({ error: networkError, status: 0 })
        .mockResolvedValueOnce(successResponse);

      const resultPromise = plugin.middleware!(context, next);

      await vi.advanceTimersByTimeAsync(1000);

      const result = await resultPromise;

      expect(next).toHaveBeenCalledTimes(2);
      expect(result).toEqual(successResponse);
    });
  });

  describe("custom retry delay", () => {
    it("should use custom base delay", async () => {
      const plugin = retryPlugin({ retries: 2, retryDelay: 500 });
      const context = createMockContext();
      const networkError = new TypeError("Failed to fetch");
      const next = vi
        .fn()
        .mockResolvedValue({ error: networkError, status: 0 });

      const resultPromise = plugin.middleware!(context, next);

      await vi.advanceTimersByTimeAsync(500);
      expect(next).toHaveBeenCalledTimes(2);

      await vi.advanceTimersByTimeAsync(1000);
      expect(next).toHaveBeenCalledTimes(3);

      await resultPromise;
    });

    it("should handle zero delay", async () => {
      const plugin = retryPlugin({ retries: 2, retryDelay: 0 });
      const context = createMockContext();
      const networkError = new TypeError("Failed to fetch");
      const next = vi
        .fn()
        .mockResolvedValue({ error: networkError, status: 0 });

      const resultPromise = plugin.middleware!(context, next);

      await vi.runAllTimersAsync();

      await resultPromise;

      expect(next).toHaveBeenCalledTimes(3);
    });
  });

  describe("non-network errors", () => {
    it("should not retry on generic Error", async () => {
      const plugin = retryPlugin({ retries: 3 });
      const context = createMockContext();
      const genericError = new Error("Something went wrong");
      const next = vi
        .fn()
        .mockResolvedValue({ error: genericError, status: 0 });

      const result = await plugin.middleware!(context, next);

      expect(next).toHaveBeenCalledTimes(1);
      expect(result).toEqual({ error: genericError, status: 0 });
    });

    it("should not retry on RangeError", async () => {
      const plugin = retryPlugin({ retries: 3 });
      const context = createMockContext();
      const rangeError = new RangeError("Invalid value");
      const next = vi.fn().mockResolvedValue({ error: rangeError, status: 0 });

      const result = await plugin.middleware!(context, next);

      expect(next).toHaveBeenCalledTimes(1);
      expect(result).toEqual({ error: rangeError, status: 0 });
    });
  });

  describe("edge cases", () => {
    it("should handle undefined pluginOptions", async () => {
      const plugin = retryPlugin({ retries: 3 });
      const context = createMockContext({
        pluginOptions: undefined,
      });
      const successResponse = { data: {}, status: 200 };
      const next = vi.fn().mockResolvedValue(successResponse);

      const result = await plugin.middleware!(context, next);

      expect(result).toEqual(successResponse);
    });

    it("should handle empty pluginOptions", async () => {
      const plugin = retryPlugin({ retries: 3 });
      const context = createMockContext({
        pluginOptions: {},
      });
      const successResponse = { data: {}, status: 200 };
      const next = vi.fn().mockResolvedValue(successResponse);

      const result = await plugin.middleware!(context, next);

      expect(result).toEqual(successResponse);
    });

    it("should handle multiple concurrent retries independently", async () => {
      const plugin = retryPlugin({ retries: 2, retryDelay: 1000 });

      const context1 = createMockContext();
      const next1 = vi
        .fn()
        .mockResolvedValueOnce({
          error: new TypeError("Network error 1"),
          status: 0,
        })
        .mockResolvedValueOnce({ data: { id: 1 }, status: 200 });

      const context2 = createMockContext();
      const next2 = vi
        .fn()
        .mockResolvedValueOnce({
          error: new TypeError("Network error 2"),
          status: 0,
        })
        .mockResolvedValueOnce({ data: { id: 2 }, status: 200 });

      const promise1 = plugin.middleware!(context1, next1);
      const promise2 = plugin.middleware!(context2, next2);

      await vi.advanceTimersByTimeAsync(1000);

      const [result1, result2] = await Promise.all([promise1, promise2]);

      expect(next1).toHaveBeenCalledTimes(2);
      expect(next2).toHaveBeenCalledTimes(2);
      expect(result1).toEqual({ data: { id: 1 }, status: 200 });
      expect(result2).toEqual({ data: { id: 2 }, status: 200 });
    });
  });
});
