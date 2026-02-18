import type { CacheEntry } from "../plugins/types";

export type Subscriber = () => void;

export type DataChangeCallback = (
  key: string,
  oldData: unknown,
  newData: unknown
) => void;

export type CacheEntryWithKey<TData = unknown, TError = unknown> = {
  key: string;
  entry: CacheEntry<TData, TError>;
};

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

  /**
   * Register a callback to be invoked when cache data changes.
   * @returns Unsubscribe function
   */
  onDataChange: (callback: DataChangeCallback) => () => void;

  clear: () => void;
};
