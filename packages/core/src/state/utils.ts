import type { OperationState } from "../plugins/types";

export function createInitialState<TData, TError>(): OperationState<
  TData,
  TError
> {
  return {
    data: undefined,
    error: undefined,
    timestamp: 0,
  };
}

export function generateSelfTagFromKey(key: string): string | undefined {
  try {
    const parsed = JSON.parse(key) as {
      path?: string | string[];
      options?: { params?: Record<string, string | number> };
      pageRequest?: { params?: Record<string, string | number> };
    };

    const rawPath = parsed.path;
    if (!rawPath) return undefined;

    const path = Array.isArray(rawPath) ? rawPath.join("/") : rawPath;
    const params = parsed.options?.params ?? parsed.pageRequest?.params;

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
  } catch {
    return undefined;
  }
}
