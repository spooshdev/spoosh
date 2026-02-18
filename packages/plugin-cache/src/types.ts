export interface CachePluginConfig {
  /** Default stale time in milliseconds. Data older than this is considered stale. Defaults to 0. */
  staleTime?: number;
}

export interface ClearCacheOptions {
  /** Whether to trigger all queries to refetch after clearing. Defaults to false. */
  refetchAll?: boolean;
}

export interface CacheInstanceApi {
  /** Clear all cached data. Useful for logout or user switching scenarios. */
  clearCache: (options?: ClearCacheOptions) => void;
}

export interface CacheReadOptions {
  /** Time in milliseconds before cached data is considered stale. Overrides plugin default. */
  staleTime?: number;
}

export type CacheWriteOptions = object;

export interface CacheWriteTriggerOptions {
  /** Clear all cached data after mutation completes successfully. */
  clearCache?: boolean;
}

export interface CachePagesOptions {
  /** Time in milliseconds before cached data is considered stale. Overrides plugin default. */
  staleTime?: number;
}

export type CacheReadResult = object;

export type CacheWriteResult = object;
