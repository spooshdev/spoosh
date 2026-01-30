/* eslint-disable @typescript-eslint/no-explicit-any */
import { vi, describe, it, expect, beforeEach } from "vitest";
import { createStateManager, createEventEmitter } from "@spoosh/test-utils";
import { createPluginExecutor } from "@spoosh/core";
import { createInjectRead } from "../injectRead";

let destroyCallbacks: Array<() => void> = [];
let effectCleanups: Array<() => void> = [];

function createSignal<T>(initial: T) {
  let value = initial;
  const listeners = new Set<() => void>();

  const sig = (() => value) as (() => T) & {
    set: (newValue: T) => void;
    update: (fn: (v: T) => T) => void;
  };

  sig.set = (newValue: T) => {
    value = newValue;
    listeners.forEach((fn) => fn());
  };

  sig.update = (fn: (v: T) => T) => {
    value = fn(value);
    listeners.forEach((fn) => fn());
  };

  return sig;
}

vi.mock("@angular/core", () => ({
  signal: <T>(initial: T) => createSignal(initial),
  computed: <T>(fn: () => T) => {
    const sig = createSignal(fn());
    return sig;
  },
  effect: (fn: () => void | (() => void)) => {
    const cleanup = fn();

    if (cleanup) {
      effectCleanups.push(cleanup);
    }

    return { destroy: () => cleanup?.() };
  },
  inject: (token: any) => {
    if (token.name === "DestroyRef" || token === "DestroyRef") {
      return {
        onDestroy: (cb: () => void) => {
          destroyCallbacks.push(cb);
        },
      };
    }

    return null;
  },
  DestroyRef: class DestroyRef {},
  untracked: <T>(fn: () => T) => fn(),
}));

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

  const injectRead = createInjectRead<any, unknown, []>({
    api,
    stateManager,
    eventEmitter,
    pluginExecutor,
  });

  return {
    injectRead,
    stateManager,
    eventEmitter,
    calls,
    setMockResponse,
    setResponseDelay,
    abortCurrentRequest,
  };
}

function simulateDestroy() {
  destroyCallbacks.forEach((cb) => cb());
  effectCleanups.forEach((cleanup) => cleanup());
}

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitFor(
  condition: () => boolean,
  timeout = 1000,
  interval = 10
) {
  const start = Date.now();

  while (!condition()) {
    if (Date.now() - start > timeout) {
      throw new Error("waitFor timeout");
    }

    await wait(interval);
  }
}

