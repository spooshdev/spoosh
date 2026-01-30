/**
 * Extracts the path prefix from a base URL.
 *
 * @param baseUrl - The base URL (absolute or relative)
 * @returns The path portion without leading/trailing slashes
 *
 * @example
 * ```ts
 * extractPrefixFromBaseUrl("https://localhost:3000/api"); // "api"
 * extractPrefixFromBaseUrl("/api/v1"); // "api/v1"
 * extractPrefixFromBaseUrl("api"); // "api"
 * ```
 */
export function extractPrefixFromBaseUrl(baseUrl: string): string {
  const isAbsolute = /^https?:\/\//.test(baseUrl);

  if (isAbsolute) {
    try {
      const url = new URL(baseUrl);
      return url.pathname.replace(/^\/|\/$/g, "");
    } catch {
      return "";
    }
  }

  return baseUrl.replace(/^\/|\/$/g, "");
}

/**
 * Strips a prefix from path segments if the path starts with that prefix.
 *
 * @param pathSegments - Array of path segments
 * @param prefix - Prefix to strip (e.g., "api" or "api/v1")
 * @returns Path segments with prefix removed
 *
 * @example
 * ```ts
 * stripPrefixFromPath(["api", "posts"], "api"); // ["posts"]
 * stripPrefixFromPath(["api", "v1", "users"], "api/v1"); // ["users"]
 * stripPrefixFromPath(["posts"], "api"); // ["posts"] (no match, unchanged)
 * ```
 */
export function stripPrefixFromPath(
  pathSegments: string[],
  prefix: string
): string[] {
  if (!prefix) return pathSegments;

  const prefixSegments = prefix.split("/").filter(Boolean);

  if (prefixSegments.length === 0) return pathSegments;

  const startsWithPrefix = prefixSegments.every(
    (seg, i) => pathSegments[i] === seg
  );

  return startsWithPrefix
    ? pathSegments.slice(prefixSegments.length)
    : pathSegments;
}

/**
 * Resolves the strip prefix value based on configuration.
 *
 * @param stripPathPrefix - Configuration value (boolean, string, or undefined)
 * @param baseUrl - The base URL to extract prefix from when true
 * @returns The resolved prefix string to strip
 *
 * @example
 * ```ts
 * resolveStripPrefix(true, "https://localhost:3000/api"); // "api"
 * resolveStripPrefix("api/v1", "https://localhost:3000/api"); // "api/v1"
 * resolveStripPrefix(false, "https://localhost:3000/api"); // ""
 * resolveStripPrefix(undefined, "https://localhost:3000/api"); // ""
 * ```
 */
export function resolveStripPrefix(
  stripPathPrefix: boolean | string | undefined,
  baseUrl: string
): string {
  if (!stripPathPrefix) return "";

  if (stripPathPrefix === true) {
    return extractPrefixFromBaseUrl(baseUrl);
  }

  return stripPathPrefix.replace(/^\/|\/$/g, "");
}
