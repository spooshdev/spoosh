/* eslint-disable @typescript-eslint/no-explicit-any */
import { vi, describe, it, expect, beforeEach } from "vitest";
import { createStateManager, createEventEmitter } from "@spoosh/test-utils";
import { createPluginExecutor } from "@spoosh/core";
import { createInjectInfiniteRead } from "../injectInfiniteRead";

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

type PageResponse = {
  items: { id: number }[];
  nextCursor?: string;
  prevCursor?: string;
};

function createMockApi() {
  const calls: Array<{ path: string; method: string; options: unknown }> = [];
  let pageNumber = 0;

  const api = (path: string) => ({
    GET: (opts?: {
      query?: {
        cursor?: string;
        customParam?: string;
        customPrevParam?: string;
      };
      signal?: AbortSignal;
    }) => {
      calls.push({ path, method: "GET", options: opts });
      const query = opts?.query;
      pageNumber = query?.cursor ? parseInt(query.cursor, 10) : 0;

      const response: PageResponse = {
        items: [{ id: pageNumber * 10 + 1 }, { id: pageNumber * 10 + 2 }],
        nextCursor: pageNumber < 3 ? String(pageNumber + 1) : undefined,
        prevCursor: pageNumber > 0 ? String(pageNumber - 1) : undefined,
      };

      return Promise.resolve({ data: response, status: 200 });
    },
  });

  return { api, calls };
}

function createErrorApi() {
  type ErrorApi = (path: string) => {
    GET: () => Promise<{
      data: undefined;
      error: { message: string };
      status: number;
    }>;
  };

  const api: ErrorApi = () => ({
    GET: () => {
      return Promise.resolve({
        data: undefined,
        error: { message: "Network error" },
        status: 500,
      });
    },
  });

  return { api };
}

function createTestHooks() {
  const stateManager = createStateManager();
  const eventEmitter = createEventEmitter();
  const pluginExecutor = createPluginExecutor([]);
  const { api, calls } = createMockApi();

  const injectInfiniteRead = createInjectInfiniteRead<any, unknown, []>({
    api,
    stateManager,
    eventEmitter,
    pluginExecutor,
  });

  return { injectInfiniteRead, stateManager, eventEmitter, calls };
}

function createErrorTestHooks() {
  const stateManager = createStateManager();
  const eventEmitter = createEventEmitter();
  const pluginExecutor = createPluginExecutor([]);
  const { api } = createErrorApi();

  const injectInfiniteRead = createInjectInfiniteRead<any, unknown, []>({
    api,
    stateManager,
    eventEmitter,
    pluginExecutor,
  });

  return { injectInfiniteRead, stateManager, eventEmitter };
}

async function flushPromises() {
  await new Promise((resolve) => setTimeout(resolve, 0));
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

    await new Promise((resolve) => setTimeout(resolve, interval));
  }
}

