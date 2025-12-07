import qs from "query-string";

export function buildUrl(
  baseUrl: string,
  path: string[],
  query?: Record<string, string | number | boolean | undefined>
): string {
  const normalizedBase = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
  const url = new URL(path.join("/"), normalizedBase);

  if (query) {
    url.search = qs.stringify(query, { skipNull: true, skipEmptyString: true });
  }

  return url.toString();
}
