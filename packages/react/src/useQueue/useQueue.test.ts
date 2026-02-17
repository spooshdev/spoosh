/**
 * @vitest-environment jsdom
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { renderHook, act, waitFor } from "@testing-library/react";
import { vi } from "vitest";
import { createStateManager, createEventEmitter } from "@spoosh/test-utils";
import { createPluginExecutor } from "@spoosh/core";
import { createUseQueue } from "./index";

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

  const useQueue = createUseQueue<any, unknown, []>({
    api,
    stateManager,
    eventEmitter,
    pluginExecutor,
  });

  return {
    useQueue,
    stateManager,
    eventEmitter,
    calls,
    setMockResponse,
    setDelay,
  };
}

describe("useQueue", () => {
  describe("Basic Functionality", () => {
    it("returns trigger, tasks, stats, abort, retry, remove, clear, start, isStarted", () => {
      const { useQueue } = createTestHooks();

      const { result } = renderHook(() =>
        useQueue((api: any) => api("uploads").POST())
      );

      expect(result.current).toHaveProperty("trigger");
      expect(result.current).toHaveProperty("tasks");
      expect(result.current).toHaveProperty("stats");
      expect(result.current).toHaveProperty("abort");
      expect(result.current).toHaveProperty("retry");
      expect(result.current).toHaveProperty("remove");
      expect(result.current).toHaveProperty("clear");
      expect(result.current).toHaveProperty("start");
      expect(result.current).toHaveProperty("isStarted");
    });

    it("initial tasks is empty array", () => {
      const { useQueue } = createTestHooks();

      const { result } = renderHook(() =>
        useQueue((api: any) => api("uploads").POST())
      );

      expect(result.current.tasks).toEqual([]);
    });

    it("initial stats shows all zeros", () => {
      const { useQueue } = createTestHooks();

      const { result } = renderHook(() =>
        useQueue((api: any) => api("uploads").POST())
      );

      expect(result.current.stats).toEqual({
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
      const { useQueue, calls } = createTestHooks();

      const { result } = renderHook(() =>
        useQueue((api: any) => api("uploads").POST())
      );

      await act(async () => {
        await result.current.trigger({ body: { filename: "test.txt" } } as any);
      });

      expect(calls).toHaveLength(1);
      expect(calls[0]).toMatchObject({
        path: "uploads",
        method: "POST",
      });
    });

    it("trigger returns promise with response", async () => {
      const { useQueue, setMockResponse } = createTestHooks();
      setMockResponse({ data: { id: 42, name: "uploaded.txt" }, status: 200 });

      const { result } = renderHook(() =>
        useQueue((api: any) => api("uploads").POST())
      );

      let response: unknown;

      await act(async () => {
        response = await result.current.trigger({
          body: { filename: "test.txt" },
        } as any);
      });

      expect(response).toEqual({
        data: { id: 42, name: "uploaded.txt" },
        status: 200,
      });
    });

    it("trigger updates tasks array", async () => {
      const { useQueue } = createTestHooks();

      const { result } = renderHook(() =>
        useQueue((api: any) => api("uploads").POST())
      );

      await act(async () => {
        await result.current.trigger({ body: { file: "1" } } as any);
      });

      expect(result.current.tasks).toHaveLength(1);
      expect(result.current.tasks[0]?.status).toBe("success");
    });

    it("trigger updates stats", async () => {
      const { useQueue } = createTestHooks();

      const { result } = renderHook(() =>
        useQueue((api: any) => api("uploads").POST())
      );

      await act(async () => {
        await result.current.trigger({ body: { file: "1" } } as any);
        await result.current.trigger({ body: { file: "2" } } as any);
      });

      expect(result.current.stats.total).toBe(2);
      expect(result.current.stats.success).toBe(2);
      expect(result.current.stats.percentage).toBe(100);
    });
  });

  describe("Concurrency", () => {
    it("respects concurrency option", async () => {
      const { useQueue, setDelay } = createTestHooks();
      setDelay(50);

      const { result } = renderHook(() =>
        useQueue((api: any) => api("uploads").POST(), { concurrency: 2 })
      );

      act(() => {
        result.current.trigger({ body: { file: "1" } } as any);
        result.current.trigger({ body: { file: "2" } } as any);
        result.current.trigger({ body: { file: "3" } } as any);
      });

      await waitFor(() => {
        expect(result.current.stats.running).toBe(2);
        expect(result.current.stats.pending).toBe(1);
      });
    });

    it("updates concurrency dynamically", async () => {
      const { useQueue, setDelay } = createTestHooks();
      setDelay(200);

      const { result, rerender } = renderHook(
        ({ concurrency }) =>
          useQueue((api: any) => api("uploads").POST(), { concurrency }),
        { initialProps: { concurrency: 1 } }
      );

      act(() => {
        result.current.trigger({ body: { file: "1" } } as any);
        result.current.trigger({ body: { file: "2" } } as any);
        result.current.trigger({ body: { file: "3" } } as any);
      });

      await waitFor(() => {
        expect(result.current.stats.running).toBe(1);
        expect(result.current.stats.pending).toBe(2);
      });

      rerender({ concurrency: 3 });

      await waitFor(
        () => {
          expect(
            result.current.stats.running + result.current.stats.pending
          ).toBeGreaterThanOrEqual(2);
        },
        { timeout: 100 }
      );
    });
  });

  describe("Error Handling", () => {
    it("tracks failed items in stats", async () => {
      const { useQueue, setMockResponse } = createTestHooks();
      setMockResponse({ error: { message: "Upload failed" }, status: 500 });

      const { result } = renderHook(() =>
        useQueue((api: any) => api("uploads").POST())
      );

      await act(async () => {
        await result.current.trigger({ body: { file: "test" } } as any);
      });

      expect(result.current.stats.failed).toBe(1);
      expect(result.current.tasks[0]?.status).toBe("error");
      expect(result.current.tasks[0]?.error).toEqual({
        message: "Upload failed",
      });
    });

    it("throws when no HTTP method called", () => {
      const stateManager = createStateManager();
      const eventEmitter = createEventEmitter();
      const pluginExecutor = createPluginExecutor([]);
      const { api } = createMockApi();

      const useQueue = createUseQueue({
        api,
        stateManager,
        eventEmitter,
        pluginExecutor,
      });

      expect(() => {
        renderHook(() => useQueue((api) => api("uploads")));
      }).toThrow(
        'useQueue requires selecting an HTTP method. Example: useQueue((api) => api("uploads").POST())'
      );
    });
  });

  describe("Abort", () => {
    it("abort cancels specific task", async () => {
      const { useQueue, setDelay } = createTestHooks();
      setDelay(100);

      const { result } = renderHook(() =>
        useQueue((api: any) => api("uploads").POST())
      );

      act(() => {
        result.current.trigger({ body: { file: "test" } } as any);
      });

      await waitFor(() => {
        expect(result.current.tasks).toHaveLength(1);
      });

      const taskId = result.current.tasks[0]?.id;
      expect(taskId).toBeDefined();

      act(() => {
        result.current.abort(taskId!);
      });

      await waitFor(() => {
        expect(result.current.tasks[0]?.status).toBe("aborted");
      });
    });

    it("abort without id cancels all active tasks", async () => {
      const { useQueue, setDelay } = createTestHooks();
      setDelay(100);

      const { result } = renderHook(() =>
        useQueue((api: any) => api("uploads").POST(), { concurrency: 3 })
      );

      act(() => {
        result.current.trigger({ body: { file: "1" } } as any);
        result.current.trigger({ body: { file: "2" } } as any);
        result.current.trigger({ body: { file: "3" } } as any);
      });

      await waitFor(() => {
        expect(result.current.tasks).toHaveLength(3);
      });

      act(() => {
        result.current.abort();
      });

      await waitFor(() => {
        const allAborted = result.current.tasks.every(
          (t) => t.status === "aborted"
        );
        expect(allAborted).toBe(true);
      });
    });
  });

  describe("Retry", () => {
    it("retry re-executes failed task", async () => {
      const { useQueue, setMockResponse, calls } = createTestHooks();

      const { result } = renderHook(() =>
        useQueue((api: any) => api("uploads").POST())
      );

      setMockResponse({ error: { message: "Failed" }, status: 500 });

      await act(async () => {
        await result.current.trigger({ body: { file: "test" } } as any);
      });

      expect(result.current.tasks[0]?.status).toBe("error");
      expect(calls).toHaveLength(1);

      setMockResponse({ data: { id: 1, name: "success" }, status: 200 });

      const taskId = result.current.tasks[0]?.id;
      expect(taskId).toBeDefined();

      await act(async () => {
        await result.current.retry(taskId);
      });

      await waitFor(() => {
        expect(result.current.tasks[0]?.status).toBe("success");
      });

      expect(calls).toHaveLength(2);
    });

    it("retry without id retries all failed tasks", async () => {
      const { useQueue, setMockResponse, calls } = createTestHooks();

      const { result } = renderHook(() =>
        useQueue((api: any) => api("uploads").POST())
      );

      setMockResponse({ error: { message: "Failed" }, status: 500 });

      await act(async () => {
        await result.current.trigger({ body: { file: "1" } } as any);
        await result.current.trigger({ body: { file: "2" } } as any);
      });

      expect(result.current.stats.failed).toBe(2);

      setMockResponse({ data: { id: 1, name: "success" }, status: 200 });

      await act(async () => {
        await result.current.retry();
      });

      await waitFor(() => {
        expect(result.current.stats.success).toBe(2);
      });

      expect(calls).toHaveLength(4);
    });
  });

  describe("Remove", () => {
    it("remove deletes specific task", async () => {
      const { useQueue } = createTestHooks();

      const { result } = renderHook(() =>
        useQueue((api: any) => api("uploads").POST())
      );

      await act(async () => {
        await result.current.trigger({ body: { file: "1" } } as any);
        await result.current.trigger({ body: { file: "2" } } as any);
      });

      expect(result.current.tasks).toHaveLength(2);

      const firstId = result.current.tasks[0]?.id;
      expect(firstId).toBeDefined();

      act(() => {
        result.current.remove(firstId!);
      });

      expect(result.current.tasks).toHaveLength(1);
      expect(result.current.tasks[0]?.id).not.toBe(firstId);
    });

    it("remove without id removes all finished tasks", async () => {
      const { useQueue, setDelay } = createTestHooks();

      const { result } = renderHook(() =>
        useQueue((api: any) => api("uploads").POST(), { concurrency: 1 })
      );

      await act(async () => {
        await result.current.trigger({ body: { file: "1" } } as any);
      });

      setDelay(100);

      act(() => {
        result.current.trigger({ body: { file: "2" } } as any);
      });

      await waitFor(() => {
        expect(result.current.tasks).toHaveLength(2);
      });

      act(() => {
        result.current.remove();
      });

      expect(result.current.tasks).toHaveLength(1);
      expect(result.current.tasks[0]?.status).toBe("running");
    });
  });

  describe("Clear", () => {
    it("clear removes all tasks and aborts active", async () => {
      const { useQueue, setDelay } = createTestHooks();
      setDelay(100);

      const { result } = renderHook(() =>
        useQueue((api: any) => api("uploads").POST())
      );

      act(() => {
        result.current.trigger({ body: { file: "1" } } as any);
        result.current.trigger({ body: { file: "2" } } as any);
      });

      await waitFor(() => {
        expect(result.current.tasks).toHaveLength(2);
      });

      act(() => {
        result.current.clear();
      });

      expect(result.current.tasks).toHaveLength(0);
      expect(result.current.stats.total).toBe(0);
    });
  });

  describe("Task Properties", () => {
    it("tasks have unique ids", async () => {
      const { useQueue } = createTestHooks();

      const { result } = renderHook(() =>
        useQueue((api: any) => api("uploads").POST())
      );

      await act(async () => {
        await result.current.trigger({ body: { file: "1" } } as any);
        await result.current.trigger({ body: { file: "2" } } as any);
      });

      const [task1, task2] = result.current.tasks;
      expect(task1).toBeDefined();
      expect(task2).toBeDefined();

      expect(task1!.id).toBeDefined();
      expect(task2!.id).toBeDefined();
      expect(task1!.id).not.toBe(task2!.id);
    });

    it("tasks include input data", async () => {
      const { useQueue } = createTestHooks();

      const { result } = renderHook(() =>
        useQueue((api: any) => api("uploads").POST())
      );

      await act(async () => {
        await result.current.trigger({
          body: { filename: "test.txt" },
          query: { version: "2" },
        } as any);
      });

      expect(result.current.tasks[0]?.input).toEqual({
        body: { filename: "test.txt" },
        query: { version: "2" },
      });
    });

    it("tasks include data on success", async () => {
      const { useQueue, setMockResponse } = createTestHooks();
      setMockResponse({ data: { id: 123, url: "/uploads/123" }, status: 200 });

      const { result } = renderHook(() =>
        useQueue((api: any) => api("uploads").POST())
      );

      await act(async () => {
        await result.current.trigger({ body: { file: "test" } } as any);
      });

      expect(result.current.tasks[0]?.data).toEqual({
        id: 123,
        url: "/uploads/123",
      });
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

      const useQueue = createUseQueue({
        api,
        stateManager,
        eventEmitter,
        pluginExecutor,
      });

      const { result } = renderHook(() =>
        useQueue((api: any) => api("uploads").POST())
      );

      await act(async () => {
        await result.current.trigger({ body: { file: "test" } } as any);
      });

      expect(calls).toHaveLength(1);
      expect(middlewareSpy).toHaveBeenCalled();
    });
  });

  describe("autoStart", () => {
    it("defaults to autoStart true", () => {
      const { useQueue } = createTestHooks();

      const { result } = renderHook(() =>
        useQueue((api: any) => api("uploads").POST())
      );

      expect(result.current.isStarted).toBe(true);
    });

    it("does not execute items when autoStart is false", async () => {
      const { useQueue, calls } = createTestHooks();

      const { result } = renderHook(() =>
        useQueue((api: any) => api("uploads").POST(), { autoStart: false })
      );

      expect(result.current.isStarted).toBe(false);

      act(() => {
        result.current.trigger({ body: { file: "1" } } as any);
        result.current.trigger({ body: { file: "2" } } as any);
      });

      await waitFor(() => {
        expect(result.current.tasks).toHaveLength(2);
      });

      expect(calls).toHaveLength(0);
      expect(result.current.tasks[0]?.status).toBe("pending");
      expect(result.current.tasks[1]?.status).toBe("pending");
    });

    it("executes pending items when start is called", async () => {
      const { useQueue, calls } = createTestHooks();

      const { result } = renderHook(() =>
        useQueue((api: any) => api("uploads").POST(), { autoStart: false })
      );

      act(() => {
        result.current.trigger({ body: { file: "1" } } as any);
        result.current.trigger({ body: { file: "2" } } as any);
      });

      await waitFor(() => {
        expect(result.current.tasks).toHaveLength(2);
      });

      expect(calls).toHaveLength(0);

      act(() => {
        result.current.start();
      });

      await waitFor(() => {
        expect(result.current.tasks[0]?.status).toBe("success");
        expect(result.current.tasks[1]?.status).toBe("success");
      });

      expect(calls).toHaveLength(2);
    });

    it("executes new items immediately after start is called", async () => {
      const { useQueue, calls } = createTestHooks();

      const { result } = renderHook(() =>
        useQueue((api: any) => api("uploads").POST(), { autoStart: false })
      );

      act(() => {
        result.current.trigger({ body: { file: "1" } } as any);
      });

      await waitFor(() => {
        expect(result.current.tasks).toHaveLength(1);
      });

      expect(calls).toHaveLength(0);

      act(() => {
        result.current.start();
      });

      await waitFor(() => {
        expect(result.current.tasks[0]?.status).toBe("success");
      });

      await act(async () => {
        await result.current.trigger({ body: { file: "2" } } as any);
      });

      expect(calls).toHaveLength(2);
    });

    it("respects concurrency when starting", async () => {
      const { useQueue, setDelay } = createTestHooks();
      setDelay(100);

      const { result } = renderHook(() =>
        useQueue((api: any) => api("uploads").POST(), {
          autoStart: false,
          concurrency: 1,
        })
      );

      act(() => {
        result.current.trigger({ body: { file: "1" } } as any);
        result.current.trigger({ body: { file: "2" } } as any);
        result.current.trigger({ body: { file: "3" } } as any);
      });

      await waitFor(() => {
        expect(result.current.tasks).toHaveLength(3);
      });

      act(() => {
        result.current.start();
      });

      await waitFor(() => {
        expect(result.current.stats.running).toBe(1);
        expect(result.current.stats.pending).toBe(2);
      });

      result.current.clear();
    });
  });
});
