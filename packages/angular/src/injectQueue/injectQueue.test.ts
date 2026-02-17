/* eslint-disable @typescript-eslint/no-explicit-any */
import { vi, describe, it, expect, beforeEach } from "vitest";
import { createStateManager, createEventEmitter } from "@spoosh/test-utils";
import { createPluginExecutor } from "@spoosh/core";
import { createInjectQueue } from "../injectQueue";

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

  sig.asReadonly = () => sig;

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
    data: { id: 1, name: "Uploaded" },
    status: 200,
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
          setTimeout(() => resolve({ ...mockResponse }), delay)
        );
      }

      return Promise.resolve({ ...mockResponse });
    },
  });

  return { api, calls, setMockResponse, setDelay };
}

function createTestHooks() {
  const stateManager = createStateManager();
  const eventEmitter = createEventEmitter();
  const pluginExecutor = createPluginExecutor([]);
  const { api, calls, setMockResponse, setDelay } = createMockApi();

  const injectQueue = createInjectQueue<any, unknown, []>({
    api,
    stateManager,
    eventEmitter,
    pluginExecutor,
  });

  return {
    injectQueue,
    stateManager,
    eventEmitter,
    calls,
    setMockResponse,
    setDelay,
  };
}

describe("injectQueue", () => {
  beforeEach(() => {
    destroyCallbacks = [];
    effectCleanups = [];
    effectFns = [];
    isRunningEffects = false;
    vi.clearAllMocks();
  });

  describe("Basic Functionality", () => {
    it("returns trigger, tasks, stats, abort, retry, remove, clear, start, isStarted", () => {
      const { injectQueue } = createTestHooks();

      const result = injectQueue((api: any) => api("uploads").POST());

      expect(result).toHaveProperty("trigger");
      expect(result).toHaveProperty("tasks");
      expect(result).toHaveProperty("stats");
      expect(result).toHaveProperty("abort");
      expect(result).toHaveProperty("retry");
      expect(result).toHaveProperty("remove");
      expect(result).toHaveProperty("clear");
      expect(result).toHaveProperty("start");
      expect(result).toHaveProperty("isStarted");
    });

    it("initial tasks is empty array", () => {
      const { injectQueue } = createTestHooks();

      const result = injectQueue((api: any) => api("uploads").POST());

      expect(result.tasks()).toEqual([]);
    });

    it("initial stats shows all zeros", () => {
      const { injectQueue } = createTestHooks();

      const result = injectQueue((api: any) => api("uploads").POST());

      expect(result.stats()).toEqual({
        pending: 0,
        running: 0,
        settled: 0,
        success: 0,
        failed: 0,
        total: 0,
        percentage: 0,
      });
    });
  });

  describe("Trigger Function", () => {
    it("trigger adds item to queue", async () => {
      const { injectQueue, calls } = createTestHooks();

      const result = injectQueue((api: any) => api("uploads").POST());

      await result.trigger({ body: { filename: "test.txt" } } as any);

      expect(calls).toHaveLength(1);
      expect(calls[0]).toMatchObject({
        path: "uploads",
        method: "POST",
      });
    });

    it("trigger returns promise with response", async () => {
      const { injectQueue, setMockResponse } = createTestHooks();
      setMockResponse({ data: { id: 42, name: "uploaded.txt" }, status: 200 });

      const result = injectQueue((api: any) => api("uploads").POST());

      const response = await result.trigger({
        body: { filename: "test.txt" },
      } as any);

      expect(response).toEqual({
        data: { id: 42, name: "uploaded.txt" },
        status: 200,
      });
    });

    it("trigger updates tasks signal", async () => {
      const { injectQueue } = createTestHooks();

      const result = injectQueue((api: any) => api("uploads").POST());

      await result.trigger({ body: { file: "1" } } as any);

      const tasks = result.tasks();
      expect(tasks).toHaveLength(1);
      expect(tasks[0]?.status).toBe("success");
    });

    it("trigger updates stats signal", async () => {
      const { injectQueue } = createTestHooks();

      const result = injectQueue((api: any) => api("uploads").POST());

      await result.trigger({ body: { file: "1" } } as any);
      await result.trigger({ body: { file: "2" } } as any);

      expect(result.stats().total).toBe(2);
      expect(result.stats().success).toBe(2);
      expect(result.stats().percentage).toBe(100);
    });
  });

  describe("Concurrency", () => {
    it("respects concurrency option", async () => {
      const { injectQueue, setDelay } = createTestHooks();
      setDelay(100);

      const result = injectQueue((api: any) => api("uploads").POST(), {
        concurrency: 2,
      });

      result.trigger({ body: { file: "1" } } as any).catch(() => {});
      result.trigger({ body: { file: "2" } } as any).catch(() => {});
      result.trigger({ body: { file: "3" } } as any).catch(() => {});

      await new Promise((r) => setTimeout(r, 10));

      expect(result.stats().running).toBe(2);
      expect(result.stats().pending).toBe(1);

      result.clear();
    });
  });

  describe("Error Handling", () => {
    it("tracks failed items in stats", async () => {
      const { injectQueue, setMockResponse } = createTestHooks();
      setMockResponse({ error: { message: "Upload failed" }, status: 500 });

      const result = injectQueue((api: any) => api("uploads").POST());

      await result.trigger({ body: { file: "test" } } as any);

      const tasks = result.tasks();
      expect(result.stats().failed).toBe(1);
      expect(tasks[0]?.status).toBe("error");
      expect(tasks[0]?.error).toEqual({ message: "Upload failed" });
    });

    it("throws when no HTTP method called", () => {
      const stateManager = createStateManager();
      const eventEmitter = createEventEmitter();
      const pluginExecutor = createPluginExecutor([]);
      const { api } = createMockApi();

      const injectQueue = createInjectQueue({
        api,
        stateManager,
        eventEmitter,
        pluginExecutor,
      });

      expect(() => {
        injectQueue((api) => api("uploads"));
      }).toThrow(
        'injectQueue requires selecting an HTTP method. Example: injectQueue((api) => api("uploads").POST())'
      );
    });
  });

  describe("Abort", () => {
    it("abort cancels specific task", async () => {
      const { injectQueue, setDelay } = createTestHooks();
      setDelay(100);

      const result = injectQueue((api: any) => api("uploads").POST());

      result.trigger({ body: { file: "test" } } as any).catch(() => {});

      await new Promise((r) => setTimeout(r, 10));

      const tasks = result.tasks();
      expect(tasks).toHaveLength(1);

      const taskId = tasks[0]?.id;
      expect(taskId).toBeDefined();

      result.abort(taskId!);

      await new Promise((r) => setTimeout(r, 10));

      expect(result.tasks()[0]?.status).toBe("aborted");
    });

    it("abort without id cancels all active tasks", async () => {
      const { injectQueue, setDelay } = createTestHooks();
      setDelay(100);

      const result = injectQueue((api: any) => api("uploads").POST(), {
        concurrency: 3,
      });

      result.trigger({ body: { file: "1" } } as any).catch(() => {});
      result.trigger({ body: { file: "2" } } as any).catch(() => {});
      result.trigger({ body: { file: "3" } } as any).catch(() => {});

      await new Promise((r) => setTimeout(r, 10));

      const tasks = result.tasks();
      expect(tasks).toHaveLength(3);

      result.abort();

      await new Promise((r) => setTimeout(r, 10));

      const allAborted = result.tasks().every((t) => t.status === "aborted");
      expect(allAborted).toBe(true);
    });
  });

  describe("Retry", () => {
    it("retry re-executes failed task", async () => {
      const { injectQueue, setMockResponse, calls } = createTestHooks();

      const result = injectQueue((api: any) => api("uploads").POST());

      setMockResponse({ error: { message: "Failed" }, status: 500 });

      await result.trigger({ body: { file: "test" } } as any);

      let tasks = result.tasks();
      expect(tasks[0]?.status).toBe("error");
      expect(calls).toHaveLength(1);

      setMockResponse({ data: { id: 1, name: "success" }, status: 200 });

      await result.retry(tasks[0]?.id);

      await new Promise((r) => setTimeout(r, 10));

      tasks = result.tasks();
      expect(tasks[0]?.status).toBe("success");
      expect(calls).toHaveLength(2);
    });

    it("retry without id retries all failed tasks", async () => {
      const { injectQueue, setMockResponse, calls } = createTestHooks();

      const result = injectQueue((api: any) => api("uploads").POST());

      setMockResponse({ error: { message: "Failed" }, status: 500 });

      await result.trigger({ body: { file: "1" } } as any);
      await result.trigger({ body: { file: "2" } } as any);

      expect(result.stats().failed).toBe(2);

      setMockResponse({ data: { id: 1, name: "success" }, status: 200 });

      await result.retry();

      await new Promise((r) => setTimeout(r, 10));

      expect(result.stats().success).toBe(2);
      expect(calls).toHaveLength(4);
    });
  });

  describe("Remove", () => {
    it("remove deletes specific task", async () => {
      const { injectQueue } = createTestHooks();

      const result = injectQueue((api: any) => api("uploads").POST());

      await result.trigger({ body: { file: "1" } } as any);
      await result.trigger({ body: { file: "2" } } as any);

      let tasks = result.tasks();
      expect(tasks).toHaveLength(2);

      const firstId = tasks[0]?.id;
      expect(firstId).toBeDefined();

      result.remove(firstId!);

      tasks = result.tasks();
      expect(tasks).toHaveLength(1);
      expect(tasks[0]?.id).not.toBe(firstId);
    });

    it("remove without id removes all finished tasks", async () => {
      const { injectQueue, setDelay } = createTestHooks();

      const result = injectQueue((api: any) => api("uploads").POST(), {
        concurrency: 1,
      });

      await result.trigger({ body: { file: "1" } } as any);

      setDelay(100);

      result.trigger({ body: { file: "2" } } as any).catch(() => {});

      await new Promise((r) => setTimeout(r, 10));

      expect(result.tasks()).toHaveLength(2);

      result.remove();

      const tasks = result.tasks();
      expect(tasks).toHaveLength(1);
      expect(tasks[0]?.status).toBe("running");

      result.clear();
    });
  });

  describe("Clear", () => {
    it("clear removes all tasks and aborts active", async () => {
      const { injectQueue, setDelay } = createTestHooks();
      setDelay(100);

      const result = injectQueue((api: any) => api("uploads").POST());

      result.trigger({ body: { file: "1" } } as any).catch(() => {});
      result.trigger({ body: { file: "2" } } as any).catch(() => {});

      await new Promise((r) => setTimeout(r, 10));

      expect(result.tasks()).toHaveLength(2);

      result.clear();

      expect(result.tasks()).toHaveLength(0);
      expect(result.stats().total).toBe(0);
    });
  });

  describe("Task Properties", () => {
    it("tasks have unique ids", async () => {
      const { injectQueue } = createTestHooks();

      const result = injectQueue((api: any) => api("uploads").POST());

      await result.trigger({ body: { file: "1" } } as any);
      await result.trigger({ body: { file: "2" } } as any);

      const tasks = result.tasks();
      const task1 = tasks[0];
      const task2 = tasks[1];

      expect(task1?.id).toBeDefined();
      expect(task2?.id).toBeDefined();
      expect(task1?.id).not.toBe(task2?.id);
    });

    it("tasks include input data", async () => {
      const { injectQueue } = createTestHooks();

      const result = injectQueue((api: any) => api("uploads").POST());

      await result.trigger({
        body: { filename: "test.txt" },
        query: { version: "2" },
      } as any);

      const tasks = result.tasks();
      expect(tasks[0]?.input).toEqual({
        body: { filename: "test.txt" },
        query: { version: "2" },
      });
    });

    it("tasks include data on success", async () => {
      const { injectQueue, setMockResponse } = createTestHooks();
      setMockResponse({ data: { id: 123, url: "/uploads/123" }, status: 200 });

      const result = injectQueue((api: any) => api("uploads").POST());

      await result.trigger({ body: { file: "test" } } as any);

      const tasks = result.tasks();
      expect(tasks[0]?.data).toEqual({
        id: 123,
        url: "/uploads/123",
      });
    });
  });

  describe("Cleanup", () => {
    it("unsubscribes on destroy", async () => {
      const { injectQueue, setDelay } = createTestHooks();
      setDelay(100);

      const result = injectQueue((api: any) => api("uploads").POST());

      result.trigger({ body: { file: "1" } } as any).catch(() => {});

      await new Promise((r) => setTimeout(r, 10));

      expect(result.tasks()).toHaveLength(1);

      destroyCallbacks.forEach((cb) => cb());

      expect(destroyCallbacks.length).toBeGreaterThan(0);

      result.clear();
    });
  });

  describe("Plugin Integration", () => {
    it("passes options to plugin middleware", async () => {
      const stateManager = createStateManager();
      const eventEmitter = createEventEmitter();
      const middlewareSpy = vi
        .fn()
        .mockImplementation(async (_ctx, next) => next());
      const pluginExecutor = createPluginExecutor([
        {
          name: "test-plugin",
          operations: ["queue"],
          middleware: middlewareSpy,
        },
      ]);
      const { api, calls } = createMockApi();

      const injectQueue = createInjectQueue({
        api,
        stateManager,
        eventEmitter,
        pluginExecutor,
      });

      const result = injectQueue((api: any) => api("uploads").POST());

      await result.trigger({ body: { file: "test" } } as any);

      expect(calls).toHaveLength(1);
      expect(middlewareSpy).toHaveBeenCalled();
    });
  });

  describe("autoStart", () => {
    it("defaults to autoStart true", () => {
      const { injectQueue } = createTestHooks();

      const result = injectQueue((api: any) => api("uploads").POST());

      expect(result.isStarted()).toBe(true);
    });

    it("does not execute items when autoStart is false", async () => {
      const { injectQueue, calls } = createTestHooks();

      const result = injectQueue((api: any) => api("uploads").POST(), {
        autoStart: false,
      });

      expect(result.isStarted()).toBe(false);

      result.trigger({ body: { file: "1" } } as any);
      result.trigger({ body: { file: "2" } } as any);

      await new Promise((r) => setTimeout(r, 20));

      expect(calls).toHaveLength(0);

      const tasks = result.tasks();
      expect(tasks).toHaveLength(2);
      expect(tasks[0]?.status).toBe("pending");
      expect(tasks[1]?.status).toBe("pending");
    });

    it("executes pending items when start is called", async () => {
      const { injectQueue, calls } = createTestHooks();

      const result = injectQueue((api: any) => api("uploads").POST(), {
        autoStart: false,
      });

      result.trigger({ body: { file: "1" } } as any);
      result.trigger({ body: { file: "2" } } as any);

      await new Promise((r) => setTimeout(r, 20));

      expect(calls).toHaveLength(0);

      result.start();

      await new Promise((r) => setTimeout(r, 50));

      expect(calls).toHaveLength(2);

      const tasks = result.tasks();
      expect(tasks[0]?.status).toBe("success");
      expect(tasks[1]?.status).toBe("success");
    });

    it("updates isStarted signal when start is called", async () => {
      const { injectQueue } = createTestHooks();

      const result = injectQueue((api: any) => api("uploads").POST(), {
        autoStart: false,
      });

      expect(result.isStarted()).toBe(false);

      result.start();

      await new Promise((r) => setTimeout(r, 10));

      expect(result.isStarted()).toBe(true);
    });

    it("executes new items immediately after start is called", async () => {
      const { injectQueue, calls } = createTestHooks();

      const result = injectQueue((api: any) => api("uploads").POST(), {
        autoStart: false,
      });

      result.trigger({ body: { file: "1" } } as any);

      await new Promise((r) => setTimeout(r, 10));
      expect(calls).toHaveLength(0);

      result.start();

      await new Promise((r) => setTimeout(r, 20));

      result.trigger({ body: { file: "2" } } as any);

      await new Promise((r) => setTimeout(r, 50));

      expect(calls).toHaveLength(2);
    });

    it("respects concurrency when starting", async () => {
      const { injectQueue, setDelay } = createTestHooks();
      setDelay(100);

      const result = injectQueue((api: any) => api("uploads").POST(), {
        autoStart: false,
        concurrency: 1,
      });

      result.trigger({ body: { file: "1" } } as any);
      result.trigger({ body: { file: "2" } } as any);
      result.trigger({ body: { file: "3" } } as any);

      await new Promise((r) => setTimeout(r, 10));

      result.start();

      await new Promise((r) => setTimeout(r, 20));

      const stats = result.stats();
      expect(stats.running).toBe(1);
      expect(stats.pending).toBe(2);

      result.clear();
    });
  });
});
