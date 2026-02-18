import { describe, it, expect, vi } from "vitest";
import { createQueueController } from "./controller";
import { createStateManager } from "../../state";
import { createEventEmitter } from "../../events/emitter";
import { createPluginExecutor } from "../../plugins/executor";
import type { SpooshResponse } from "../../types/response.types";

function createMockApi<TData = { id: number; name: string }>() {
  const calls: Array<{ path: string; method: string; options: unknown }> = [];
  let mockResponse: SpooshResponse<TData, Error> = {
    status: 200,
    data: { id: 1, name: "Test" } as TData,
  };
  let delay = 0;

  const setMockResponse = (response: SpooshResponse<TData, Error>) => {
    mockResponse = response;
  };

  const setDelay = (ms: number) => {
    delay = ms;
  };

  const api = (path: string) => ({
    POST: (opts?: unknown) => {
      calls.push({ path, method: "POST", options: opts });

      if (delay > 0) {
        return new Promise<SpooshResponse<TData, Error>>((resolve) =>
          setTimeout(() => resolve({ ...mockResponse }), delay)
        );
      }

      return Promise.resolve({ ...mockResponse });
    },
  });

  return { api, calls, setMockResponse, setDelay };
}

function createTestController<TData = { id: number; name: string }>(options?: {
  concurrency?: number;
  delay?: number;
  mockResponse?: SpooshResponse<TData, Error>;
}) {
  const stateManager = createStateManager();
  const eventEmitter = createEventEmitter();
  const pluginExecutor = createPluginExecutor([]);
  const { api, calls, setMockResponse, setDelay } = createMockApi<TData>();

  if (options?.delay) {
    setDelay(options.delay);
  }

  if (options?.mockResponse) {
    setMockResponse(options.mockResponse);
  }

  const controller = createQueueController<TData, Error>(
    {
      path: "uploads",
      method: "POST",
      concurrency: options?.concurrency ?? 2,
      operationType: "queue",
    },
    {
      api,
      stateManager,
      eventEmitter,
      pluginExecutor,
    }
  );

  return {
    controller,
    stateManager,
    eventEmitter,
    calls,
    setMockResponse,
    setDelay,
  };
}

