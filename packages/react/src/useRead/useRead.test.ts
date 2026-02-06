/**
 * @vitest-environment jsdom
 */
import { renderHook, act, waitFor } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";
import { createStateManager, createEventEmitter } from "@spoosh/test-utils";
import { createPluginExecutor } from "@spoosh/core";
import { createUseRead } from "./index";

type MockApiResponse = { data?: unknown; error?: unknown; status: number };

function createMockApi() {
  const calls: Array<{ path: string; method: string; options: unknown }> = [];
  let mockResponse: MockApiResponse = {
    data: { id: 1, name: "Test" },
    status: 200,
  };
  let responseDelay = 0;
  let abortController: AbortController | null = null;

  const setMockResponse = (response: MockApiResponse) => {
    mockResponse = response;
  };

  const setResponseDelay = (delay: number) => {
    responseDelay = delay;
  };

  const api = (path: string) => ({
    GET: (opts?: unknown) => {
      calls.push({ path, method: "GET", options: opts });
      abortController = new AbortController();
      const currentAbortController = abortController;

      return new Promise((resolve, reject) => {
        const timeoutId = setTimeout(() => {
          resolve(mockResponse);
        }, responseDelay);

        currentAbortController.signal.addEventListener("abort", () => {
          clearTimeout(timeoutId);
          reject(new DOMException("Aborted", "AbortError"));
        });
      });
    },
  });

  const abortCurrentRequest = () => {
    abortController?.abort();
  };

  return { api, calls, setMockResponse, setResponseDelay, abortCurrentRequest };
}

function createTestHooks() {
  const stateManager = createStateManager();
  const eventEmitter = createEventEmitter();
  const pluginExecutor = createPluginExecutor([]);
  const { api, calls, setMockResponse, setResponseDelay, abortCurrentRequest } =
    createMockApi();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const useRead = createUseRead<any, unknown, []>({
    api,
    stateManager,
    eventEmitter,
    pluginExecutor,
  });

  return {
    useRead,
    stateManager,
    eventEmitter,
    calls,
    setMockResponse,
    setResponseDelay,
    abortCurrentRequest,
  };
}

