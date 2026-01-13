import type { StateManager } from "../state/manager";

const DEFAULT_PROMISE_TIMEOUT = 30000;

export type PromiseCacheOptions = {
  stateManager: StateManager;
  queryKey: string;
  tags?: string[];
  timeout?: number;
};

export type PromiseCacheResult = {
  clearPromise: () => void;
};

/**
 * Stores a promise in cache with automatic cleanup and timeout safety.
 * Prevents memory leaks from promises that never settle.
 */
export function storePromiseInCache<T>(
  promise: Promise<T>,
  options: PromiseCacheOptions
): PromiseCacheResult {
  const {
    stateManager,
    queryKey,
    tags,
    timeout = DEFAULT_PROMISE_TIMEOUT,
  } = options;

  let promiseCleared = false;

  const clearPromise = () => {
    if (promiseCleared) return;

    promiseCleared = true;
    stateManager.setCache(queryKey, { promise: undefined });
  };

  stateManager.setCache(queryKey, { promise, tags });

  const timeoutId = setTimeout(() => {
    clearPromise();
  }, timeout);

  promise.finally(() => {
    clearTimeout(timeoutId);
    clearPromise();
  });

  return { clearPromise };
}
