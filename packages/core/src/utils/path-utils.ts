import { normalizeTag } from "./matchTag";

/**
 * Common tag options used across plugins and operations.
 */
export type TagOptions = {
  /**
   * Custom tags to use instead of auto-generated tag.
   * Can be a single tag string or an array of tags.
   */
  tags?: string | string[];
};

/**
 * Resolves tags for a cache entry.
 * Returns a single tag by default (the joined path), or custom tags if provided.
 * All tags are normalized (leading "/" removed) for consistency.
 *
 * @param options - Tag options containing optional custom tags
 * @param resolvedPath - The resolved path segments
 * @returns Array of normalized tags
 */
export function resolveTags(
  options: TagOptions | undefined,
  resolvedPath: string[]
): string[] {
  const tagsOption = options?.tags;

  if (!tagsOption) {
    const tag = resolvedPath.join("/");
    return tag ? [normalizeTag(tag)] : [];
  }

  if (typeof tagsOption === "string") {
    return [normalizeTag(tagsOption)];
  }

  if (Array.isArray(tagsOption)) {
    return [...new Set(tagsOption.map(normalizeTag))];
  }

  const tag = resolvedPath.join("/");
  return tag ? [normalizeTag(tag)] : [];
}

export function resolvePath(
  path: string[],
  params: Record<string, string | number> | undefined
): string[] {
  if (!params) return path;

  return path.map((segment) => {
    if (segment.startsWith(":")) {
      const paramName = segment.slice(1);
      const value = params[paramName];

      if (value === undefined) {
        throw new Error(`Missing path parameter: ${paramName}`);
      }

      return String(value);
    }

    return segment;
  });
}

/**
 * Resolves dynamic path parameters in a string path.
 * Unlike `resolvePath`, this works with string paths and doesn't throw on missing params.
 *
 * @param path - The path string with dynamic segments (e.g., "products/:id/comments")
 * @param params - The params object containing values to substitute
 * @returns The resolved path string (e.g., "products/1/comments")
 *
 * @example
 * ```ts
 * resolvePathString("products/:id/comments", { id: 1 })
 * // => "products/1/comments"
 * ```
 */
export function resolvePathString(
  path: string,
  params: Record<string, string | number> | undefined
): string {
  if (!params) return path;

  return path
    .split("/")
    .map((segment) => {
      if (segment.startsWith(":")) {
        const paramName = segment.slice(1);
        const value = params[paramName];

        return value !== undefined ? String(value) : segment;
      }

      return segment;
    })
    .join("/");
}
