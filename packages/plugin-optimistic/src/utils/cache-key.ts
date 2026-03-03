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

function stringifyParams(
  params: Record<string, unknown>
): Record<string, string> {
  const result: Record<string, string> = {};

  for (const [key, value] of Object.entries(params)) {
    result[key] = String(value);
  }

  return result;
}

export function extractOptionsFromKey(
  key: string
): { query?: unknown; params?: Record<string, string> } | null {
  try {
    const parsed = JSON.parse(key);
    const result: { query?: unknown; params?: Record<string, string> } = {};

    const opts = parsed.options ?? parsed.pageRequest;

    if (!opts) return null;

    if (opts.query) {
      result.query = opts.query;
    }

    if (opts.params) {
      result.params = stringifyParams(opts.params as Record<string, unknown>);
    }

    return Object.keys(result).length > 0 ? result : null;
  } catch {
    return null;
  }
}
