export const isNetworkError = (err: unknown): boolean =>
  err instanceof TypeError;

export const isAbortError = (err: unknown): boolean =>
  err instanceof DOMException && err.name === "AbortError";
