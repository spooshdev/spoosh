import { generateTags } from "./generateTags";

export type TagMode = "all" | "self" | "none";

type TagModeInArray = "all" | "self";

/**
 * Common tag options used across plugins and operations.
 */
export type TagOptions = {
  /**
   * Unified tag option (follows invalidation pattern)
   * - String: mode only ('all' | 'self' | 'none')
   * - Array: custom tags only OR [mode keyword mixed with custom tags]
   *   - If array contains 'all' or 'self', it's treated as mode + tags
   *   - Otherwise, it's custom tags only (replaces auto-generated tags)
   *   - 'none' keyword should NOT be used in arrays (use string 'none' instead)
   */
  tags?: TagMode | (TagModeInArray | (string & {}))[];
};

function resolveTagMode(mode: TagMode, path: string[]): string[] {
  switch (mode) {
    case "all":
      return generateTags(path);
    case "self":
      return [path.join("/")];
    case "none":
      return [];
  }
}

export function resolveTags(
  options: TagOptions | undefined,
  resolvedPath: string[]
): string[] {
  const tagsOption = options?.tags;

  if (!tagsOption) {
    return generateTags(resolvedPath);
  }

  if (typeof tagsOption === "string") {
    return resolveTagMode(tagsOption, resolvedPath);
  }

  if (Array.isArray(tagsOption)) {
    const tags: string[] = [];
    let mode: TagMode | null = null;

    for (const item of tagsOption) {
      if (item === "all" || item === "self") {
        mode = item as TagMode;
      } else if (typeof item === "string") {
        tags.push(item);
      }
    }

    if (mode) {
      tags.push(...resolveTagMode(mode, resolvedPath));
    }

    return [...new Set(tags)];
  }

  return generateTags(resolvedPath);
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
