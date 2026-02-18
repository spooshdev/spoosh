import type { CacheEntry } from "../plugins/types";
import { sortObjectKeys } from "../utils/sortObjectKeys";
import type {
  CacheEntryWithKey,
  DataChangeCallback,
  StateManager,
  Subscriber,
} from "./types";
import { createInitialState, generateSelfTagFromKey } from "./utils";

export function createStateManager(): StateManager {
  const cache = new Map<string, CacheEntry>();
  const subscribers = new Map<string, Set<Subscriber>>();
  const pendingPromises = new Map<string, Promise<unknown>>();
  const dataChangeCallbacks = new Set<DataChangeCallback>();

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
      const oldData = existing?.state.data;

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

        const newData = existing.state.data;

        if (oldData !== newData) {
          dataChangeCallbacks.forEach((cb) => cb(key, oldData, newData));
        }
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

        const newData = newEntry.state.data;

        if (oldData !== newData) {
          dataChangeCallbacks.forEach((cb) => cb(key, oldData, newData));
        }
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

    onDataChange(callback) {
      dataChangeCallbacks.add(callback);

      return () => {
        dataChangeCallbacks.delete(callback);
      };
    },

    clear() {
      cache.clear();
      subscribers.clear();
      pendingPromises.clear();
      dataChangeCallbacks.clear();
    },
  };
}
