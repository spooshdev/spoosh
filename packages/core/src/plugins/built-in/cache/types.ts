export interface CachePluginConfig {
  staleTime?: number;
}

export interface CacheReadOptions {
  staleTime?: number;
}

export type CacheWriteOptions = object;

export interface CacheInfiniteReadOptions {
  staleTime?: number;
}

export interface CacheReadResult {
  isStale: boolean;
}

export type CacheWriteResult = object;