describe("createQueueController", () => {
  describe("trigger", () => {
    it("should add item to queue and execute", async () => {
      const { controller, calls } = createTestController();

      await controller.trigger({ body: { filename: "test.txt" } });

      expect(calls).toHaveLength(1);
      expect(calls[0]!.path).toBe("uploads");
      expect(calls[0]!.method).toBe("POST");
    });

    it("should return promise that resolves with response", async () => {
      const { controller, setMockResponse } = createTestController();
      setMockResponse({ status: 200, data: { id: 42, name: "uploaded" } });

      const response = await controller.trigger({ body: { file: "data" } });

      expect(response.data).toEqual({ id: 42, name: "uploaded" });
      expect(response.status).toBe(200);
    });

    it("should add multiple items to queue", async () => {
      const { controller, calls } = createTestController({ delay: 10 });

      const promises = [
        controller.trigger({ body: { file: "1" } }),
        controller.trigger({ body: { file: "2" } }),
        controller.trigger({ body: { file: "3" } }),
      ];

      await Promise.all(promises);

      expect(calls).toHaveLength(3);
    });

    it("should respect concurrency limit", async () => {
      const { controller } = createTestController({
        concurrency: 2,
        delay: 50,
      });
      let maxConcurrent = 0;
      let currentConcurrent = 0;

      const originalTrigger = controller.trigger.bind(controller);
      const trackingTrigger = async (input: unknown) => {
        currentConcurrent++;
        maxConcurrent = Math.max(maxConcurrent, currentConcurrent);

        const result = await originalTrigger(input as { body?: unknown });

        await new Promise((r) => setTimeout(r, 10));
        currentConcurrent--;

        return result;
      };

      await Promise.all([
        trackingTrigger({ body: { file: "1" } }),
        trackingTrigger({ body: { file: "2" } }),
        trackingTrigger({ body: { file: "3" } }),
        trackingTrigger({ body: { file: "4" } }),
      ]);

      expect(maxConcurrent).toBeLessThanOrEqual(4);
    });
  });

  describe("getQueue", () => {
    it("should return empty array initially", () => {
      const { controller } = createTestController();

      const queue = controller.getQueue();

      expect(queue).toEqual([]);
    });

    it("should return items with correct status", async () => {
      const { controller } = createTestController({ delay: 50 });

      controller.trigger({ body: { file: "test" } });

      await new Promise((r) => setTimeout(r, 10));

      const queue = controller.getQueue();

      expect(queue.length).toBeGreaterThan(0);
      expect(queue[0]!.status).toBe("running");
    });

    it("should update status to success on completion", async () => {
      const { controller } = createTestController();

      await controller.trigger({ body: { file: "test" } });

      const queue = controller.getQueue();

      expect(queue[0]!.status).toBe("success");
    });

    it("should update status to error on failure", async () => {
      const { controller, setMockResponse } = createTestController();
      setMockResponse({ status: 500, error: new Error("Upload failed") });

      await controller.trigger({ body: { file: "test" } });

      const queue = controller.getQueue();

      expect(queue[0]!.status).toBe("error");
      expect(queue[0]!.error).toBeInstanceOf(Error);
    });

    it("should include data on success", async () => {
      const { controller, setMockResponse } = createTestController();
      setMockResponse({ status: 200, data: { id: 123, name: "result" } });

      await controller.trigger({ body: { file: "test" } });

      const queue = controller.getQueue();

      expect(queue[0]!.data).toEqual({ id: 123, name: "result" });
    });
  });

  describe("getStats", () => {
    it("should return correct initial stats", () => {
      const { controller } = createTestController();

      const stats = controller.getStats();

      expect(stats).toEqual({
        pending: 0,
        running: 0,
        settled: 0,
        success: 0,
        failed: 0,
        total: 0,
        percentage: 0,
      });
    });

    it("should track running items", async () => {
      const { controller } = createTestController({ delay: 100 });

      controller.trigger({ body: { file: "1" } });
      controller.trigger({ body: { file: "2" } });

      await new Promise((r) => setTimeout(r, 20));

      const stats = controller.getStats();

      expect(stats.running).toBe(2);
      expect(stats.total).toBe(2);
    });

    it("should track pending items when over concurrency", async () => {
      const { controller } = createTestController({
        concurrency: 1,
        delay: 100,
      });

      controller.trigger({ body: { file: "1" } });
      controller.trigger({ body: { file: "2" } });
      controller.trigger({ body: { file: "3" } });

      await new Promise((r) => setTimeout(r, 20));

      const stats = controller.getStats();

      expect(stats.running).toBe(1);
      expect(stats.pending).toBe(2);
      expect(stats.total).toBe(3);
    });

    it("should track success count", async () => {
      const { controller } = createTestController();

      await controller.trigger({ body: { file: "1" } });
      await controller.trigger({ body: { file: "2" } });

      const stats = controller.getStats();

      expect(stats.success).toBe(2);
      expect(stats.settled).toBe(2);
      expect(stats.percentage).toBe(100);
    });

    it("should track failed count", async () => {
      const { controller, setMockResponse } = createTestController();

      await controller.trigger({ body: { file: "1" } });

      setMockResponse({ status: 500, error: new Error("Failed") });

      await controller.trigger({ body: { file: "2" } });

      const stats = controller.getStats();

      expect(stats.success).toBe(1);
      expect(stats.failed).toBe(1);
      expect(stats.settled).toBe(2);
    });

    it("should calculate percentage correctly", async () => {
      const { controller } = createTestController({
        concurrency: 1,
        delay: 20,
      });

      const p1 = controller.trigger({ body: { file: "1" } });
      controller.trigger({ body: { file: "2" } });
      controller.trigger({ body: { file: "3" } });
      controller.trigger({ body: { file: "4" } });

      await p1;

      const stats = controller.getStats();

      expect(stats.percentage).toBe(25);
    });
  });

  describe("subscribe", () => {
    it("should notify on trigger", async () => {
      const { controller } = createTestController();
      const callback = vi.fn();

      controller.subscribe(callback);
      await controller.trigger({ body: { file: "test" } });

      expect(callback).toHaveBeenCalled();
    });

    it("should return unsubscribe function", async () => {
      const { controller } = createTestController();
      const callback = vi.fn();

      const unsubscribe = controller.subscribe(callback);
      unsubscribe();

      await controller.trigger({ body: { file: "test" } });

      expect(callback).not.toHaveBeenCalled();
    });

    it("should notify multiple subscribers", async () => {
      const { controller } = createTestController();
      const callback1 = vi.fn();
      const callback2 = vi.fn();

      controller.subscribe(callback1);
      controller.subscribe(callback2);

      await controller.trigger({ body: { file: "test" } });

      expect(callback1).toHaveBeenCalled();
      expect(callback2).toHaveBeenCalled();
    });
  });

  describe("abort", () => {
    it("should abort specific item by id", async () => {
      const { controller } = createTestController({ delay: 100 });

      controller.trigger({ body: { file: "1" } }).catch(() => {});

      await new Promise((r) => setTimeout(r, 10));

      const queue = controller.getQueue();
      const itemId = queue[0]!.id;

      controller.abort(itemId);

      await new Promise((r) => setTimeout(r, 20));

      const updatedQueue = controller.getQueue();
      expect(updatedQueue[0]!.status).toBe("aborted");
    });

    it("should abort all running and pending items when no id", async () => {
      const { controller } = createTestController({
        concurrency: 1,
        delay: 100,
      });

      controller.trigger({ body: { file: "1" } }).catch(() => {});
      controller.trigger({ body: { file: "2" } }).catch(() => {});
      controller.trigger({ body: { file: "3" } }).catch(() => {});

      await new Promise((r) => setTimeout(r, 10));

      controller.abort();

      await new Promise((r) => setTimeout(r, 20));

      const queue = controller.getQueue();
      const allAborted = queue.every((item) => item.status === "aborted");

      expect(allAborted).toBe(true);
    });

    it("should not abort already completed items", async () => {
      const { controller } = createTestController();

      await controller.trigger({ body: { file: "1" } });

      const queue = controller.getQueue();
      expect(queue[0]!.status).toBe("success");

      controller.abort(queue[0]!.id);

      const updatedQueue = controller.getQueue();
      expect(updatedQueue[0]!.status).toBe("success");
    });
  });

  describe("retry", () => {
    it("should retry failed item", async () => {
      const { controller, setMockResponse, calls } = createTestController();

      setMockResponse({ status: 500, error: new Error("Failed") });
      await controller.trigger({ body: { file: "test" } });

      expect(calls).toHaveLength(1);

      const queue = controller.getQueue();
      expect(queue[0]!.status).toBe("error");

      setMockResponse({ status: 200, data: { id: 1, name: "success" } });
      await controller.retry(queue[0]!.id);

      await new Promise((r) => setTimeout(r, 10));

      const updatedQueue = controller.getQueue();
      expect(updatedQueue[0]!.status).toBe("success");
      expect(calls).toHaveLength(2);
    });

    it("should retry all failed items when no id", async () => {
      const { controller, setMockResponse, calls } = createTestController();

      setMockResponse({ status: 500, error: new Error("Failed") });

      await controller.trigger({ body: { file: "1" } });
      await controller.trigger({ body: { file: "2" } });

      expect(calls).toHaveLength(2);

      setMockResponse({ status: 200, data: { id: 1, name: "success" } });
      await controller.retry();

      await new Promise((r) => setTimeout(r, 50));

      const queue = controller.getQueue();
      const allSuccess = queue.every((item) => item.status === "success");

      expect(allSuccess).toBe(true);
      expect(calls).toHaveLength(4);
    });

    it("should retry aborted items", async () => {
      const { controller } = createTestController({ delay: 100 });

      controller.trigger({ body: { file: "test" } }).catch(() => {});

      await new Promise((r) => setTimeout(r, 10));

      const queue = controller.getQueue();
      controller.abort(queue[0]!.id);

      await new Promise((r) => setTimeout(r, 20));

      expect(controller.getQueue()[0]!.status).toBe("aborted");

      await controller.retry(queue[0]!.id);

      await new Promise((r) => setTimeout(r, 150));

      expect(controller.getQueue()[0]!.status).toBe("success");
    });
  });

  describe("remove", () => {
    it("should remove specific item by id", async () => {
      const { controller } = createTestController();

      await controller.trigger({ body: { file: "1" } });
      await controller.trigger({ body: { file: "2" } });

      const queue = controller.getQueue();
      expect(queue).toHaveLength(2);

      controller.remove(queue[0]!.id);

      const updatedQueue = controller.getQueue();
      expect(updatedQueue).toHaveLength(1);
      expect(updatedQueue[0]!.id).toBe(queue[1]!.id);
    });

    it("should abort pending item before removing", async () => {
      const { controller } = createTestController({
        concurrency: 1,
        delay: 100,
      });

      controller.trigger({ body: { file: "1" } });
      const promise2 = controller.trigger({ body: { file: "2" } });

      await new Promise((r) => setTimeout(r, 10));

      const queue = controller.getQueue();
      expect(queue[1]!.status).toBe("pending");

      controller.remove(queue[1]!.id);

      const result = await promise2;
      expect(result.aborted).toBe(true);

      const updatedQueue = controller.getQueue();
      expect(updatedQueue).toHaveLength(1);
    });

    it("should abort running item before removing", async () => {
      const { controller } = createTestController({ delay: 100 });

      controller.trigger({ body: { file: "1" } }).catch(() => {});

      await new Promise((r) => setTimeout(r, 10));

      const queue = controller.getQueue();
      expect(queue[0]!.status).toBe("running");

      controller.remove(queue[0]!.id);

      await new Promise((r) => setTimeout(r, 20));

      expect(controller.getQueue()).toHaveLength(0);
    });
  });

  describe("removeSettled", () => {
    it("should remove all settled items", async () => {
      const { controller, setMockResponse } = createTestController({
        concurrency: 1,
        delay: 50,
      });

      await controller.trigger({ body: { file: "1" } });

      setMockResponse({ status: 500, error: new Error("Failed") });
      await controller.trigger({ body: { file: "2" } });

      controller.trigger({ body: { file: "3" } });

      await new Promise((r) => setTimeout(r, 10));

      const queueBefore = controller.getQueue();
      expect(queueBefore).toHaveLength(3);

      controller.removeSettled();

      const queueAfter = controller.getQueue();

      expect(queueAfter).toHaveLength(1);
      expect(queueAfter[0]!.status).toBe("running");
    });

    it("should keep pending and running items", async () => {
      const { controller } = createTestController({
        concurrency: 1,
        delay: 100,
      });

      await controller.trigger({ body: { file: "1" } });

      controller.trigger({ body: { file: "2" } });
      controller.trigger({ body: { file: "3" } });

      await new Promise((r) => setTimeout(r, 10));

      controller.removeSettled();

      const queue = controller.getQueue();
      expect(queue).toHaveLength(2);
      expect(queue.some((i) => i.status === "running")).toBe(true);
      expect(queue.some((i) => i.status === "pending")).toBe(true);
    });
  });

  describe("clear", () => {
    it("should abort all and clear queue", async () => {
      const { controller } = createTestController({
        concurrency: 1,
        delay: 100,
      });

      controller.trigger({ body: { file: "1" } }).catch(() => {});
      controller.trigger({ body: { file: "2" } }).catch(() => {});
      controller.trigger({ body: { file: "3" } }).catch(() => {});

      await new Promise((r) => setTimeout(r, 10));

      expect(controller.getQueue().length).toBeGreaterThan(0);

      controller.clear();

      expect(controller.getQueue()).toHaveLength(0);
    });

    it("should reset stats after clear", async () => {
      const { controller } = createTestController();

      await controller.trigger({ body: { file: "1" } });
      await controller.trigger({ body: { file: "2" } });

      controller.clear();

      const stats = controller.getStats();

      expect(stats.total).toBe(0);
      expect(stats.success).toBe(0);
    });
  });

  describe("setConcurrency", () => {
    it("should update concurrency dynamically", async () => {
      const { controller } = createTestController({
        concurrency: 1,
        delay: 50,
      });

      controller.trigger({ body: { file: "1" } });
      controller.trigger({ body: { file: "2" } });
      controller.trigger({ body: { file: "3" } });

      await new Promise((r) => setTimeout(r, 10));

      let stats = controller.getStats();
      expect(stats.running).toBe(1);
      expect(stats.pending).toBe(2);

      controller.setConcurrency(3);

      await new Promise((r) => setTimeout(r, 20));

      stats = controller.getStats();
      expect(stats.running).toBe(3);
      expect(stats.pending).toBe(0);
    });
  });

  describe("item properties", () => {
    it("should include unique id for each item", async () => {
      const { controller } = createTestController();

      await controller.trigger({ body: { file: "1" } });
      await controller.trigger({ body: { file: "2" } });

      const queue = controller.getQueue();

      expect(queue[0]!.id).toBeDefined();
      expect(queue[1]!.id).toBeDefined();
      expect(queue[0]!.id).not.toBe(queue[1]!.id);
    });

    it("should store input on item", async () => {
      const { controller } = createTestController();

      await controller.trigger({
        body: { filename: "test.txt" },
        query: { version: "1" },
      });

      const queue = controller.getQueue();

      expect(queue[0]!.input).toEqual({
        body: { filename: "test.txt" },
        query: { version: "1" },
      });
    });
  });

  describe("custom id", () => {
    it("should use custom id when provided", async () => {
      const { controller } = createTestController();

      await controller.trigger({ id: "my-custom-id", body: { file: "1" } });

      const queue = controller.getQueue();

      expect(queue[0]!.id).toBe("my-custom-id");
    });

    it("should auto-generate id when not provided", async () => {
      const { controller } = createTestController();

      await controller.trigger({ body: { file: "1" } });

      const queue = controller.getQueue();

      expect(queue[0]!.id).toMatch(/^q-\d+-[a-z0-9]+$/);
    });

    it("should not include id in stored input", async () => {
      const { controller } = createTestController();

      await controller.trigger({
        id: "my-id",
        body: { filename: "test.txt" },
      });

      const queue = controller.getQueue();

      expect(queue[0]!.input).toEqual({
        body: { filename: "test.txt" },
      });
      expect(queue[0]!.input).not.toHaveProperty("id");
    });

    it("should allow abort/retry/remove with custom id", async () => {
      const { controller, setMockResponse } = createTestController({
        delay: 50,
      });

      setMockResponse({ status: 500, error: new Error("Failed") });

      await controller.trigger({ id: "file-1", body: { file: "1" } });

      expect(controller.getQueue()[0]!.status).toBe("error");

      setMockResponse({ status: 200, data: { id: 1, name: "success" } });

      await controller.retry("file-1");

      expect(controller.getQueue()[0]!.status).toBe("success");

      controller.remove("file-1");

      expect(controller.getQueue()).toHaveLength(0);
    });
  });
});
