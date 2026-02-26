import { generateSelfTagFromKey } from "@spoosh/core";

export function extractPathFromKey(key: string): string | null {
  try {
    const parsed = JSON.parse(key) as { path?: string | string[] };
    const path = parsed.path;

    if (typeof path === "string") {
      return path;
    }

    if (Array.isArray(path)) {
      return path.join("/");
    }

    return null;
  } catch {
    return null;
  }
}

export function formatCacheKeyForTrace(key: string): string {
  const resolvedPath = generateSelfTagFromKey(key);
  if (!resolvedPath) return "unknown";

  try {
    const parsed = JSON.parse(key);
    const opts = parsed.options ?? parsed.pageRequest;
    const query = opts?.query as Record<string, unknown> | undefined;

    if (!query || Object.keys(query).length === 0) {
      return resolvedPath;
    }

    const queryString = Object.entries(query)
      .map(
        ([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`
      )
      .join("&");

    return `${resolvedPath}?${queryString}`;
  } catch {
    return resolvedPath;
  }
}

export function extractOptionsFromKey(
  key: string
): { query?: unknown; params?: unknown } | null {
  try {
    const parsed = JSON.parse(key);
    const result: { query?: unknown; params?: unknown } = {};

    const opts = parsed.options ?? parsed.pageRequest;

    if (!opts) return null;

    if (opts.query) {
      result.query = opts.query;
    }

    if (opts.params) {
      result.params = opts.params;
    }

    return Object.keys(result).length > 0 ? result : null;
  } catch {
    return null;
  }
}

export function mapParamsToTargetNames(
  actualParams: Record<string, unknown> | undefined,
  paramMapping: Record<string, string>
): Record<string, unknown> {
  if (!actualParams) return {};

  const result: Record<string, unknown> = {};

  for (const [targetName, actualName] of Object.entries(paramMapping)) {
    if (actualName in actualParams) {
      result[targetName] = actualParams[actualName];
    }
  }

  for (const [key, value] of Object.entries(actualParams)) {
    if (!Object.values(paramMapping).includes(key)) {
      result[key] = value;
    }
  }

  return result;
}
