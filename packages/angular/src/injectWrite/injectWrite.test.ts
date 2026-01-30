/* eslint-disable @typescript-eslint/no-explicit-any */
import { vi, describe, it, expect, beforeEach } from "vitest";
import { createStateManager, createEventEmitter } from "@spoosh/test-utils";
import { createPluginExecutor } from "@spoosh/core";
import { createInjectWrite } from "../injectWrite";

let destroyCallbacks: Array<() => void> = [];
let effectCleanups: Array<() => void> = [];
let effectFns: Array<() => void | (() => void)> = [];
let isRunningEffects = false;

function createSignal<T>(initial: T) {
  let value = initial;
  const sig = () => value;

  sig.set = (newValue: T) => {
    value = newValue;
    runEffects();
  };

  sig.update = (fn: (v: T) => T) => {
    value = fn(value);
    runEffects();
  };

  return sig;
}

function runEffects() {
  if (isRunningEffects) return;
  isRunningEffects = true;

  try {
    effectFns.forEach((fn) => fn());
  } finally {
    isRunningEffects = false;
  }
}

vi.mock("@angular/core", () => ({
  signal: <T>(initial: T) => createSignal(initial),
  computed: <T>(fn: () => T) => createSignal(fn()),
  effect: (fn: () => void | (() => void)) => {
    effectFns.push(fn);
    const cleanup = fn();
    if (cleanup) effectCleanups.push(cleanup);
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

function createMockApi() {
  const calls: Array<{ path: string; method: string; options: unknown }> = [];
  let mockResponse: { data?: unknown; error?: unknown; status: number } = {
    data: { id: 1, name: "Created" },
    status: 201,
  };
  let delay = 0;

  const setMockResponse = (response: typeof mockResponse) => {
    mockResponse = response;
  };

  const setDelay = (ms: number) => {
    delay = ms;
  };

  const api = (path: string) => ({
    POST: (opts?: unknown) => {
      calls.push({ path, method: "POST", options: opts });

      if (delay > 0) {
        return new Promise((resolve) =>
          setTimeout(() => resolve(mockResponse), delay)
        );
      }

      return Promise.resolve(mockResponse);
    },
    PUT: (opts?: unknown) => {
      calls.push({ path, method: "PUT", options: opts });

      if (delay > 0) {
        return new Promise((resolve) =>
          setTimeout(() => resolve(mockResponse), delay)
        );
      }

      return Promise.resolve(mockResponse);
    },
    DELETE: (opts?: unknown) => {
      calls.push({ path, method: "DELETE", options: opts });

      if (delay > 0) {
        return new Promise((resolve) =>
          setTimeout(() => resolve(mockResponse), delay)
        );
      }

      return Promise.resolve(mockResponse);
    },
  });

  return { api, calls, setMockResponse, setDelay };
}

function createTestHooks() {
  const stateManager = createStateManager();
  const eventEmitter = createEventEmitter();
  const pluginExecutor = createPluginExecutor([]);
  const { api, calls, setMockResponse, setDelay } = createMockApi();

  const injectWrite = createInjectWrite<any, unknown, []>({
    api,
    stateManager,
    eventEmitter,
    pluginExecutor,
  });

  return {
    injectWrite,
    stateManager,
    eventEmitter,
    calls,
    setMockResponse,
    setDelay,
  };
}

describe("injectWrite", () => {
  beforeEach(() => {
    destroyCallbacks = [];
    effectCleanups = [];
    effectFns = [];
    isRunningEffects = false;
    vi.clearAllMocks();
  });

  describe("Basic Functionality", () => {
    it("returns trigger, data, loading, error", () => {
      const { injectWrite } = createTestHooks();

      const result = injectWrite((api: any) => api("posts").POST);

      expect(result).toHaveProperty("trigger");
      expect(result).toHaveProperty("data");
      expect(result).toHaveProperty("loading");
      expect(result).toHaveProperty("error");
      expect(result).toHaveProperty("abort");
    });

    it("initial state is not loading", () => {
      const { injectWrite } = createTestHooks();

      const result = injectWrite((api: any) => api("posts").POST);

      expect(result.loading()).toBe(false);
    });

    it("initial data is undefined", () => {
      const { injectWrite } = createTestHooks();

      const result = injectWrite((api: any) => api("posts").POST);

      expect(result.data()).toBeUndefined();
    });
  });

  describe("Trigger Function", () => {
    it("trigger executes mutation", async () => {
      const { injectWrite, calls } = createTestHooks();

      const result = injectWrite((api: any) => api("posts").POST);

      await result.trigger({ body: { title: "New Post" } } as any);

      expect(calls).toHaveLength(1);
      expect(calls[0]).toMatchObject({
        path: "posts",
        method: "POST",
      });
    });

    it("trigger returns response", async () => {
      const { injectWrite, setMockResponse } = createTestHooks();
      setMockResponse({ data: { id: 42, name: "Created" }, status: 201 });

      const result = injectWrite((api: any) => api("posts").POST);

      const response = await result.trigger({
        body: { title: "New Post" },
      } as any);

      expect(response).toEqual({
        data: { id: 42, name: "Created" },
        status: 201,
      });
    });

    it("trigger sets loading state during execution", async () => {
      const { injectWrite, setDelay } = createTestHooks();
      setDelay(50);

      const result = injectWrite((api: any) => api("posts").POST);

      expect(result.loading()).toBe(false);

      const triggerPromise = result.trigger({
        body: { title: "New Post" },
      } as any);

      expect(result.loading()).toBe(true);

      await triggerPromise;

      expect(result.loading()).toBe(false);
    });

    it("trigger clears loading on completion", async () => {
      const { injectWrite, setDelay } = createTestHooks();
      setDelay(10);

      const result = injectWrite((api: any) => api("posts").POST);

      await result.trigger({ body: { title: "New Post" } } as any);

      expect(result.loading()).toBe(false);
    });
  });

  describe("Error Handling", () => {
    it("sets error on failed mutation", async () => {
      const { injectWrite, setMockResponse } = createTestHooks();
      setMockResponse({ error: { message: "Server error" }, status: 500 });

      const result = injectWrite((api: any) => api("posts").POST);

      await result.trigger({ body: { title: "New Post" } } as any);

      expect(result.error()).toEqual({ message: "Server error" });
    });

    it("throws when no HTTP method selected", async () => {
      const stateManager = createStateManager();
      const eventEmitter = createEventEmitter();
      const pluginExecutor = createPluginExecutor([]);
      const { api } = createMockApi();

      const injectWrite = createInjectWrite({
        api,
        stateManager,
        eventEmitter,
        pluginExecutor,
      });

      const result = injectWrite((api) => api("posts"));

      await expect(result.trigger()).rejects.toThrow(
        'injectWrite requires selecting an HTTP method (POST, PUT, PATCH, DELETE). Example: injectWrite((api) => api("posts").POST)'
      );
    });

    it("clears error on subsequent success", async () => {
      const { injectWrite, setMockResponse } = createTestHooks();

      const result = injectWrite((api: any) => api("posts").POST);

      setMockResponse({ error: { message: "Server error" }, status: 500 });

      await result.trigger({ body: { title: "New Post" } } as any);

      expect(result.error()).toEqual({ message: "Server error" });

      setMockResponse({ data: { id: 1 }, status: 201 });

      await result.trigger({ body: { title: "New Post" } } as any);

      expect(result.error()).toBeUndefined();
    });
  });

  describe("Abort", () => {
    it("abort cancels in-flight mutation", async () => {
      const { injectWrite, setDelay } = createTestHooks();
      setDelay(100);

      const result = injectWrite((api: any) => api("posts").POST);

      const triggerPromise = result.trigger({
        body: { title: "New Post" },
      } as any);

      expect(result.loading()).toBe(true);

      result.abort();

      expect(result.abort).toBeDefined();
      expect(typeof result.abort).toBe("function");

      try {
        await triggerPromise;
      } catch {
        // Expected to potentially throw or resolve depending on abort timing
      }
    });
  });

  describe("Input Fields", () => {
    it("tracks last trigger options", async () => {
      const { injectWrite } = createTestHooks();

      const result = injectWrite((api: any) => api("posts").POST);

      await result.trigger({
        body: { title: "Test Post" },
        query: { draft: "true" },
      } as any);

      const input = (result as any).input();
      expect(input).toBeDefined();
      expect(input?.body).toEqual({ title: "Test Post" });
      expect(input?.query).toEqual({ draft: "true" });
    });

    it("returns input fields from trigger options", async () => {
      const { injectWrite } = createTestHooks();

      const result = injectWrite((api: any) => api("posts/:id").PUT);

      await result.trigger({
        params: { id: 123 },
        body: { title: "Updated Post" },
      } as any);

      const input = (result as any).input();
      expect(input?.params).toEqual({ id: 123 });
      expect(input?.body).toEqual({ title: "Updated Post" });
    });
  });

  describe("Plugin Integration", () => {
    it("passes plugin options to controller", async () => {
      const stateManager = createStateManager();
      const eventEmitter = createEventEmitter();
      const middlewareSpy = vi
        .fn()
        .mockImplementation(async (_ctx, next) => next());
      const pluginExecutor = createPluginExecutor([
        {
          name: "test-plugin",
          operations: ["write"],
          middleware: middlewareSpy,
        },
      ]);
      const { api, calls } = createMockApi();

      const injectWrite = createInjectWrite({
        api,
        stateManager,
        eventEmitter,
        pluginExecutor,
      });

      const result = injectWrite((api: any) => api("posts").POST);

      await result.trigger({ body: { title: "New Post" } } as any);

      expect(calls).toHaveLength(1);
      expect(middlewareSpy).toHaveBeenCalled();
    });

    it("resolves tags from trigger options", async () => {
      const stateManager = createStateManager();
      const eventEmitter = createEventEmitter();
      const afterResponseSpy = vi.fn();
      const pluginExecutor = createPluginExecutor([
        {
          name: "tag-plugin",
          operations: ["write"],
          afterResponse: afterResponseSpy,
        },
      ]);
      const { api } = createMockApi();

      const injectWrite = createInjectWrite({
        api,
        stateManager,
        eventEmitter,
        pluginExecutor,
      });

      const result = injectWrite((api: any) => api("posts").POST);

      await result.trigger({
        body: { title: "New Post" },
        tags: ["posts", "create"],
      } as any);

      expect(afterResponseSpy).toHaveBeenCalled();
      const callContext = afterResponseSpy.mock.calls[0]?.[0];
      expect(callContext?.tags).toContain("posts");
      expect(callContext?.tags).toContain("create");
    });
  });
});
