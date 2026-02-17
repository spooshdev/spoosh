/**
 * Semaphore for controlling concurrent access.
 * Used to limit the number of concurrent operations in the queue.
 */
export class Semaphore {
  private current = 0;
  private waiting: Array<(acquired: boolean) => void> = [];

  constructor(private max: number) {}

  async acquire(): Promise<boolean> {
    if (this.current < this.max) {
      this.current++;
      return true;
    }

    return new Promise((resolve) => this.waiting.push(resolve));
  }

  release(): void {
    if (this.current > 0) {
      this.current--;
    }

    if (this.waiting.length > 0) {
      this.current++;
      this.waiting.shift()!(true);
    }
  }

  setConcurrency(max: number): void {
    const previousMax = this.max;
    this.max = max;

    if (max > previousMax) {
      const slotsToRelease = Math.min(max - previousMax, this.waiting.length);

      for (let i = 0; i < slotsToRelease; i++) {
        this.current++;
        this.waiting.shift()!(true);
      }
    }
  }

  reset(): void {
    this.current = 0;

    while (this.waiting.length > 0) {
      const resolve = this.waiting.shift()!;
      resolve(false);
    }
  }

  getCurrent(): number {
    return this.current;
  }

  getWaitingCount(): number {
    return this.waiting.length;
  }
}
