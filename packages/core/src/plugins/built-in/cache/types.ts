export interface CachePluginConfig {
  staleTime?: number;
}

export interface CacheReadOptions {
  staleTime?: number;
  tags?: string[];
  additionalTags?: string[];
}

export type CacheWriteOptions = object;

export interface CacheInfiniteReadOptions {
  staleTime?: number;
  tags?: string[];
  additionalTags?: string[];
}

export interface CacheReadResult {
  isStale: boolean;
}

export type CacheWriteResult = object;
