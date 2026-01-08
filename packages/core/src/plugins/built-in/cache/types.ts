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