describe("injectInfiniteRead", () => {
  beforeEach(() => {
    destroyCallbacks = [];
    effectCleanups = [];
    vi.clearAllMocks();
  });

  describe("Basic Functionality", () => {
    it("should return data, loading, and allResponses signals", async () => {
      const { injectInfiniteRead } = createTestHooks();

      const result = injectInfiniteRead((api: any) => api("/posts").GET(), {
        canFetchNext: (ctx: any) => ctx.response?.nextCursor !== undefined,
        nextPageRequest: (ctx: any) => ({
          query: { cursor: ctx.response?.nextCursor },
        }),
        merger: (responses: any[]) => responses.flatMap((r) => r.items),
      });

      expect(result.loading).toBeDefined();
      expect(result.data).toBeDefined();
      expect(result.allResponses).toBeDefined();

      await flushPromises();
    });

    it("should return canFetchNext and canFetchPrev signals", async () => {
      const { injectInfiniteRead } = createTestHooks();

      const result = injectInfiniteRead((api: any) => api("/posts").GET(), {
        canFetchNext: (ctx: any) => ctx.response?.nextCursor !== undefined,
        canFetchPrev: (ctx: any) => ctx.response?.prevCursor !== undefined,
        nextPageRequest: (ctx: any) => ({
          query: { cursor: ctx.response?.nextCursor },
        }),
        prevPageRequest: (ctx: any) => ({
          query: { cursor: ctx.response?.prevCursor },
        }),
        merger: (responses: any[]) => responses.flatMap((r) => r.items),
      });

      expect(result.canFetchNext).toBeDefined();
      expect(result.canFetchPrev).toBeDefined();

      await flushPromises();
    });

    it("should return fetchNext and fetchPrev functions", async () => {
      const { injectInfiniteRead } = createTestHooks();

      const result = injectInfiniteRead((api: any) => api("/posts").GET(), {
        canFetchNext: (ctx: any) => ctx.response?.nextCursor !== undefined,
        nextPageRequest: (ctx: any) => ({
          query: { cursor: ctx.response?.nextCursor },
        }),
        merger: (responses: any[]) => responses.flatMap((r) => r.items),
      });

      expect(typeof result.fetchNext).toBe("function");
      expect(typeof result.fetchPrev).toBe("function");

      await flushPromises();
    });
  });

  describe("Pagination", () => {
    it("should fetch initial page on mount", async () => {
      const { injectInfiniteRead, calls } = createTestHooks();

      injectInfiniteRead((api: any) => api("/posts").GET(), {
        canFetchNext: (ctx: any) => ctx.response?.nextCursor !== undefined,
        nextPageRequest: (ctx: any) => ({
          query: { cursor: ctx.response?.nextCursor },
        }),
        merger: (responses: any[]) => responses.flatMap((r) => r.items),
      });

      await flushPromises();

      expect(calls.length).toBeGreaterThan(0);
      expect(calls[0]!.path).toBe("/posts");
      expect(calls[0]!.method).toBe("GET");
    });

    it("should fetch next page when fetchNext is called", async () => {
      const { injectInfiniteRead, calls } = createTestHooks();

      const result = injectInfiniteRead((api: any) => api("/posts").GET(), {
        canFetchNext: (ctx: any) => ctx.response?.nextCursor !== undefined,
        nextPageRequest: (ctx: any) => ({
          query: { cursor: ctx.response?.nextCursor },
        }),
        merger: (responses: any[]) => responses.flatMap((r) => r.items),
      });

      await flushPromises();

      const initialCallCount = calls.length;

      await result.fetchNext();
      await flushPromises();

      expect(calls.length).toBeGreaterThan(initialCallCount);
    });

    it("should fetch previous page when fetchPrev is called", async () => {
      const { injectInfiniteRead, calls } = createTestHooks();

      const result = injectInfiniteRead(
        (api: any) =>
          api("/posts").GET({
            query: { cursor: "2" },
          }),
        {
          canFetchNext: (ctx: any) => ctx.response?.nextCursor !== undefined,
          canFetchPrev: (ctx: any) => ctx.response?.prevCursor !== undefined,
          nextPageRequest: (ctx: any) => ({
            query: { cursor: ctx.response?.nextCursor },
          }),
          prevPageRequest: (ctx: any) => ({
            query: { cursor: ctx.response?.prevCursor },
          }),
          merger: (responses: any[]) => responses.flatMap((r) => r.items),
        }
      );

      await flushPromises();

      const initialCallCount = calls.length;

      await result.fetchPrev();
      await flushPromises();

      expect(calls.length).toBeGreaterThan(initialCallCount);
    });

    it("should merge responses correctly using merger function", async () => {
      const { injectInfiniteRead } = createTestHooks();

      const result = injectInfiniteRead((api: any) => api("/posts").GET(), {
        canFetchNext: (ctx: any) => ctx.response?.nextCursor !== undefined,
        nextPageRequest: (ctx: any) => ({
          query: { cursor: ctx.response?.nextCursor },
        }),
        merger: (responses: any[]) => responses.flatMap((r) => r.items),
      });

      await waitFor(() => result.data() !== undefined);

      expect(result.data()).toEqual([{ id: 1 }, { id: 2 }]);

      await result.fetchNext();
      await flushPromises();

      expect(result.data()).toEqual([
        { id: 1 },
        { id: 2 },
        { id: 11 },
        { id: 12 },
      ]);
    });
  });

  describe("State Flags", () => {
    it("should set fetchingNext to false after next page fetch completes", async () => {
      const { injectInfiniteRead } = createTestHooks();

      const result = injectInfiniteRead((api: any) => api("/posts").GET(), {
        canFetchNext: (ctx: any) => ctx.response?.nextCursor !== undefined,
        nextPageRequest: (ctx: any) => ({
          query: { cursor: ctx.response?.nextCursor },
        }),
        merger: (responses: any[]) => responses.flatMap((r) => r.items),
      });

      await flushPromises();

      await result.fetchNext();
      await flushPromises();

      expect(result.fetchingNext()).toBe(false);
    });

    it("should set fetchingPrev to false after prev page fetch completes", async () => {
      const { injectInfiniteRead } = createTestHooks();

      const result = injectInfiniteRead(
        (api: any) =>
          api("/posts").GET({
            query: { cursor: "2" },
          }),
        {
          canFetchNext: (ctx: any) => ctx.response?.nextCursor !== undefined,
          canFetchPrev: (ctx: any) => ctx.response?.prevCursor !== undefined,
          nextPageRequest: (ctx: any) => ({
            query: { cursor: ctx.response?.nextCursor },
          }),
          prevPageRequest: (ctx: any) => ({
            query: { cursor: ctx.response?.prevCursor },
          }),
          merger: (responses: any[]) => responses.flatMap((r) => r.items),
        }
      );

      await flushPromises();

      await result.fetchPrev();
      await flushPromises();

      expect(result.fetchingPrev()).toBe(false);
    });

    it("should correctly differentiate loading vs fetching states", async () => {
      const { injectInfiniteRead } = createTestHooks();

      const result = injectInfiniteRead((api: any) => api("/posts").GET(), {
        canFetchNext: (ctx: any) => ctx.response?.nextCursor !== undefined,
        nextPageRequest: (ctx: any) => ({
          query: { cursor: ctx.response?.nextCursor },
        }),
        merger: (responses: any[]) => responses.flatMap((r) => r.items),
      });

      await waitFor(() => result.data() !== undefined);

      expect(result.data()).toBeDefined();
      expect(result.fetchingNext()).toBe(false);
      expect(result.fetchingPrev()).toBe(false);
    });
  });

  describe("Callbacks", () => {
    it("should use canFetchNext predicate to control pagination", async () => {
      const { injectInfiniteRead } = createTestHooks();
      const canFetchNextFn = vi.fn(() => false);

      const result = injectInfiniteRead((api: any) => api("/posts").GET(), {
        canFetchNext: canFetchNextFn,
        nextPageRequest: (ctx: any) => ({
          query: { cursor: ctx.response?.nextCursor },
        }),
        merger: (responses: any[]) => responses.flatMap((r) => r.items),
      });

      await waitFor(() => result.data() !== undefined);

      expect(result.canFetchNext()).toBe(false);
    });

    it("should use canFetchPrev predicate to control pagination", async () => {
      const { injectInfiniteRead } = createTestHooks();
      const canFetchPrevFn = vi.fn(() => false);

      const result = injectInfiniteRead((api: any) => api("/posts").GET(), {
        canFetchNext: (ctx: any) => ctx.response?.nextCursor !== undefined,
        canFetchPrev: canFetchPrevFn,
        nextPageRequest: (ctx: any) => ({
          query: { cursor: ctx.response?.nextCursor },
        }),
        prevPageRequest: (ctx: any) => ({
          query: { cursor: ctx.response?.prevCursor },
        }),
        merger: (responses: any[]) => responses.flatMap((r) => r.items),
      });

      await waitFor(() => result.data() !== undefined);

      expect(result.canFetchPrev()).toBe(false);
    });

    it("should use nextPageRequest to generate correct options", async () => {
      const { injectInfiniteRead, calls } = createTestHooks();

      const result = injectInfiniteRead((api: any) => api("/posts").GET(), {
        canFetchNext: (ctx: any) => ctx.response?.nextCursor !== undefined,
        nextPageRequest: (ctx: any) => ({
          query: { cursor: ctx.response?.nextCursor, customParam: "test" },
        }),
        merger: (responses: any[]) => responses.flatMap((r) => r.items),
      });

      await waitFor(() => result.data() !== undefined);

      await result.fetchNext();
      await flushPromises();

      const lastCall = calls[calls.length - 1];
      expect(
        (lastCall?.options as { query?: { customParam?: string } })?.query
          ?.customParam
      ).toBe("test");
    });

    it("should use prevPageRequest to generate correct options", async () => {
      const { injectInfiniteRead, calls } = createTestHooks();

      const result = injectInfiniteRead(
        (api: any) =>
          api("/posts").GET({
            query: { cursor: "2" },
          }),
        {
          canFetchNext: (ctx: any) => ctx.response?.nextCursor !== undefined,
          canFetchPrev: (ctx: any) => ctx.response?.prevCursor !== undefined,
          nextPageRequest: (ctx: any) => ({
            query: { cursor: ctx.response?.nextCursor },
          }),
          prevPageRequest: (ctx: any) => ({
            query: {
              cursor: ctx.response?.prevCursor,
              customPrevParam: "prevTest",
            },
          }),
          merger: (responses: any[]) => responses.flatMap((r) => r.items),
        }
      );

      await waitFor(() => result.data() !== undefined);

      await result.fetchPrev();
      await flushPromises();

      const lastCall = calls[calls.length - 1];
      expect(
        (lastCall?.options as { query?: { customPrevParam?: string } })?.query
          ?.customPrevParam
      ).toBe("prevTest");
    });
  });

  describe("Error Handling", () => {
    it("should throw error when no HTTP method is called", () => {
      const stateManager = createStateManager();
      const eventEmitter = createEventEmitter();
      const pluginExecutor = createPluginExecutor([]);
      const api = () => ({});

      const injectInfiniteRead = createInjectInfiniteRead({
        api: api as unknown,
        stateManager,
        eventEmitter,
        pluginExecutor,
      });

      expect(() => {
        injectInfiniteRead(
          () => Promise.resolve({ data: undefined, status: 200 }),
          {
            canFetchNext: () => false,
            nextPageRequest: () => ({}),
            merger: () => [],
          }
        );
      }).toThrow("injectInfiniteRead requires calling an HTTP method");
    });

    it("should handle failed fetch gracefully", async () => {
      const { injectInfiniteRead } = createErrorTestHooks();

      const result = injectInfiniteRead((api: any) => api("/posts").GET(), {
        canFetchNext: () => false,
        nextPageRequest: () => ({}),
        merger: (responses: any[]) => responses.flatMap((r) => r.items),
      });

      await flushPromises();

      expect(result.data()).toBeUndefined();
    });
  });

  describe("Event Handling", () => {
    it("should respond to invalidate events", async () => {
      const { injectInfiniteRead, eventEmitter, calls } = createTestHooks();

      injectInfiniteRead((api: any) => api("/posts").GET(), {
        tags: ["posts"],
        canFetchNext: (ctx: any) => ctx.response?.nextCursor !== undefined,
        nextPageRequest: (ctx: any) => ({
          query: { cursor: ctx.response?.nextCursor },
        }),
        merger: (responses: any[]) => responses.flatMap((r) => r.items),
      });

      await flushPromises();

      const initialCallCount = calls.length;

      eventEmitter.emit("invalidate", ["posts"]);

      await flushPromises();

      expect(calls.length).toBeGreaterThan(initialCallCount);
    });

    it("should refetch on invalidation", async () => {
      const { injectInfiniteRead, eventEmitter, calls } = createTestHooks();

      const result = injectInfiniteRead((api: any) => api("/posts").GET(), {
        tags: ["posts"],
        canFetchNext: (ctx: any) => ctx.response?.nextCursor !== undefined,
        nextPageRequest: (ctx: any) => ({
          query: { cursor: ctx.response?.nextCursor },
        }),
        merger: (responses: any[]) => responses.flatMap((r) => r.items),
      });

      await flushPromises();

      const callCountBeforeInvalidate = calls.length;

      eventEmitter.emit("invalidate", ["posts"]);

      await flushPromises();

      expect(calls.length).toBeGreaterThan(callCountBeforeInvalidate);
      expect(result.data()).toBeDefined();
    });
  });

  describe("Additional Edge Cases", () => {
    it("should not fetch when enabled is false", async () => {
      const { injectInfiniteRead, calls } = createTestHooks();

      injectInfiniteRead((api: any) => api("/posts").GET(), {
        enabled: false,
        canFetchNext: (ctx: any) => ctx.response?.nextCursor !== undefined,
        nextPageRequest: (ctx: any) => ({
          query: { cursor: ctx.response?.nextCursor },
        }),
        merger: (responses: any[]) => responses.flatMap((r) => r.items),
      });

      await flushPromises();
      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(calls.length).toBe(0);
    });

    it("should return trigger function for manual refetch", async () => {
      const { injectInfiniteRead, calls } = createTestHooks();

      const result = injectInfiniteRead((api: any) => api("/posts").GET(), {
        canFetchNext: (ctx: any) => ctx.response?.nextCursor !== undefined,
        nextPageRequest: (ctx: any) => ({
          query: { cursor: ctx.response?.nextCursor },
        }),
        merger: (responses: any[]) => responses.flatMap((r) => r.items),
      });

      await waitFor(() => result.data() !== undefined);

      expect(typeof result.trigger).toBe("function");

      const callCountBefore = calls.length;

      await result.trigger();
      await flushPromises();

      expect(calls.length).toBeGreaterThan(callCountBefore);
    });

    it("should return abort function", async () => {
      const { injectInfiniteRead } = createTestHooks();

      const result = injectInfiniteRead((api: any) => api("/posts").GET(), {
        canFetchNext: (ctx: any) => ctx.response?.nextCursor !== undefined,
        nextPageRequest: (ctx: any) => ({
          query: { cursor: ctx.response?.nextCursor },
        }),
        merger: (responses: any[]) => responses.flatMap((r) => r.items),
      });

      await flushPromises();

      expect(typeof result.abort).toBe("function");
    });
  });
});
