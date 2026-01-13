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
    loading: false,
    fetching: false,
    data: undefined,
    error: undefined,
    timestamp: 0,
  };
}

function generateSelfTagFromKey(key: string): string | undefined {
  try {
    const parsed = JSON.parse(key) as { path?: string[] };
    return parsed.path?.join("/");
  } catch {
    return undefined;
  }
}

export type StateManager = {
  createQueryKey: (params: {
    path: string[];
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

  setPluginResult: (key: string, data: Record<string, unknown>) => void;

  /** Mark all cache entries with matching tags as stale */
  markStale: (tags: string[]) => void;

  clear: () => void;
};

export function createStateManager(): StateManager {
  const cache = new Map<string, CacheEntry>();

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
        const hasData = entry.state && "data" in entry.state;
        const hasError = entry.state && "error" in entry.state;

        if (hasData || hasError) {
          delete existing.promise;
        }

        existing.state = { ...existing.state, ...entry.state };

        if (entry.tags) {
          existing.tags = entry.tags;
        }

        if ("promise" in entry) {
          existing.promise = entry.promise;
        }

        if (entry.previousData !== undefined) {
          existing.previousData = entry.previousData;
        }

        if (entry.stale !== undefined) {
          existing.stale = entry.stale;
        }

        existing.subscribers.forEach((cb) => cb());
      } else {
        const newEntry: CacheEntry = {
          state: entry.state ?? createInitialState(),
          tags: entry.tags ?? [],
          pluginResult: new Map(),
          selfTag: generateSelfTagFromKey(key),
          subscribers: new Set(),
          promise: entry.promise,
          previousData: entry.previousData,
          stale: entry.stale,
        };
        cache.set(key, newEntry);
      }
    },

    deleteCache(key) {
      cache.delete(key);
    },

    subscribeCache(key, callback) {
      let entry = cache.get(key);

      if (!entry) {
        entry = {
          state: createInitialState(),
          tags: [],
          pluginResult: new Map(),
          selfTag: generateSelfTagFromKey(key),
          subscribers: new Set(),
        };
        cache.set(key, entry);
      }

      entry.subscribers.add(callback);

      return () => {
        entry.subscribers.delete(callback);
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

    setPluginResult(key, data) {
      const entry = cache.get(key);

      if (entry) {
        for (const [name, value] of Object.entries(data)) {
          entry.pluginResult.set(name, value);
        }

        entry.subscribers.forEach((cb) => cb());
      }
    },

    markStale(tags) {
      cache.forEach((entry) => {
        const hasMatch = entry.tags.some((tag) => tags.includes(tag));

        if (hasMatch) {
          entry.stale = true;
        }
      });
    },

    clear() {
      cache.clear();
    },
  };
}
