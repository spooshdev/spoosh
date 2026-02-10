import type { CacheEntry, OperationState } from "../plugins/types";
import { sortObjectKeys } from "../utils/sortObjectKeys";

type Subscriber = () => void;

export type CacheEntryWithKey<TData = unknown, TError = unknown> = {
  key: string;
  entry: CacheEntry<TData, TError>;
};

export function createInitialState<TData, TError>(): OperationState<
  TData,
  TError
> {
  return {
    data: undefined,
    error: undefined,
    timestamp: 0,
  };
}

function generateSelfTagFromKey(key: string): string | undefined {
  try {
    const parsed = JSON.parse(key) as { path?: string };
    return parsed.path;
  } catch {
    return undefined;
  }
}

export type StateManager = {
  createQueryKey: (params: {
    path: string;
    method: string;
    options?: unknown;
  }) => string;

  getCache: <TData, TError>(
    key: string
  ) => CacheEntry<TData, TError> | undefined;

  setCache: <TData, TError>(
    key: string,
    entry: Partial<CacheEntry<TData, TError>>
  ) => void;

  deleteCache: (key: string) => void;

  subscribeCache: (key: string, callback: Subscriber) => () => void;

  getCacheByTags: <TData>(tags: string[]) => CacheEntry<TData> | undefined;

  getCacheEntriesByTags: <TData, TError>(
    tags: string[]
  ) => CacheEntryWithKey<TData, TError>[];

  getCacheEntriesBySelfTag: <TData, TError>(
    selfTag: string
  ) => CacheEntryWithKey<TData, TError>[];

  setMeta: (key: string, data: Record<string, unknown>) => void;

  /** Mark all cache entries with matching tags as stale */
  markStale: (tags: string[]) => void;

  /** Get all cache entries */
  getAllCacheEntries: <TData, TError>() => CacheEntryWithKey<TData, TError>[];

  /** Get the number of cache entries */
  getSize: () => number;

  /** Get the number of active subscribers for a cache key */
  getSubscribersCount: (key: string) => number;

  /** Set a pending promise for a query key (for deduplication) */
  setPendingPromise: (
    key: string,
    promise: Promise<unknown> | undefined
  ) => void;

  /** Get a pending promise for a query key */
  getPendingPromise: (key: string) => Promise<unknown> | undefined;

  clear: () => void;
};

export function createStateManager(): StateManager {
  const cache = new Map<string, CacheEntry>();
  const subscribers = new Map<string, Set<Subscriber>>();
  const pendingPromises = new Map<string, Promise<unknown>>();

  const notifySubscribers = (key: string): void => {
    const subs = subscribers.get(key);
    subs?.forEach((cb) => cb());
  };

  return {
    createQueryKey({ path, method, options }) {
      return JSON.stringify(
        sortObjectKeys({
          path,
          method,
          options,
        })
      );
    },

    getCache<TData, TError>(key: string) {
      return cache.get(key) as CacheEntry<TData, TError> | undefined;
    },

    setCache(key, entry) {
      const existing = cache.get(key);

      if (existing) {
        existing.state = { ...existing.state, ...entry.state };

        if (entry.tags) {
          existing.tags = entry.tags;
        }

        if ("previousData" in entry) {
          existing.previousData = entry.previousData;
        }

        if (entry.stale !== undefined) {
          existing.stale = entry.stale;
        }

        notifySubscribers(key);
      } else {
        const newEntry: CacheEntry = {
          state: entry.state ?? createInitialState(),
          tags: entry.tags ?? [],
          meta: new Map(),
          selfTag: generateSelfTagFromKey(key),
          previousData: entry.previousData,
          stale: entry.stale,
        };
        cache.set(key, newEntry);
        notifySubscribers(key);
      }
    },

    deleteCache(key) {
      cache.delete(key);
    },

    subscribeCache(key, callback) {
      let subs = subscribers.get(key);

      if (!subs) {
        subs = new Set();
        subscribers.set(key, subs);
      }

      subs.add(callback);

      return () => {
        subs.delete(callback);

        if (subs.size === 0) {
          subscribers.delete(key);
        }
      };
    },

    getCacheByTags<TData>(tags: string[]) {
      for (const entry of cache.values()) {
        const hasMatch = entry.tags.some((tag) => tags.includes(tag));

        if (hasMatch && entry.state.data !== undefined) {
          return entry as CacheEntry<TData>;
        }
      }

      return undefined;
    },

    getCacheEntriesByTags<TData, TError>(tags: string[]) {
      const entries: CacheEntryWithKey<TData, TError>[] = [];

      cache.forEach((entry, key) => {
        const hasMatch = entry.tags.some((tag) => tags.includes(tag));

        if (hasMatch) {
          entries.push({
            key,
            entry: entry as CacheEntry<TData, TError>,
          });
        }
      });

      return entries;
    },

    getCacheEntriesBySelfTag<TData, TError>(selfTag: string) {
      const entries: CacheEntryWithKey<TData, TError>[] = [];

      cache.forEach((entry, key) => {
        if (entry.selfTag === selfTag) {
          entries.push({
            key,
            entry: entry as CacheEntry<TData, TError>,
          });
        }
      });

      return entries;
    },

    setMeta(key, data) {
      let entry = cache.get(key);

      if (!entry) {
        entry = {
          state: createInitialState(),
          tags: [],
          meta: new Map(),
          selfTag: generateSelfTagFromKey(key),
        };
        cache.set(key, entry);
      }

      for (const [name, value] of Object.entries(data)) {
        entry.meta.set(name, value);
      }

      entry.state = { ...entry.state };
      notifySubscribers(key);
    },

    markStale(tags) {
      cache.forEach((entry) => {
        const hasMatch = entry.tags.some((tag) => tags.includes(tag));

        if (hasMatch) {
          entry.stale = true;
        }
      });
    },

    getAllCacheEntries<TData, TError>() {
      const entries: CacheEntryWithKey<TData, TError>[] = [];

      cache.forEach((entry, key) => {
        entries.push({
          key,
          entry: entry as CacheEntry<TData, TError>,
        });
      });

      return entries;
    },

    getSize() {
      return cache.size;
    },

    getSubscribersCount(key: string) {
      return subscribers.get(key)?.size ?? 0;
    },

    setPendingPromise(key, promise) {
      if (promise === undefined) {
        pendingPromises.delete(key);
      } else {
        pendingPromises.set(key, promise);
      }
    },

    getPendingPromise(key) {
      return pendingPromises.get(key);
    },

    clear() {
      cache.clear();
      subscribers.clear();
      pendingPromises.clear();
    },
  };
}