describe("injectRead", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    destroyCallbacks = [];
    effectCleanups = [];
  });

  describe("Basic Functionality", () => {
    it("returns data, loading, error signals", async () => {
      const { injectRead } = createTestHooks();

      const result = injectRead((api) => api("posts").GET());

      expect(result).toHaveProperty("data");
      expect(result).toHaveProperty("loading");
      expect(result).toHaveProperty("error");
      expect(result).toHaveProperty("fetching");
      expect(result).toHaveProperty("trigger");
      expect(result).toHaveProperty("abort");
      expect(result).toHaveProperty("meta");

      await waitFor(() => result.loading() === false);
    });

    it("fetches on mount when enabled", async () => {
      const { injectRead, calls } = createTestHooks();

      injectRead((api) => api("posts").GET());

      await waitFor(() => calls.length >= 1);

      expect(calls[0]!.path).toBe("posts");
      expect(calls[0]!.method).toBe("GET");
    });

    it("does not fetch when enabled=false", async () => {
      const { injectRead, calls } = createTestHooks();

      injectRead((api) => api("posts").GET(), { enabled: false });

      await wait(50);

      expect(calls.length).toBe(0);
    });

    it("returns correct initial state", () => {
      const { injectRead } = createTestHooks();

      const result = injectRead((api) => api("posts").GET());

      expect(result.data()).toBeUndefined();
    });
  });

  describe("Trigger Function", () => {
    it("manual trigger refetches data", async () => {
      const { injectRead, calls, setMockResponse } = createTestHooks();

      const result = injectRead((api) => api("posts").GET());

      await waitFor(() => result.loading() === false);

      const initialCallCount = calls.length;

      setMockResponse({ data: { id: 2, name: "Updated" }, status: 200 });

      await result.trigger();

      expect(calls.length).toBeGreaterThan(initialCallCount);
    });

    it("trigger with force=true bypasses cache", async () => {
      const { injectRead, calls } = createTestHooks();

      const result = injectRead((api) => api("posts").GET());

      await waitFor(() => result.loading() === false);

      const initialCallCount = calls.length;

      await result.trigger({ force: true });

      expect(calls.length).toBeGreaterThan(initialCallCount);
    });

    it("trigger with override options works", async () => {
      const { injectRead, calls } = createTestHooks();

      const result = injectRead((api) =>
        api("posts").GET({ query: { page: 1 } })
      );

      await waitFor(() => result.loading() === false);

      await result.trigger({ query: { page: 2 } });

      const lastCall = calls[calls.length - 1];
      expect(lastCall!.options).toMatchObject({ query: { page: 2 } });
    });
  });

  describe("Abort", () => {
    it("abort is callable and does not throw", async () => {
      const { injectRead } = createTestHooks();

      const result = injectRead((api) => api("posts").GET());

      expect(() => {
        result.abort();
      }).not.toThrow();

      await waitFor(() => result.loading() === false);
    });

    it("abort function is stable reference", async () => {
      const { injectRead } = createTestHooks();

      const result = injectRead((api) => api("posts").GET());

      const initialAbort = result.abort;

      await waitFor(() => result.loading() === false);

      expect(result.abort).toBe(initialAbort);
    });
  });

  describe("Cache Behavior", () => {
    it("returns cached data after execution", async () => {
      const { injectRead, stateManager } = createTestHooks();

      const queryKey = stateManager.createQueryKey({
        path: ["posts"],
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

      const result = injectRead((api) => api("posts").GET());

      await waitFor(() => result.data() !== undefined);

      expect(result.loading()).toBe(false);
    });

    it("fetching states transition correctly", async () => {
      const { injectRead, setResponseDelay } = createTestHooks();
      setResponseDelay(100);

      const result = injectRead((api) => api("posts").GET());

      await waitFor(() => result.fetching() === false);

      expect(result.data()).toBeDefined();
    });
  });

  describe("Event Handling", () => {
    it("responds to refetch events", async () => {
      const { injectRead, eventEmitter, calls, stateManager } =
        createTestHooks();

      const result = injectRead((api) => api("posts").GET());

      await waitFor(() => result.loading() === false);

      const initialCallCount = calls.length;

      const queryKey = stateManager.createQueryKey({
        path: ["posts"],
        method: "GET",
        options: undefined,
      });

      eventEmitter.emit("refetch", { queryKey, reason: "invalidate" });

      await waitFor(() => calls.length > initialCallCount);
    });

    it("responds to invalidate events for matching tags", async () => {
      const { injectRead, eventEmitter, calls } = createTestHooks();

      const result = injectRead((api) => api("posts").GET(), {
        tags: ["posts"],
      });

      await waitFor(() => result.loading() === false);

      const initialCallCount = calls.length;

      eventEmitter.emit("invalidate", ["posts"]);

      await waitFor(() => calls.length > initialCallCount);
    });
  });

  describe("Lifecycle", () => {
    it("mounts controller on first render", async () => {
      const { injectRead, calls } = createTestHooks();

      const result = injectRead((api) => api("posts").GET());

      await waitFor(() => result.loading() === false);

      expect(calls.length).toBeGreaterThanOrEqual(1);
    });

    it("cleanup on destroy stops responding to events", async () => {
      const { injectRead, eventEmitter, calls } = createTestHooks();

      const result = injectRead((api) => api("posts").GET());

      await waitFor(() => result.loading() === false);

      const callCountBeforeDestroy = calls.length;

      simulateDestroy();

      eventEmitter.emit("refetch", {
        queryKey: "test",
        reason: "invalidate",
      });

      await wait(50);

      expect(calls.length).toBe(callCountBeforeDestroy);
    });
  });

  describe("Error Handling", () => {
    it("throws when no HTTP method called", () => {
      const { injectRead } = createTestHooks();

      expect(() => {
        injectRead(() => Promise.resolve({ data: null, status: 200 }));
      }).toThrow("injectRead requires calling an HTTP method (GET)");
    });

    it("sets error state on failed request", async () => {
      const { injectRead, setMockResponse } = createTestHooks();
      setMockResponse({ error: { message: "Not found" }, status: 404 });

      const result = injectRead((api) => api("posts/999").GET());

      await waitFor(() => result.loading() === false);

      expect(result.error()).toEqual({ message: "Not found" });
    });

    it("clears error on successful retry", async () => {
      const { injectRead, setMockResponse } = createTestHooks();
      setMockResponse({ error: { message: "Server error" }, status: 500 });

      const result = injectRead((api) => api("posts").GET());

      await waitFor(() => result.error() !== undefined);

      setMockResponse({ data: { id: 1 }, status: 200 });

      await result.trigger({ force: true });

      expect(result.error()).toBeUndefined();
      expect(result.data()).toEqual({ id: 1 });
    });
  });

  describe("Input Fields", () => {
    it("returns query in input when provided", async () => {
      const { injectRead } = createTestHooks();

      const result = injectRead((api) =>
        api("posts").GET({ query: { page: 1, limit: 10 } })
      );

      await waitFor(() => result.loading() === false);

      expect(result.input).toBeDefined();
      expect(result.input?.query).toEqual({
        page: 1,
        limit: 10,
      });
    });

    it("returns body in input when provided", async () => {
      const { injectRead } = createTestHooks();

      const result = injectRead((api) =>
        api("search").GET({ body: { term: "test" } })
      );

      await waitFor(() => result.loading() === false);

      expect(result.input).toBeDefined();
      expect(result.input?.body).toEqual({ term: "test" });
    });

    it("returns params in input when provided", async () => {
      const { injectRead } = createTestHooks();

      const result = injectRead((api) =>
        api("posts/:id").GET({ params: { id: 123 } })
      );

      await waitFor(() => result.loading() === false);

      expect(result.input).toBeDefined();
      expect(result.input?.params).toEqual({ id: 123 });
    });
  });

  describe("Additional Edge Cases", () => {
    it("handles multiple concurrent requests", async () => {
      const { injectRead, setResponseDelay } = createTestHooks();
      setResponseDelay(50);

      const result = injectRead((api) => api("posts").GET());

      await waitFor(() => result.fetching() === false);

      expect(result.data()).toBeDefined();
    });

    it("updates data when response changes", async () => {
      const { injectRead, setMockResponse } = createTestHooks();
      setMockResponse({ data: { version: 1 }, status: 200 });

      const result = injectRead((api) => api("posts").GET());

      await waitFor(() => result.data() !== undefined);

      expect(result.data()).toEqual({ version: 1 });

      setMockResponse({ data: { version: 2 }, status: 200 });

      await result.trigger({ force: true });

      expect(result.data()).toEqual({ version: 2 });
    });

    it("does not respond to invalidate events for non-matching tags", async () => {
      const { injectRead, eventEmitter, calls } = createTestHooks();

      const result = injectRead((api) => api("posts").GET(), {
        tags: ["posts"],
      });

      await waitFor(() => result.loading() === false);

      const callCountAfterMount = calls.length;

      eventEmitter.emit("invalidate", ["users"]);

      await wait(50);

      expect(calls.length).toBe(callCountAfterMount);
    });

    it("returns meta object from plugin results", async () => {
      const { injectRead } = createTestHooks();

      const result = injectRead((api) => api("posts").GET());

      await waitFor(() => result.loading() === false);

      expect(result.meta).toBeDefined();
      expect(typeof result.meta()).toBe("object");
    });
  });
});
