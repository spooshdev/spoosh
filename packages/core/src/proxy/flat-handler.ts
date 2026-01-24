import { executeFetch } from "../fetch";
import type {
  AnyRequestOptions,
  SpooshOptions,
  FetchExecutor,
  HttpMethod,
} from "../types";

export type FlatProxyHandlerConfig<TOptions = SpooshOptions> = {
  baseUrl: string;
  defaultOptions: TOptions;
  fetchExecutor?: FetchExecutor<TOptions, AnyRequestOptions>;
  nextTags?: boolean;
};

/**
 * Resolve path parameters in a route pattern.
 *
 * @example
 * ```ts
 * resolvePath("posts/:id", { id: 123 }); // ["posts", "123"]
 * resolvePath("posts/123", undefined); // ["posts", "123"]
 * ```
 */
function resolvePath(
  path: string,
  params?: Record<string, string | number>
): string[] {
  const segments = path.split("/").filter(Boolean);

  if (!params) {
    return segments;
  }

  return segments.map((segment) => {
    if (segment.startsWith(":")) {
      const paramName = segment.slice(1);
      const value = params[paramName];
      return value !== undefined ? String(value) : segment;
    }

    return segment;
  });
}

/**
 * Creates a flat API client proxy that uses path strings instead of chained property access.
 * Methods use HTTP names directly: GET, POST, PUT, PATCH, DELETE.
 *
 * @param config - Flat proxy handler configuration
 * @returns A function that takes a path and returns an object with HTTP method functions
 *
 * @example
 * ```ts
 * const api = createFlatProxyHandler<ApiSchema>({ baseUrl: '/api', defaultOptions: {} });
 *
 * // Call with path string
 * await api("posts").GET();
 * await api("posts/123").GET();
 * await api("posts/:id").GET({ params: { id: 123 } });
 * ```
 */
export function createFlatProxyHandler<
  TSchema extends object,
  TOptions = SpooshOptions,
>(config: FlatProxyHandlerConfig<TOptions>): TSchema {
  const {
    baseUrl,
    defaultOptions,
    fetchExecutor = executeFetch as FetchExecutor<TOptions, AnyRequestOptions>,
    nextTags,
  } = config;

  return ((path: string) => {
    return new Proxy(
      {},
      {
        get(_target, prop: string | symbol) {
          if (typeof prop === "symbol") return undefined;

          const method = prop as HttpMethod;
          if (!["GET", "POST", "PUT", "PATCH", "DELETE"].includes(method)) {
            return undefined;
          }

          return (options?: AnyRequestOptions) => {
            const resolvedPath = resolvePath(path, options?.params);

            return fetchExecutor(
              baseUrl,
              resolvedPath,
              method,
              defaultOptions,
              options,
              nextTags
            );
          };
        },
      }
    );
  }) as TSchema;
}
