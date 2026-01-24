import type { HeadersInitOrGetter } from "../types";

async function resolveHeaders(
  headers?: HeadersInitOrGetter
): Promise<HeadersInit | undefined> {
  if (!headers) return undefined;
  if (typeof headers === "function") {
    return await headers();
  }
  return headers;
}

function headersInitToRecord(headers: HeadersInit): Record<string, string> {
  return Object.fromEntries(new Headers(headers));
}

/**
 * Resolves HeadersInitOrGetter to a plain Record<string, string>.
 * Handles functions, Headers objects, arrays, and plain objects.
 */
export async function resolveHeadersToRecord(
  headers?: HeadersInitOrGetter
): Promise<Record<string, string>> {
  const resolved = await resolveHeaders(headers);
  if (!resolved) return {};
  return headersInitToRecord(resolved);
}

export async function mergeHeaders(
  defaultHeaders?: HeadersInitOrGetter,
  requestHeaders?: HeadersInitOrGetter
): Promise<HeadersInit | undefined> {
  const resolved1 = await resolveHeaders(defaultHeaders);
  const resolved2 = await resolveHeaders(requestHeaders);

  if (!resolved1 && !resolved2) return undefined;
  if (!resolved1) return resolved2;
  if (!resolved2) return resolved1;

  return {
    ...Object.fromEntries(new Headers(resolved1)),
    ...Object.fromEntries(new Headers(resolved2)),
  };
}

export function setHeaders(
  requestOptions: { headers?: HeadersInitOrGetter },
  newHeaders: Record<string, string>
): void {
  const existing = requestOptions.headers;

  if (
    !existing ||
    (typeof existing === "object" &&
      !Array.isArray(existing) &&
      !(existing instanceof Headers))
  ) {
    requestOptions.headers = {
      ...(existing as Record<string, string> | undefined),
      ...newHeaders,
    };
  } else {
    requestOptions.headers = {
      ...newHeaders,
    };
  }
}

/**
 * Extracts the Content-Type header value from HeadersInit.
 * Returns undefined if no Content-Type is set.
 */
export function getContentType(headers?: HeadersInit): string | undefined {
  if (!headers) return undefined;

  const headersObj = new Headers(headers);
  return headersObj.get("content-type") ?? undefined;
}
