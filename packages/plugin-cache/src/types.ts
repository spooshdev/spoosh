export interface CachePluginConfig {
  /** Default stale time in milliseconds. Data older than this is considered stale. Defaults to 0. */
  staleTime?: number;
}

export interface CacheInstanceApi {
  /** Clear all cached data. Useful for logout or user switching scenarios. */
  clearCache: () => void;
}

export interface CacheReadOptions {
  /** Time in milliseconds before cached data is considered stale. Overrides plugin default. */
  staleTime?: number;
}

export type CacheWriteOptions = object;

export interface CacheInfiniteReadOptions {
  /** Time in milliseconds before cached data is considered stale. Overrides plugin default. */
  staleTime?: number;
}

export type CacheReadResult = object;

export type CacheWriteResult = object;
