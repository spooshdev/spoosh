import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { sse } from "./transport";

vi.mock("@microsoft/fetch-event-source", () => ({
  fetchEventSource: vi.fn(),
}));

import { fetchEventSource } from "@microsoft/fetch-event-source";

const mockSuccessfulConnection = () => {
  vi.mocked(fetchEventSource).mockImplementation(async (_url, options) => {
    if (options?.onopen) {
      await options.onopen({ ok: true, status: 200 } as Response);
    }
  });
};

describe("SSE Transport", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("initialization", () => {
    it("should create transport with default config", () => {
      const transport = sse();

      expect(transport.name).toBe("sse");
      expect(transport.operationType).toBe("sse");
      expect(transport.isConnected()).toBe(false);
    });

    it("should accept custom retry config", () => {
      const transport = sse({ maxRetries: 5, retryDelay: 2000 });

      expect(transport).toBeDefined();
    });
  });

  describe("connection management", () => {
    it("should connect to SSE endpoint", async () => {
      const transport = sse();

      mockSuccessfulConnection();

      await transport.connect("messages", {
        baseUrl: "/api",
        path: "sse/messages",
      });

      expect(fetchEventSource).toHaveBeenCalledWith(
        "/api/sse/messages",
        expect.objectContaining({
          method: "GET",
          headers: expect.any(Object),
        })
      );
    });

    it("should handle query parameters", async () => {
      const transport = sse();

      mockSuccessfulConnection();

      await transport.connect("messages", {
        baseUrl: "/api",
        path: "sse/messages",
        query: { filter: "active", limit: "10" },
      });

      expect(fetchEventSource).toHaveBeenCalledWith(
        expect.stringContaining("filter=active"),
        expect.any(Object)
      );
      expect(fetchEventSource).toHaveBeenCalledWith(
        expect.stringContaining("limit=10"),
        expect.any(Object)
      );
    });

    it("should handle POST method with body", async () => {
      const transport = sse();

      mockSuccessfulConnection();

      await transport.connect("messages", {
        baseUrl: "/api",
        path: "sse/messages",
        method: "POST",
        body: { filter: "active" },
      });

      expect(fetchEventSource).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          method: "POST",
          body: '{"filter":"active"}',
          headers: expect.objectContaining({
            "Content-Type": "application/json",
          }),
        })
      );
    });

    it("should merge global and request-level headers", async () => {
      const transport = sse();

      mockSuccessfulConnection();

      await transport.connect("messages", {
        baseUrl: "/api",
        path: "sse/messages",
        globalHeaders: { Authorization: "Bearer token" },
        headers: { "X-Custom": "value" },
      });

      expect(fetchEventSource).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: "Bearer token",
            "X-Custom": "value",
          }),
        })
      );
    });

    it("should not create duplicate connections", async () => {
      const transport = sse();

      mockSuccessfulConnection();

      await transport.connect("messages", {
        baseUrl: "/api",
        path: "sse/messages",
      });

      await transport.connect("messages", {
        baseUrl: "/api",
        path: "sse/messages",
      });

      expect(fetchEventSource).toHaveBeenCalledTimes(1);
    });

    it("should disconnect and cleanup", async () => {
      const transport = sse();

      mockSuccessfulConnection();

      await transport.connect("messages", {
        baseUrl: "/api",
        path: "sse/messages",
      });

      await transport.disconnect();

      expect(transport.isConnected()).toBe(false);
    });
  });

  describe("subscription management", () => {
    it("should subscribe to specific event", async () => {
      const transport = sse();

      const callback = vi.fn();
      const unsubscribe = transport.subscribe("message", callback);

      expect(unsubscribe).toBeTypeOf("function");
    });

    it("should subscribe to wildcard events", async () => {
      const transport = sse();

      const callback = vi.fn();
      const unsubscribe = transport.subscribe("*", callback);

      expect(unsubscribe).toBeTypeOf("function");
    });

    it("should unsubscribe from events", async () => {
      const transport = sse();

      const callback = vi.fn();
      const unsubscribe = transport.subscribe("message", callback);

      unsubscribe();

      expect(callback).not.toHaveBeenCalled();
    });

    it("should support multiple subscribers for same event", async () => {
      const transport = sse();

      const callback1 = vi.fn();
      const callback2 = vi.fn();

      transport.subscribe("message", callback1);
      transport.subscribe("message", callback2);

      expect(transport).toBeDefined();
    });
  });

  describe("message handling", () => {
    it("should handle credentials option", async () => {
      const transport = sse();

      mockSuccessfulConnection();

      await transport.connect("messages", {
        baseUrl: "/api",
        path: "sse/messages",
        credentials: "include",
      });

      expect(fetchEventSource).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          credentials: "include",
        })
      );
    });
  });

  describe("send", () => {
    it("should not implement send (SSE is unidirectional)", async () => {
      const transport = sse();

      await expect(
        transport.send("messages", {
          event: "message",
          data: "hello",
          timestamp: Date.now(),
        })
      ).rejects.toThrow("SSE is unidirectional");
    });
  });

  describe("error handling", () => {
    it("should handle connection errors with retry", async () => {
      const transport = sse();

      vi.mocked(fetchEventSource).mockRejectedValueOnce(
        new Error("Connection failed")
      );

      await expect(
        transport.connect("messages", {
          baseUrl: "/api",
          path: "sse/messages",
          maxRetries: 1,
        })
      ).rejects.toThrow();
    });

    it("should call onError with server response for HTTP error responses", async () => {
      const transport = sse();
      const serverError = { error: "Unauthorized", code: "AUTH_REQUIRED" };

      vi.mocked(fetchEventSource).mockImplementation(async (_url, options) => {
        if (options?.onopen) {
          const mockResponse = {
            ok: false,
            status: 401,
            statusText: "Unauthorized",
            headers: new Headers({ "content-type": "application/json" }),
            json: async () => serverError,
          } as Response;
          await options.onopen(mockResponse);
        }
      });

      const adapter = transport.createSubscriptionAdapter({
        channel: "messages",
        method: "GET",
        baseUrl: "/api",
        getRequestOptions: () => ({}),
      });

      const onError = vi.fn();
      const onData = vi.fn();

      const handle = await adapter.subscribe({
        channel: "messages",
        queryKey: "test-key",
        onData,
        onError,
        onDisconnect: vi.fn(),
      } as never);

      expect(onError).toHaveBeenCalledWith(serverError);
      expect(handle.getError()).toEqual(serverError);
    });

    it("should not throw when subscription adapter encounters HTTP error", async () => {
      const transport = sse();

      vi.mocked(fetchEventSource).mockImplementation(async (_url, options) => {
        if (options?.onopen) {
          const mockResponse = {
            ok: false,
            status: 500,
            statusText: "Internal Server Error",
            headers: new Headers({ "content-type": "text/plain" }),
            text: async () => "Server Error",
          } as Response;
          await options.onopen(mockResponse);
        }
      });

      const adapter = transport.createSubscriptionAdapter({
        channel: "messages",
        method: "GET",
        baseUrl: "/api",
        getRequestOptions: () => ({}),
      });

      await expect(
        adapter.subscribe({
          channel: "messages",
          queryKey: "test-key",
          onData: vi.fn(),
          onError: vi.fn(),
          onDisconnect: vi.fn(),
        } as never)
      ).resolves.toBeDefined();
    });

    it("should emit error devtool event on connection failure", async () => {
      const transport = sse();
      const eventEmitter = {
        emit: vi.fn(),
      };
      const serverError = { message: "Forbidden", code: 403 };

      vi.mocked(fetchEventSource).mockImplementation(async (_url, options) => {
        if (options?.onopen) {
          const mockResponse = {
            ok: false,
            status: 403,
            statusText: "Forbidden",
            headers: new Headers({ "content-type": "application/json" }),
            json: async () => serverError,
          } as Response;
          await options.onopen(mockResponse);
        }
      });

      const adapter = transport.createSubscriptionAdapter({
        channel: "messages",
        method: "GET",
        baseUrl: "/api",
        getRequestOptions: () => ({}),
        eventEmitter: eventEmitter as never,
      });

      await adapter.subscribe({
        channel: "messages",
        queryKey: "test-key",
        onData: vi.fn(),
        onError: vi.fn(),
        onDisconnect: vi.fn(),
      } as never);

      expect(eventEmitter.emit).toHaveBeenCalledWith(
        "spoosh:subscription:error",
        expect.objectContaining({
          error: expect.any(Error),
        })
      );

      expect(eventEmitter.emit).toHaveBeenCalledWith(
        "spoosh:subscription:disconnect",
        expect.objectContaining({
          reason: "connection_error",
        })
      );
    });
  });

  describe("retry configuration", () => {
    it("should use transport-level retry config", async () => {
      const transport = sse({ maxRetries: 5, retryDelay: 2000 });

      mockSuccessfulConnection();

      await transport.connect("messages", {
        baseUrl: "/api",
        path: "sse/messages",
      });

      expect(transport).toBeDefined();
    });

    it("should use request-level retry config override", async () => {
      const transport = sse({ maxRetries: 3, retryDelay: 1000 });

      mockSuccessfulConnection();

      await transport.connect("messages", {
        baseUrl: "/api",
        path: "sse/messages",
        maxRetries: 5,
        retryDelay: 2000,
      });

      expect(transport).toBeDefined();
    });
  });

  describe("headers resolution", () => {
    it("should resolve function headers", async () => {
      const transport = sse();

      mockSuccessfulConnection();

      await transport.connect("messages", {
        baseUrl: "/api",
        path: "sse/messages",
        headers: () => ({ "X-Dynamic": "value" }),
      });

      expect(fetchEventSource).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            "X-Dynamic": "value",
          }),
        })
      );
    });

    it("should resolve async function headers", async () => {
      const transport = sse();

      mockSuccessfulConnection();

      await transport.connect("messages", {
        baseUrl: "/api",
        path: "sse/messages",
        headers: async () => ({ "X-Async": "value" }),
      });

      expect(fetchEventSource).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            "X-Async": "value",
          }),
        })
      );
    });

    it("should resolve Headers instance", async () => {
      const transport = sse();

      mockSuccessfulConnection();

      const headers = new Headers();
      headers.set("X-Headers", "value");

      await transport.connect("messages", {
        baseUrl: "/api",
        path: "sse/messages",
        headers,
      });

      expect(fetchEventSource).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            "x-headers": "value",
          }),
        })
      );
    });

    it("should resolve headers array", async () => {
      const transport = sse();

      mockSuccessfulConnection();

      await transport.connect("messages", {
        baseUrl: "/api",
        path: "sse/messages",
        headers: [["X-Array", "value"]],
      });

      expect(fetchEventSource).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            "X-Array": "value",
          }),
        })
      );
    });
  });
});
