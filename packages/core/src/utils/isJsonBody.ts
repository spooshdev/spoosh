export function containsFile(value: unknown): boolean {
  if (value instanceof File || value instanceof Blob) return true;
  if (Array.isArray(value)) return value.some(containsFile);

  if (value && typeof value === "object") {
    return Object.values(value).some(containsFile);
  }

  return false;
}

export function isJsonBody(
  body: unknown
): body is Record<string, unknown> | unknown[] {
  if (body === null || body === undefined) return false;
  if (body instanceof FormData) return false;
  if (body instanceof Blob) return false;
  if (body instanceof ArrayBuffer) return false;
  if (body instanceof URLSearchParams) return false;
  if (body instanceof ReadableStream) return false;
  if (typeof body === "string") return false;

  if (typeof body === "object") {
    return true;
  }

  return false;
}
