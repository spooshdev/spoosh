function stringifyQuery(
  query: Record<string, string | number | boolean | undefined>
): string {
  const parts: string[] = [];

  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === "") {
      continue;
    }

    parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`);
  }

  return parts.join("&");
}

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
      url.search = stringifyQuery(query);
    }

    return url.toString();
  }

  const cleanBase = `/${baseUrl.replace(/^\/|\/$/g, "")}`;
  const pathStr = path.length > 0 ? `/${path.join("/")}` : "";
  const queryStr = query ? stringifyQuery(query) : "";

  return `${cleanBase}${pathStr}${queryStr ? `?${queryStr}` : ""}`;
}
