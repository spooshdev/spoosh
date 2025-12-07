/**
 * Generate cache tags from URL path segments.
 * e.g., ['posts', '1'] → ['posts', 'posts/1']
 */
export function generateTags(path: string[]): string[] {
  return path.map((_, i) => path.slice(0, i + 1).join("/"));
}
