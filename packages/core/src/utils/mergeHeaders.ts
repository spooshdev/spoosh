export function mergeHeaders(
  defaultHeaders?: HeadersInit,
  requestHeaders?: HeadersInit
): HeadersInit | undefined {
  if (!defaultHeaders && !requestHeaders) return undefined;
  if (!defaultHeaders) return requestHeaders;
  if (!requestHeaders) return defaultHeaders;

  return {
    ...Object.fromEntries(new Headers(defaultHeaders)),
    ...Object.fromEntries(new Headers(requestHeaders)),
  };
}
