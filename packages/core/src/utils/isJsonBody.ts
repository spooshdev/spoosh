export function isJsonBody(body: unknown): body is Record<string, unknown> | unknown[] {
  if (body === null || body === undefined) return false;
  if (body instanceof FormData) return false;
  if (body instanceof Blob) return false;
  if (body instanceof ArrayBuffer) return false;
  if (body instanceof URLSearchParams) return false;
  if (body instanceof ReadableStream) return false;
  if (typeof body === "string") return false;
  return typeof body === "object";
}
