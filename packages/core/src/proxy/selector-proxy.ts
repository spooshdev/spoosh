/** All supported HTTP method keys used in the API client */
export const HTTP_METHODS = [
  "$get",
  "$post",
  "$put",
  "$patch",
  "$delete",
] as const;

/** Union type of all HTTP method keys */
export type HttpMethodKey = (typeof HTTP_METHODS)[number];

/**
 * A function returned by `createSelectorProxy` that stores the selected path and method.
 *
 * Does not execute any request - only captures the API endpoint selection.
 */
export type SelectorFunction = (() => Promise<{ data: undefined }>) & {
  /** The path segments leading to this endpoint (e.g., ['posts', 'comments']) */
  __selectorPath?: string[];

  /** The HTTP method selected (e.g., '$get', '$post') */
  __selectorMethod?: string;
};

/**
 * Represents a fully captured API call with path, method, and options.
 *
 * Captured when an HTTP method is invoked with options.
 */
export type CapturedCall = {
  /** Path segments to the endpoint (e.g., ['posts', ':id']) */
  path: string[];

  /** HTTP method called (e.g., '$get', '$post') */
  method: string;

  /** Request options passed to the method (query, body, params, etc.) */
  options: unknown;
};

/**
 * Represents the selected endpoint (path and method) without options.
 *
 * Captured when an HTTP method is accessed but not yet called.
 */
export type SelectedEndpoint = {
  /** Path segments to the endpoint */
  path: string[];

  /** HTTP method selected */
  method: string;
};

/**
 * Result from the selector proxy callback.
 *
 * Contains either:
 * - `call`: Full call details when method is invoked with options (for useRead)
 * - `selector`: Just path/method when method is accessed (for useWrite)
 */
export type SelectorResult = {
  /** Full call details when method is invoked with options */
  call: CapturedCall | null;

  /** Endpoint selection when method is accessed but not called */
  selector: SelectedEndpoint | null;
};

/**
 * Creates a proxy for selecting API endpoints without executing requests.
 *
 * Used by plugins to let users specify which cache entries to target
 * using a type-safe API selector syntax.
 *
 * @returns A proxy typed as TSchema for endpoint selection
 *
 * @example
 * ```ts
 * const proxy = createSelectorProxy<ApiSchema>();
 *
 * // Select an endpoint
 * const endpoint = proxy.posts.$get;
 *
 * // Extract path for cache operations
 * const path = extractPathFromSelector(endpoint); // ['posts']
 * const method = extractMethodFromSelector(endpoint); // '$get'
 * ```
 *
 * @internal onCapture - Used internally by framework adapters
 */
export function createSelectorProxy<TSchema>(
  onCapture?: (result: SelectorResult) => void
): TSchema {
  const createProxy = (path: string[] = []): unknown => {
    return new Proxy(() => {}, {
      get(_, prop: string) {
        if (HTTP_METHODS.includes(prop as HttpMethodKey)) {
          const selectorFn: SelectorFunction = (options?: unknown) => {
            onCapture?.({
              call: { path, method: prop, options },
              selector: null,
            });

            return Promise.resolve({ data: undefined });
          };

          selectorFn.__selectorPath = path;
          selectorFn.__selectorMethod = prop;

          onCapture?.({
            call: null,
            selector: { path, method: prop },
          });

          return selectorFn;
        }

        return createProxy([...path, prop]);
      },

      // Handles function call syntax for dynamic segments: api.posts("123"), api.users(userId)
      apply(_, __, args: [string | number]) {
        const [segment] = args;

        return createProxy([...path, String(segment)]);
      },
    });
  };

  return createProxy() as TSchema;
}

/**
 * Extracts the path segments from a SelectorFunction.
 *
 * @param fn - A SelectorFunction returned from `createSelectorProxy`
 * @returns Array of path segments (e.g., ['posts', 'comments'])
 *
 * @example
 * ```ts
 * const proxy = createSelectorProxy<ApiSchema>();
 * const path = extractPathFromSelector(proxy.posts.comments.$get);
 * // path = ['posts', 'comments']
 * ```
 */
export function extractPathFromSelector(fn: unknown): string[] {
  return (fn as SelectorFunction).__selectorPath ?? [];
}

/**
 * Extracts the HTTP method from a SelectorFunction.
 *
 * @param fn - A SelectorFunction returned from `createSelectorProxy`
 * @returns The HTTP method string (e.g., '$get', '$post') or undefined
 *
 * @example
 * ```ts
 * const proxy = createSelectorProxy<ApiSchema>();
 * const method = extractMethodFromSelector(proxy.posts.$post);
 * // method = '$post'
 * ```
 */
export function extractMethodFromSelector(fn: unknown): string | undefined {
  return (fn as SelectorFunction).__selectorMethod;
}
