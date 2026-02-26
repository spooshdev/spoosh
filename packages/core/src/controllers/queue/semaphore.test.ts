import { describe, it, expect } from "vitest";
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

    it("should block when at limit", async () => {
      const semaphore = new Semaphore(1);

      await semaphore.acquire();

      let acquired = false;
      const acquirePromise = semaphore.acquire().then(() => {
        acquired = true;
      });

      await new Promise((r) => setTimeout(r, 10));
      expect(acquired).toBe(false);

      semaphore.release();
      await acquirePromise;

      expect(acquired).toBe(true);
    });

    it("should process waiting requests in order", async () => {
      const semaphore = new Semaphore(1);
      const order: number[] = [];

      await semaphore.acquire();

      const p1 = semaphore.acquire().then(() => order.push(1));
      const p2 = semaphore.acquire().then(() => order.push(2));
      const p3 = semaphore.acquire().then(() => order.push(3));

      semaphore.release();
      await p1;
      semaphore.release();
      await p2;
      semaphore.release();
      await p3;

      expect(order).toEqual([1, 2, 3]);
    });
  });

  describe("release", () => {
    it("should decrease current count", async () => {
      const semaphore = new Semaphore(2);

      await semaphore.acquire();
      expect(semaphore.getCurrent()).toBe(1);

      semaphore.release();
      expect(semaphore.getCurrent()).toBe(0);
    });

    it("should not go below zero", () => {
      const semaphore = new Semaphore(1);

      semaphore.release();
      semaphore.release();
      semaphore.release();

      expect(semaphore.getCurrent()).toBe(0);
    });

    it("should wake up waiting acquirer", async () => {
      const semaphore = new Semaphore(1);

      await semaphore.acquire();

      let wokenUp = false;
      const waitingPromise = semaphore.acquire().then(() => {
        wokenUp = true;
      });

      expect(wokenUp).toBe(false);

      semaphore.release();
      await waitingPromise;

      expect(wokenUp).toBe(true);
    });
  });

  describe("setConcurrency", () => {
    it("should increase concurrency and release waiting", async () => {
      const semaphore = new Semaphore(1);

      await semaphore.acquire();

      let acquired1 = false;
      let acquired2 = false;

      semaphore.acquire().then(() => {
        acquired1 = true;
      });
      semaphore.acquire().then(() => {
        acquired2 = true;
      });

      await new Promise((r) => setTimeout(r, 10));
      expect(acquired1).toBe(false);
      expect(acquired2).toBe(false);

      semaphore.setConcurrency(3);

      await new Promise((r) => setTimeout(r, 10));

      expect(acquired1).toBe(true);
      expect(acquired2).toBe(true);
    });

    it("should not release more than new capacity allows", async () => {
      const semaphore = new Semaphore(1);

      await semaphore.acquire();

      let count = 0;
      semaphore.acquire().then(() => count++);
      semaphore.acquire().then(() => count++);
      semaphore.acquire().then(() => count++);

      semaphore.setConcurrency(2);

      await new Promise((r) => setTimeout(r, 10));

      expect(count).toBe(1);
      expect(semaphore.getWaitingCount()).toBe(2);
    });

    it("should not release waiting when decreasing concurrency", async () => {
      const semaphore = new Semaphore(3);

      await semaphore.acquire();
      await semaphore.acquire();
      await semaphore.acquire();

      let acquired = false;
      semaphore.acquire().then(() => {
        acquired = true;
      });

      semaphore.setConcurrency(1);

      semaphore.release();
      await new Promise((r) => setTimeout(r, 10));

      expect(acquired).toBe(false);
      expect(semaphore.getCurrent()).toBe(2);
    });

    it("should respect new lower limit after tasks complete", async () => {
      const semaphore = new Semaphore(3);

      await semaphore.acquire();
      await semaphore.acquire();
      await semaphore.acquire();

      let acquiredCount = 0;
      semaphore.acquire().then(() => acquiredCount++);
      semaphore.acquire().then(() => acquiredCount++);

      semaphore.setConcurrency(2);

      semaphore.release();
      await new Promise((r) => setTimeout(r, 10));
      expect(acquiredCount).toBe(0);
      expect(semaphore.getCurrent()).toBe(2);

      semaphore.release();
      await new Promise((r) => setTimeout(r, 10));
      expect(acquiredCount).toBe(1);
      expect(semaphore.getCurrent()).toBe(2);

      semaphore.release();
      await new Promise((r) => setTimeout(r, 10));
      expect(acquiredCount).toBe(2);
      expect(semaphore.getCurrent()).toBe(2);
    });

    it("should allow new acquisitions only when below new limit", async () => {
      const semaphore = new Semaphore(5);

      await semaphore.acquire();
      await semaphore.acquire();
      await semaphore.acquire();

      semaphore.setConcurrency(2);

      semaphore.release();
      semaphore.release();

      expect(semaphore.getCurrent()).toBe(1);

      const acquired = await semaphore.acquire();
      expect(acquired).toBe(true);
      expect(semaphore.getCurrent()).toBe(2);

      let blocked = true;
      semaphore.acquire().then(() => {
        blocked = false;
      });

      await new Promise((r) => setTimeout(r, 10));
      expect(blocked).toBe(true);
    });
  });

  describe("reset", () => {
    it("should reset current count to zero", async () => {
      const semaphore = new Semaphore(3);

      await semaphore.acquire();
      await semaphore.acquire();

      expect(semaphore.getCurrent()).toBe(2);

      semaphore.reset();

      expect(semaphore.getCurrent()).toBe(0);
    });

    it("should reject all waiting with false", async () => {
      const semaphore = new Semaphore(1);

      await semaphore.acquire();

      const results: boolean[] = [];

      semaphore.acquire().then((r) => results.push(r));
      semaphore.acquire().then((r) => results.push(r));

      semaphore.reset();

      await new Promise((r) => setTimeout(r, 10));

      expect(results).toEqual([false, false]);
    });
  });

  describe("getCurrent", () => {
    it("should return current acquired count", async () => {
      const semaphore = new Semaphore(5);

      expect(semaphore.getCurrent()).toBe(0);

      await semaphore.acquire();
      expect(semaphore.getCurrent()).toBe(1);

      await semaphore.acquire();
      expect(semaphore.getCurrent()).toBe(2);

      semaphore.release();
      expect(semaphore.getCurrent()).toBe(1);
    });
  });

  describe("getWaitingCount", () => {
    it("should return number of waiting requests", async () => {
      const semaphore = new Semaphore(1);

      await semaphore.acquire();

      expect(semaphore.getWaitingCount()).toBe(0);

      semaphore.acquire();
      semaphore.acquire();

      expect(semaphore.getWaitingCount()).toBe(2);

      semaphore.release();

      await new Promise((r) => setTimeout(r, 10));

      expect(semaphore.getWaitingCount()).toBe(1);
    });
  });
});
