import type { TrackedCall } from "./types";
import { sortObjectKeys } from "../utils/sortObjectKeys";

export type CacheEntry<TData = unknown, TError = unknown> = {
  data: TData | undefined;
  error: TError | undefined;
  timestamp: number;
  promise?: Promise<void>;
  tags: string[];
  subscribers: Set<() => void>;
  isOptimistic?: boolean;
  previousData?: TData;
};

const cache = new Map<string, CacheEntry>();

export function createQueryKey(tracked: TrackedCall): string {
  return JSON.stringify(
    sortObjectKeys({
      path: tracked.path,
      method: tracked.method,
      options: tracked.options,
    })
  );
}

export function getCache<TData, TError>(
  key: string
): CacheEntry<TData, TError> | undefined {
  return cache.get(key) as CacheEntry<TData, TError> | undefined;
}

export function setCache<TData, TError>(
  key: string,
  entry: Partial<CacheEntry<TData, TError>>
): void {
  const existing = cache.get(key);
  if (existing) {
    if ("data" in entry || "error" in entry) {
      delete existing.promise;
    }
    Object.assign(existing, entry);
    existing.subscribers.forEach((cb) => cb());
  } else {
    cache.set(key, {
      data: undefined,
      error: undefined,
      timestamp: 0,
      tags: [],
      subscribers: new Set(),
      ...entry,
    });
  }
}

export function subscribeCache(key: string, callback: () => void): () => void {
  let entry = cache.get(key);
  if (!entry) {
    cache.set(key, {
      data: undefined,
      error: undefined,
      timestamp: 0,
      tags: [],
      subscribers: new Set(),
    });
    entry = cache.get(key)!;
  }
  entry.subscribers.add(callback);
  return () => {
    entry.subscribers.delete(callback);
  };
}

export function isStale(key: string, staleTime: number): boolean {
  const entry = cache.get(key);
  if (!entry) return true;
  return Date.now() - entry.timestamp > staleTime;
}

export function clearCache(key?: string): void {
  if (key) {
    cache.delete(key);
  } else {
    cache.clear();
  }
}

export function clearCacheByTags(tags: string[]): void {
  cache.forEach((entry) => {
    const hasMatch = entry.tags.some((tag) => tags.includes(tag));
    if (hasMatch) {
      entry.timestamp = 0;
      delete entry.promise;
      entry.subscribers.forEach((cb) => cb());
    }
  });
}

export function getCacheByTags<TData>(
  tags: string[]
): CacheEntry<TData> | undefined {
  for (const entry of cache.values()) {
    const hasMatch = entry.tags.some((tag) => tags.includes(tag));
    if (hasMatch && entry.data !== undefined) {
      return entry as CacheEntry<TData>;
    }
  }
  return undefined;
}

export function setCacheOptimistic<TData>(
  tags: string[],
  updater: (data: TData) => TData
): string[] {
  const affectedKeys: string[] = [];

  cache.forEach((entry, key) => {
    const hasMatch = entry.tags.some((tag) => tags.includes(tag));
    if (hasMatch && entry.data !== undefined) {
      entry.previousData = entry.data;
      entry.data = updater(entry.data as TData);
      entry.isOptimistic = true;
      entry.subscribers.forEach((cb) => cb());
      affectedKeys.push(key);
    }
  });

  return affectedKeys;
}

export function confirmOptimistic(keys: string[]): void {
  keys.forEach((key) => {
    const entry = cache.get(key);
    if (entry) {
      delete entry.isOptimistic;
      delete entry.previousData;
    }
  });
}

export function rollbackOptimistic(keys: string[]): void {
  keys.forEach((key) => {
    const entry = cache.get(key);
    if (entry && entry.previousData !== undefined) {
      entry.data = entry.previousData;
      delete entry.isOptimistic;
      delete entry.previousData;
      entry.subscribers.forEach((cb) => cb());
    }
  });
}

export function updateCacheByTags<TData, TResponse>(
  tags: string[],
  updater: (data: TData, response: TResponse) => TData,
  response: TResponse
): void {
  cache.forEach((entry) => {
    const hasMatch = entry.tags.some((tag) => tags.includes(tag));
    if (hasMatch && entry.data !== undefined) {
      entry.data = updater(entry.data as TData, response);
      entry.timestamp = Date.now();
      entry.subscribers.forEach((cb) => cb());
    }
  });
}
