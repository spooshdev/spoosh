import type { CacheEntry, OperationState } from "../plugins/types";
import { sortObjectKeys } from "../utils/sortObjectKeys";

type Subscriber = () => void;
type InvalidateListener = (tags: string[]) => void;

type ParsedRequest = {
  query?: Record<string, unknown>;
  params?: Record<string, unknown>;
  body?: unknown;
};

function parseRequestFromKey(key: string): ParsedRequest | undefined {
  try {
    const parsed = JSON.parse(key) as {
      options?: { query?: unknown; params?: unknown; body?: unknown };
    };

    return {
      query: parsed.options?.query as Record<string, unknown> | undefined,
      params: parsed.options?.params as Record<string, unknown> | undefined,
      body: parsed.options?.body,
    };
  } catch {
    return undefined;
  }
}

function getExactPath(tags: string[]): string | undefined {
  return tags.length > 0 ? tags[tags.length - 1] : undefined;
}

function createInitialState<TData, TError>(): OperationState<TData, TError> {
  return {
    loading: false,
    fetching: false,
    data: undefined,
    error: undefined,
    isOptimistic: false,
    isStale: true,
    timestamp: 0,
  };
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

  isStale: (key: string, staleTime: number) => boolean;

  invalidateByTags: (tags: string[]) => void;

  getCacheByTags: <TData>(tags: string[]) => CacheEntry<TData> | undefined;

  setOptimistic: <TData>(
    tags: string[],
    updater: (data: TData) => TData,
    match?: (request: ParsedRequest) => boolean
  ) => string[];

  confirmOptimistic: (keys: string[]) => void;

  rollbackOptimistic: (keys: string[]) => void;

  onInvalidate: (callback: InvalidateListener) => () => void;

  clear: () => void;
};

export function createStateManager(): StateManager {
  const cache = new Map<string, CacheEntry>();
  const invalidateListeners = new Set<InvalidateListener>();

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

        if (entry.promise !== undefined) {
          existing.promise = entry.promise;
        }

        if (entry.previousData !== undefined) {
          existing.previousData = entry.previousData;
        }

        existing.subscribers.forEach((cb) => cb());
      } else {
        const newEntry: CacheEntry = {
          state: entry.state ?? createInitialState(),
          tags: entry.tags ?? [],
          subscribers: new Set(),
          promise: entry.promise,
          previousData: entry.previousData,
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
          subscribers: new Set(),
        };
        cache.set(key, entry);
      }

      entry.subscribers.add(callback);

      return () => {
        entry.subscribers.delete(callback);
      };
    },

    isStale(key, staleTime) {
      const entry = cache.get(key);

      if (!entry) return true;

      return Date.now() - entry.state.timestamp > staleTime;
    },

    invalidateByTags(tags) {
      cache.forEach((entry) => {
        const hasMatch = entry.tags.some((tag) => tags.includes(tag));

        if (hasMatch) {
          entry.state.timestamp = 0;
          entry.state.isStale = true;
          delete entry.promise;
          entry.subscribers.forEach((cb) => cb());
        }
      });

      invalidateListeners.forEach((listener) => listener(tags));
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

    setOptimistic<TData>(
      tags: string[],
      updater: (data: TData) => TData,
      match?: (request: ParsedRequest) => boolean
    ) {
      const affectedKeys: string[] = [];
      const targetExactPath = getExactPath(tags);

      if (!targetExactPath) {
        return affectedKeys;
      }

      cache.forEach((entry, key) => {
        if (key.includes('"type":"infinite-tracker"')) return;

        if (match) {
          const request = parseRequestFromKey(key);
          if (!request || !match(request)) return;
        }

        const entryExactPath = getExactPath(entry.tags);
        const isExactMatch = entryExactPath === targetExactPath;

        if (isExactMatch && entry.state.data !== undefined) {
          entry.previousData = entry.state.data;
          entry.state.data = updater(entry.state.data as TData);
          entry.state.isOptimistic = true;
          entry.subscribers.forEach((cb) => cb());
          affectedKeys.push(key);
        }
      });

      return affectedKeys;
    },

    confirmOptimistic(keys) {
      keys.forEach((key) => {
        const entry = cache.get(key);

        if (entry) {
          entry.state.isOptimistic = false;
          delete entry.previousData;
        }
      });
    },

    rollbackOptimistic(keys) {
      keys.forEach((key) => {
        const entry = cache.get(key);

        if (entry && entry.previousData !== undefined) {
          entry.state.data = entry.previousData;
          entry.state.isOptimistic = false;
          delete entry.previousData;
          entry.subscribers.forEach((cb) => cb());
        }
      });
    },

    onInvalidate(callback) {
      invalidateListeners.add(callback);
      return () => invalidateListeners.delete(callback);
    },

    clear() {
      cache.clear();
      invalidateListeners.clear();
    },
  };
}

let defaultStateManager: StateManager | null = null;

export function getDefaultStateManager(): StateManager {
  if (!defaultStateManager) {
    defaultStateManager = createStateManager();
  }

  return defaultStateManager;
}

export function resetDefaultStateManager(): void {
  defaultStateManager?.clear();
  defaultStateManager = null;
}
