import type { CacheConfig, ResolvedCacheConfig } from "enlace-core";

export type { ResolvedCacheConfig };

/**
 * Helper to create an optimistic update config with proper type inference.
 * Used in trigger options to update cache before/after mutation.
 *
 * @example
 * trigger({
 *   optimistic: (cache, api) => cache({
 *     for: api.posts.$get,
 *     updater: (posts) => posts.filter(p => p.id !== deletedId),
 *     //        ^^^^^ properly typed as Post[]
 *   })
 * })
 */
export function cache<TData, TResponse = unknown>(
  config: CacheConfig<TData, TResponse>
): ResolvedCacheConfig {
  return config as ResolvedCacheConfig;
}