describe("useRead", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Basic Functionality", () => {
    it("returns data, loading, error states", async () => {
      const { useRead } = createTestHooks();

      const { result } = renderHook(() => useRead((api) => api("posts").GET()));

      expect(result.current).toHaveProperty("data");
      expect(result.current).toHaveProperty("loading");
      expect(result.current).toHaveProperty("error");
      expect(result.current).toHaveProperty("fetching");
      expect(result.current).toHaveProperty("trigger");
      expect(result.current).toHaveProperty("abort");
      expect(result.current).toHaveProperty("meta");

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });
    });

    it("fetches on mount when enabled", async () => {
      const { useRead, calls } = createTestHooks();

      renderHook(() => useRead((api) => api("posts").GET()));

      await waitFor(() => {
        expect(calls.length).toBe(1);
      });

      expect(calls[0]!.path).toBe("posts");
      expect(calls[0]!.method).toBe("GET");
    });

    it("does not fetch when enabled=false", async () => {
      const { useRead, calls } = createTestHooks();

      renderHook(() =>
        useRead((api) => api("posts").GET(), { enabled: false })
      );

      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(calls.length).toBe(0);
    });

    it("returns correct initial loading state", () => {
      const { useRead } = createTestHooks();

      const { result } = renderHook(() => useRead((api) => api("posts").GET()));

      expect(result.current.loading).toBe(true);
      expect(result.current.fetching).toBe(true);
      expect(result.current.data).toBeUndefined();
    });
  });

  describe("Trigger Function", () => {
    it("manual trigger refetches data", async () => {
      const { useRead, calls, setMockResponse } = createTestHooks();

      const { result } = renderHook(() => useRead((api) => api("posts").GET()));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(calls.length).toBe(1);

      setMockResponse({ data: { id: 2, name: "Updated" }, status: 200 });

      await act(async () => {
        await result.current.trigger();
      });

      expect(calls.length).toBe(2);
    });

    it("trigger with force=true bypasses cache", async () => {
      const { useRead, calls } = createTestHooks();

      const { result } = renderHook(() => useRead((api) => api("posts").GET()));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const initialCallCount = calls.length;

      await act(async () => {
        await result.current.trigger({ force: true });
      });

      expect(calls.length).toBeGreaterThan(initialCallCount);
    });

    it("trigger with override options works", async () => {
      const { useRead, calls } = createTestHooks();

      const { result } = renderHook(() =>
        useRead((api) => api("posts").GET({ query: { page: 1 } }))
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await act(async () => {
        await result.current.trigger({ query: { page: 2 } });
      });

      const lastCall = calls[calls.length - 1];
      expect(lastCall!.options).toMatchObject({ query: { page: 2 } });
    });
  });

  describe("Abort", () => {
    it("abort is callable and does not throw", async () => {
      const { useRead } = createTestHooks();

      const { result } = renderHook(() => useRead((api) => api("posts").GET()));

      expect(result.current.fetching).toBe(true);

      expect(() => {
        act(() => {
          result.current.abort();
        });
      }).not.toThrow();

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });
    });

    it("abort function is stable reference", async () => {
      const { useRead, setMockResponse } = createTestHooks();

      const { result, rerender } = renderHook(() =>
        useRead((api) => api("posts").GET())
      );

      const initialAbort = result.current.abort;

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      setMockResponse({ data: { id: 2 }, status: 200 });
      rerender();

      expect(result.current.abort).toBe(initialAbort);
    });
  });

  describe("Cache Behavior", () => {
    it("returns cached data immediately", async () => {
      const { useRead, stateManager } = createTestHooks();

      const queryKey = stateManager.createQueryKey({
        path: "posts",
        method: "GET",
        options: undefined,
      });

      stateManager.setCache(queryKey, {
        state: {
          data: { id: 99, name: "Cached" },
          error: undefined,
          timestamp: Date.now(),
        },
        meta: new Map(),
      });

      const { result } = renderHook(() => useRead((api) => api("posts").GET()));

      expect(result.current.data).toEqual({ id: 99, name: "Cached" });
      expect(result.current.loading).toBe(false);
    });

    it("loading vs fetching states correct", async () => {
      const { useRead, stateManager, setResponseDelay } = createTestHooks();
      setResponseDelay(100);

      const queryKey = stateManager.createQueryKey({
        path: "posts",
        method: "GET",
        options: undefined,
      });

      stateManager.setCache(queryKey, {
        state: {
          data: { cached: true },
          error: undefined,
          timestamp: Date.now(),
        },
        meta: new Map(),
      });

      const { result } = renderHook(() => useRead((api) => api("posts").GET()));

      expect(result.current.loading).toBe(false);
      expect(result.current.fetching).toBe(true);
      expect(result.current.data).toEqual({ cached: true });

      await waitFor(() => {
        expect(result.current.fetching).toBe(false);
      });
    });
  });

  describe("Event Handling", () => {
    it("responds to refetch events", async () => {
      const { useRead, eventEmitter, calls, stateManager } = createTestHooks();

      const { result } = renderHook(() => useRead((api) => api("posts").GET()));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const initialCallCount = calls.length;

      const queryKey = stateManager.createQueryKey({
        path: "posts",
        method: "GET",
        options: undefined,
      });

      act(() => {
        eventEmitter.emit("refetch", { queryKey, reason: "invalidate" });
      });

      await waitFor(() => {
        expect(calls.length).toBeGreaterThan(initialCallCount);
      });
    });

    it("responds to invalidate events for matching tags", async () => {
      const { useRead, eventEmitter, calls } = createTestHooks();

      const { result } = renderHook(() =>
        useRead((api) => api("posts").GET(), { tags: ["posts"] })
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const initialCallCount = calls.length;

      act(() => {
        eventEmitter.emit("invalidate", ["posts"]);
      });

      await waitFor(() => {
        expect(calls.length).toBeGreaterThan(initialCallCount);
      });
    });

    it("responds to refetchAll events", async () => {
      const { useRead, eventEmitter, calls } = createTestHooks();

      const { result } = renderHook(() => useRead((api) => api("posts").GET()));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const initialCallCount = calls.length;

      act(() => {
        eventEmitter.emit("refetchAll", undefined);
      });

      await waitFor(() => {
        expect(calls.length).toBeGreaterThan(initialCallCount);
      });
    });
  });

  describe("Lifecycle", () => {
    it("mounts controller on first render", async () => {
      const { useRead, calls } = createTestHooks();

      const { result } = renderHook(() => useRead((api) => api("posts").GET()));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(calls.length).toBeGreaterThanOrEqual(1);
    });

    it("unmounts controller on component unmount", async () => {
      const { useRead, eventEmitter, calls } = createTestHooks();

      const { result, unmount } = renderHook(() =>
        useRead((api) => api("posts").GET())
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const callCountBeforeUnmount = calls.length;

      unmount();

      act(() => {
        eventEmitter.emit("refetch", {
          queryKey: "test",
          reason: "invalidate",
        });
      });

      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(calls.length).toBe(callCountBeforeUnmount);
    });
  });

  describe("Error Handling", () => {
    it("throws when no HTTP method called", () => {
      const { useRead } = createTestHooks();

      expect(() => {
        renderHook(() =>
          useRead(() => Promise.resolve({ data: null, status: 200 }))
        );
      }).toThrow("useRead requires calling an HTTP method (GET)");
    });

    it("sets error state on failed request", async () => {
      const { useRead, setMockResponse } = createTestHooks();
      setMockResponse({ error: { message: "Not found" }, status: 404 });

      const { result } = renderHook(() =>
        useRead((api) => api("posts/999").GET())
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.error).toEqual({ message: "Not found" });
    });

    it("clears error on successful retry", async () => {
      const { useRead, setMockResponse } = createTestHooks();
      setMockResponse({ error: { message: "Server error" }, status: 500 });

      const { result } = renderHook(() => useRead((api) => api("posts").GET()));

      await waitFor(() => {
        expect(result.current.error).toBeDefined();
      });

      setMockResponse({ data: { id: 1 }, status: 200 });

      await act(async () => {
        await result.current.trigger({ force: true });
      });

      expect(result.current.error).toBeUndefined();
      expect(result.current.data).toEqual({ id: 1 });
    });
  });

  describe("Input Fields", () => {
    it("returns query in input when provided", async () => {
      const { useRead } = createTestHooks();

      const { result } = renderHook(() =>
        useRead((api) => api("posts").GET({ query: { page: 1, limit: 10 } }))
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.input).toBeDefined();

      expect(result.current.input?.query).toEqual({
        page: 1,
        limit: 10,
      });
    });

    it("returns body in input when provided", async () => {
      const { useRead } = createTestHooks();

      const { result } = renderHook(() =>
        useRead((api) => api("search").GET({ body: { term: "test" } }))
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.input).toBeDefined();

      expect(result.current.input?.body).toEqual({ term: "test" });
    });

    it("returns params in input when provided", async () => {
      const { useRead } = createTestHooks();

      const { result } = renderHook(() =>
        useRead((api) => api("posts/:id").GET({ params: { id: 123 } }))
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.input).toBeDefined();

      expect(result.current.input?.params).toEqual({ id: 123 });
    });
  });

  describe("Additional Edge Cases", () => {
    it("handles multiple concurrent requests", async () => {
      const { useRead, setResponseDelay } = createTestHooks();
      setResponseDelay(50);

      const { result } = renderHook(() => useRead((api) => api("posts").GET()));

      expect(result.current.fetching).toBe(true);

      await waitFor(() => {
        expect(result.current.fetching).toBe(false);
      });

      expect(result.current.data).toBeDefined();
    });

    it("updates data when response changes", async () => {
      const { useRead, setMockResponse } = createTestHooks();
      setMockResponse({ data: { version: 1 }, status: 200 });

      const { result } = renderHook(() => useRead((api) => api("posts").GET()));

      await waitFor(() => {
        expect(result.current.data).toEqual({ version: 1 });
      });

      setMockResponse({ data: { version: 2 }, status: 200 });

      await act(async () => {
        await result.current.trigger({ force: true });
      });

      expect(result.current.data).toEqual({ version: 2 });
    });

    it("does not respond to invalidate events for non-matching tags", async () => {
      const { useRead, eventEmitter, calls } = createTestHooks();

      const { result } = renderHook(() =>
        useRead((api) => api("posts").GET(), { tags: ["posts"] })
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const callCountAfterMount = calls.length;

      act(() => {
        eventEmitter.emit("invalidate", ["users"]);
      });

      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(calls.length).toBe(callCountAfterMount);
    });

    it("returns meta object from plugin results", async () => {
      const { useRead } = createTestHooks();

      const { result } = renderHook(() => useRead((api) => api("posts").GET()));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.meta).toBeDefined();
      expect(typeof result.current.meta).toBe("object");
    });
  });
});
