import { createProxyHandler } from "./proxy";
import { extractPrefixFromBaseUrl } from "./utils/stripPathPrefix";
import type { SpooshClient } from "./types/client.types";
import type { SpooshOptions } from "./types/request.types";
import type { SpooshMiddleware } from "./types/middleware.types";

export type SpooshClientConfig = {
  baseUrl: string;
  defaultOptions?: SpooshOptions;
  middlewares?: SpooshMiddleware[];

  /**
   * Prefix to strip from tag generation.
   *
   * URL prefix stripping always auto-detects from baseUrl.
   * This option only affects tag generation for cache invalidation.
   *
   * - `undefined`: Auto-detect from baseUrl (default, same as URL prefix)
   * - `string`: Explicit prefix to strip from tags
   */
  stripTagPrefix?: string;
};

/**
 * Creates a lightweight type-safe API client for vanilla JavaScript/TypeScript usage.
 *
 * This is a simpler alternative to `Spoosh` for users who don't need
 * the full plugin system, state management, or React integration.
 *
 * @param config - Client configuration
 * @returns Type-safe API client
 *
 * @example
 * ```ts
 * type ApiSchema = SpooshSchema<{
 *   "posts": {
 *     GET: { data: Post[] };
 *     POST: { data: Post; body: CreatePostBody };
 *   };
 *   "posts/:id": {
 *     GET: { data: Post };
 *     PUT: { data: Post; body: UpdatePostBody };
 *     DELETE: { data: void };
 *   };
 * }>;
 *
 * type ApiError = {
 *   message: string;
 * }
 *
 * const api = createClient<ApiSchema, ApiError>({
 *   baseUrl: "/api",
 * });
 *
 * // Type-safe API calls with path strings
 * const { data } = await api("posts").GET();
 * const { data: post } = await api("posts/123").GET();
 * await api("posts/:id").GET({ params: { id: 123 } });
 * ```
 */
export function createClient<TSchema, TDefaultError = unknown>(
  config: SpooshClientConfig
): SpooshClient<TSchema, TDefaultError> {
  const {
    baseUrl,
    defaultOptions = {},
    middlewares = [],
    stripTagPrefix,
  } = config;

  const optionsWithMiddlewares = { ...defaultOptions, middlewares };
  const urlPrefix = extractPrefixFromBaseUrl(baseUrl) || undefined;
  const tagPrefix = stripTagPrefix ?? urlPrefix;

  return createProxyHandler<TSchema, TDefaultError>({
    baseUrl,
    defaultOptions: optionsWithMiddlewares,
    nextTags: true,
    urlPrefix,
    tagPrefix,
  });
}
