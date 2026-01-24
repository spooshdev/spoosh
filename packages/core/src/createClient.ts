import { createProxyHandler } from "./proxy";
import type { SpooshClient } from "./types/client.types";
import type { SpooshOptions } from "./types/request.types";
import type { SpooshMiddleware } from "./types/middleware.types";

export type SpooshClientConfig = {
  baseUrl: string;
  defaultOptions?: SpooshOptions;
  middlewares?: SpooshMiddleware[];
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
  const { baseUrl, defaultOptions = {}, middlewares = [] } = config;

  const optionsWithMiddlewares = { ...defaultOptions, middlewares };

  return createProxyHandler<TSchema, TDefaultError>({
    baseUrl,
    defaultOptions: optionsWithMiddlewares,
    nextTags: true,
  });
}
