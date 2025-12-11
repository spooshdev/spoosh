import type { TrackedCall } from "./types";
import { sortObjectKeys } from "../utils/sortObjectKeys";

export type CacheEntry<TData = unknown, TError = unknown> = {
  data: TData | undefined;
  error: TError | undefined;
  timestamp: number;
  promise?: Promise<void>;
  tags: string[];
  subscribers: Set<() => void>;
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
      entry.data = undefined;
      entry.error = undefined;
      entry.timestamp = 0;
      delete entry.promise;
    }
  });
}
