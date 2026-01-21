import { executeFetch } from "../fetch";
import type {
  AnyRequestOptions,
  SpooshOptions,
  FetchExecutor,
  HttpMethod,
} from "../types";

const HTTP_METHODS: Record<string, HttpMethod> = {
  $get: "GET",
  $post: "POST",
  $put: "PUT",
  $patch: "PATCH",
  $delete: "DELETE",
};

export type ProxyHandlerConfig<TOptions = SpooshOptions> = {
  baseUrl: string;
  defaultOptions: TOptions;
  path?: string[];
  fetchExecutor?: FetchExecutor<TOptions, AnyRequestOptions>;
  nextTags?: boolean;
};

/**
 * Creates the real API client proxy that executes actual HTTP requests.
 *
 * This proxy intercepts property access and function calls to build URL paths,
 * then executes fetch requests when an HTTP method ($get, $post, etc.) is called.
 *
 * Used internally by `createClient` and `createSpoosh` to create typed API clients.
 *
 * @param config - Proxy handler configuration
 *
 * @returns A proxy object typed as TSchema that executes real HTTP requests
 *
 * @example
 * ```ts
 * const api = createProxyHandler<ApiSchema>({ baseUrl: '/api', defaultOptions: {} });
 *
 * // Accessing api.posts.$get() will:
 * // 1. Build path: ['posts']
 * // 2. Execute: GET /api/posts
 * await api.posts.$get();
 *
 * // Dynamic segments via function call:
 * // api.posts(123).$get() or api.posts('123').$get()
 * // Executes: GET /api/posts/123
 * await api.posts(123).$get();
 * ```
 */
export function createProxyHandler<
  TSchema extends object,
  TOptions = SpooshOptions,
>(config: ProxyHandlerConfig<TOptions>): TSchema {
  const {
    baseUrl,
    defaultOptions,
    path = [],
    fetchExecutor = executeFetch as FetchExecutor<TOptions, AnyRequestOptions>,
    nextTags,
  } = config;

  const handler: ProxyHandler<() => void> = {
    get(_target, prop: string | symbol) {
      if (typeof prop === "symbol") return undefined;

      const method = HTTP_METHODS[prop];
      if (method) {
        return (options?: AnyRequestOptions) =>
          fetchExecutor(
            baseUrl,
            path,
            method,
            defaultOptions,
            options,
            nextTags
          );
      }

      return createProxyHandler({
        baseUrl,
        defaultOptions,
        path: [...path, prop],
        fetchExecutor,
        nextTags,
      });
    },

    // Handles function call syntax for dynamic segments: api.posts(123), api.posts(":id"), api.users(userId)
    // This is the only way to access dynamic segments in Spoosh.
    // The function call syntax allows TypeScript to capture the literal type, enabling params: { id: string } inference.
    apply(_target, _thisArg, args: [string]) {
      const [segment] = args;

      return createProxyHandler({
        baseUrl,
        defaultOptions,
        path: [...path, segment],
        fetchExecutor,
        nextTags,
      });
    },
  };

  const noop = () => {};

  return new Proxy(noop, handler) as TSchema;
}
