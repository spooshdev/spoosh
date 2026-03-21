/**
 * Normalizes a tag or pattern by removing leading slashes.
 * Ensures consistency between "/hello" and "hello".
 */
export function normalizeTag(tag: string): string {
  return tag.startsWith("/") ? tag.slice(1) : tag;
}

/**
 * Checks if an entry's tag matches a given invalidation pattern.
 * Both tag and pattern are normalized (leading "/" removed) before comparison.
 *
 * @param entryTag - The tag from a cache entry (e.g., "posts", "posts/1", "posts/1/comments")
 * @param pattern - The pattern to match against:
 *   - "posts" - Exact match only
 *   - "posts/*" - Children only (matches posts/1, posts/1/comments, but NOT posts)
 * @returns true if the entry tag matches the pattern
 */
export function matchTag(entryTag: string, pattern: string): boolean {
  const normalizedTag = normalizeTag(entryTag);
  const normalizedPattern = normalizeTag(pattern);

  if (normalizedPattern.endsWith("/*")) {
    const prefix = normalizedPattern.slice(0, -2);
    return prefix === ""
      ? normalizedTag.length > 0
      : normalizedTag.startsWith(prefix + "/");
  }

  return normalizedTag === normalizedPattern;
}

/**
 * Checks if an entry's tag matches any of the given invalidation patterns.
 *
 * @param entryTag - The tag from a cache entry
 * @param patterns - Array of patterns to match against
 * @returns true if the entry tag matches any of the patterns
 */
export function matchTags(entryTag: string, patterns: string[]): boolean {
  return patterns.some((pattern) => matchTag(entryTag, pattern));
}
