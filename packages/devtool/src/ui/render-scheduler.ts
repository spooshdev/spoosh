export interface RenderScheduler {
  schedule(callback: () => void): void;
  immediate(callback: () => void): void;
  cancel(): void;
}

const MIN_INTERVAL = 150;

export function createRenderScheduler(): RenderScheduler {
  let scheduled = false;
  let rafId: number | null = null;
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  let lastRenderTime = 0;

  function cancel(): void {
    if (rafId !== null) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }

    if (timeoutId !== null) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }

    scheduled = false;
  }

  function schedule(callback: () => void): void {
    if (scheduled) return;

    const now = performance.now();
    const elapsed = now - lastRenderTime;

    if (elapsed >= MIN_INTERVAL) {
      scheduled = true;
      rafId = requestAnimationFrame(() => {
        scheduled = false;
        rafId = null;
        lastRenderTime = performance.now();
        callback();
      });
    } else {
      scheduled = true;
      timeoutId = setTimeout(() => {
        scheduled = false;
        timeoutId = null;
        lastRenderTime = performance.now();
        callback();
      }, MIN_INTERVAL - elapsed);
    }
  }

  function immediate(callback: () => void): void {
    cancel();
    lastRenderTime = performance.now();
    callback();
  }

  return {
    schedule,
    immediate,
    cancel,
  };
}
