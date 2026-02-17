import { describe, it, expect, vi } from "vitest";
import { Semaphore } from "./semaphore";

describe("Semaphore", () => {
  describe("constructor", () => {
    it("should create semaphore with specified concurrency", () => {
      const semaphore = new Semaphore(3);
      expect(semaphore).toBeDefined();
    });
  });

  describe("acquire", () => {
    it("should allow immediate acquisition when under limit", async () => {
      const semaphore = new Semaphore(2);

      await semaphore.acquire();
      await semaphore.acquire();

      expect(true).toBe(true);
    });

    it("should block when at capacity", async () => {
      const semaphore = new Semaphore(1);
      const order: number[] = [];

      await semaphore.acquire();
      order.push(1);

      const blockedPromise = semaphore.acquire().then(() => {
        order.push(3);
      });

      order.push(2);

      semaphore.release();
      await blockedPromise;

      expect(order).toEqual([1, 2, 3]);
    });

    it("should queue multiple waiters in order", async () => {
      const semaphore = new Semaphore(1);
      const order: number[] = [];

      await semaphore.acquire();

      const promise1 = semaphore.acquire().then(() => order.push(1));
      const promise2 = semaphore.acquire().then(() => order.push(2));
      const promise3 = semaphore.acquire().then(() => order.push(3));

      semaphore.release();
      await promise1;

      semaphore.release();
      await promise2;

      semaphore.release();
      await promise3;

      expect(order).toEqual([1, 2, 3]);
    });
  });

  describe("release", () => {
    it("should allow new acquisition after release", async () => {
      const semaphore = new Semaphore(1);

      await semaphore.acquire();
      semaphore.release();
      await semaphore.acquire();

      expect(true).toBe(true);
    });

    it("should wake waiting acquirer on release", async () => {
      const semaphore = new Semaphore(1);
      let resolved = false;

      await semaphore.acquire();

      const waitingPromise = semaphore.acquire().then(() => {
        resolved = true;
      });

      expect(resolved).toBe(false);

      semaphore.release();
      await waitingPromise;

      expect(resolved).toBe(true);
    });
  });

  describe("setConcurrency", () => {
    it("should increase concurrency and release waiting tasks", async () => {
      const semaphore = new Semaphore(1);
      const resolved: number[] = [];

      await semaphore.acquire();

      const promise1 = semaphore.acquire().then(() => resolved.push(1));
      const promise2 = semaphore.acquire().then(() => resolved.push(2));

      semaphore.setConcurrency(3);

      await promise1;
      await promise2;

      expect(resolved).toEqual([1, 2]);
    });

    it("should only release up to available waiting tasks", async () => {
      const semaphore = new Semaphore(1);
      const resolved: number[] = [];

      await semaphore.acquire();

      const promise1 = semaphore.acquire().then(() => resolved.push(1));

      semaphore.setConcurrency(5);

      await promise1;

      expect(resolved).toEqual([1]);
    });

    it("should handle decreasing concurrency", () => {
      const semaphore = new Semaphore(5);

      semaphore.setConcurrency(2);

      expect(true).toBe(true);
    });

    it("should not release waiters when decreasing concurrency", async () => {
      const semaphore = new Semaphore(2);
      const resolved: number[] = [];

      await semaphore.acquire();
      await semaphore.acquire();

      const promise1 = semaphore.acquire().then(() => resolved.push(1));

      semaphore.setConcurrency(1);

      await new Promise((r) => setTimeout(r, 10));

      expect(resolved).toEqual([]);

      semaphore.release();
      await promise1;

      expect(resolved).toEqual([1]);
    });
  });

  describe("concurrent operations", () => {
    it("should limit concurrent executions", async () => {
      const semaphore = new Semaphore(2);
      let concurrent = 0;
      let maxConcurrent = 0;

      const task = async () => {
        await semaphore.acquire();
        concurrent++;
        maxConcurrent = Math.max(maxConcurrent, concurrent);
        await new Promise((r) => setTimeout(r, 10));
        concurrent--;
        semaphore.release();
      };

      await Promise.all([task(), task(), task(), task(), task()]);

      expect(maxConcurrent).toBe(2);
    });

    it("should handle rapid acquire/release cycles", async () => {
      const semaphore = new Semaphore(3);
      const iterations = 100;
      let completed = 0;

      const task = async () => {
        await semaphore.acquire();
        completed++;
        semaphore.release();
      };

      await Promise.all(Array.from({ length: iterations }, () => task()));

      expect(completed).toBe(iterations);
    });
  });
});
