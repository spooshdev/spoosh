import { generateTags } from "enlace-core";

type TagOptions = {
  tags?: string[];
  additionalTags?: string[];
};

export function resolveTags(
  options: TagOptions | undefined,
  resolvedPath: string[]
): string[] {
  const customTags = options?.tags;
  const additionalTags = options?.additionalTags ?? [];
  const baseTags = customTags ?? generateTags(resolvedPath);
  return [...baseTags, ...additionalTags];
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
