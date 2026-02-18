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
    const parsed = JSON.parse(key) as { path?: string };
    return parsed.path;
  } catch {
    return undefined;
  }
}
