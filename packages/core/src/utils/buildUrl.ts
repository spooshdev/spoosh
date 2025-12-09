import qs from "query-string";

export function buildUrl(
  baseUrl: string,
  path: string[],
  query?: Record<string, string | number | boolean | undefined>
): string {
  const isAbsolute = /^https?:\/\//.test(baseUrl);

  if (isAbsolute) {
    const normalizedBase = baseUrl.replace(/\/?$/, "/");
    const url = new URL(path.join("/"), normalizedBase);
    if (query) {
      url.search = qs.stringify(query, {
        skipNull: true,
        skipEmptyString: true,
      });
    }
    return url.toString();
  }

  const cleanBase = `/${baseUrl.replace(/^\/|\/$/g, "")}`;
  const pathStr = path.length > 0 ? `/${path.join("/")}` : "";
  const queryStr = query
    ? qs.stringify(query, { skipNull: true, skipEmptyString: true })
    : "";

  return `${cleanBase}${pathStr}${queryStr ? `?${queryStr}` : ""}`;
}
