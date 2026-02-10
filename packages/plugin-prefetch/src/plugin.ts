import type {
  SpooshPlugin,
  OperationState,
  SpooshResponse,
} from "@spoosh/core";
import {
  createSelectorProxy,
  resolvePath,
  resolveTags,
  createInitialState,
} from "@spoosh/core";
import type {
  PrefetchPluginConfig,
  PrefetchInstanceApi,
  PrefetchOptions,
} from "./types";
import { storePromiseInCache } from "./promise-cache";

const PLUGIN_NAME = "spoosh:prefetch";

/**
 * Provides prefetching capabilities to load data before it's needed.
 *
 * The prefetch function runs through the full plugin middleware chain,
 * so features like caching, retry, and deduplication work automatically.
 *
 * @param config - Configuration options (reserved for future use)
 *
 * @see {@link https://spoosh.dev/docs/react/plugins/prefetch | Prefetch Plugin Documentation}
 *
 * @returns Prefetch plugin instance
 *
 * @example
 * ```ts
 * import { Spoosh } from "@spoosh/core";
 *
 * const spoosh = new Spoosh<ApiSchema, Error>("/api")
 *   .use([
 *     // ... other plugins
 *     prefetchPlugin(),
 *     cachePlugin(),
 *     retryPlugin(),
 *   ]);
 *
 * const { prefetch } = create(client);
 *
 * // Basic prefetch
 * await prefetch((api) => api("posts").GET());
 *
 * // Prefetch with query options
 * await prefetch((api) => api("posts").GET({ query: { page: 1, limit: 10 } }));
 *
 * // Prefetch with plugin options (staleTime, retries, etc.)
 * await prefetch((api) => api("users/:id").GET({ params: { id: userId } }), {
 *   staleTime: 60000,
 *   retries: 3,
 * });
 *
 * // Prefetch on hover
 * <Link
 *   href="/posts/1"
 *   onMouseEnter={() => prefetch((api) => api("posts/:id").GET({ params: { id: 1 } }))}
 * >
 *   View Post
 * </Link>
 * ```
 */
export function prefetchPlugin(
  config: PrefetchPluginConfig = {}
): SpooshPlugin<{
  instanceApi: PrefetchInstanceApi;
}> {
  const { timeout } = config;

  return {
    name: PLUGIN_NAME,
    operations: [],

    instanceApi(context) {
      const { api, stateManager, eventEmitter, pluginExecutor } = context;

      const prefetch = async <TData = unknown, TError = unknown>(
        selector: (api: unknown) => unknown,
        options: PrefetchOptions = {}
      ): Promise<SpooshResponse<TData, TError>> => {
        const { tags } = options;

        let callPath = "";
        let callMethod = "";
        let callOptions: unknown = undefined;

        const selectorProxy = createSelectorProxy<unknown>((result) => {
          if (result.call) {
            callPath = result.call.path;
            callMethod = result.call.method;
            callOptions = result.call.options;
          } else if (result.selector) {
            callPath = result.selector.path;
            callMethod = result.selector.method;
          }
        });

        selector(selectorProxy);

        if (!callMethod) {
          throw new Error(
            "prefetch requires selecting a GET method. " +
              'Example: prefetch((api) => api("posts").GET())'
          );
        }

        const pathSegments = callPath.split("/").filter(Boolean);
        const resolvedPath = resolvePath(pathSegments, undefined);
        const resolvedTags = resolveTags({ tags }, resolvedPath);

        const queryKey = stateManager.createQueryKey({
          path: callPath,
          method: callMethod,
          options: callOptions,
        });

        const initialState = createInitialState<TData, TError>();

        const abortController = new AbortController();

        const pluginContext = pluginExecutor.createContext({
          operationType: "read",
          path: pathSegments.join("/"),
          method: callMethod as "GET",
          queryKey,
          tags: resolvedTags,
          requestTimestamp: Date.now(),
          request: { headers: {}, ...(callOptions ?? {}) },
          temp: new Map(),
          pluginOptions: options,
          stateManager,
          eventEmitter,
        });

        const coreFetch = async (): Promise<SpooshResponse<TData, TError>> => {
          pluginContext.request.signal = abortController.signal;

          const updateState = (
            updater: Partial<OperationState<TData, TError>>
          ) => {
            const cached = stateManager.getCache<TData, TError>(queryKey);

            if (cached) {
              stateManager.setCache<TData, TError>(queryKey, {
                state: { ...cached.state, ...updater },
              });
            } else {
              stateManager.setCache<TData, TError>(queryKey, {
                state: { ...initialState, ...updater },
                tags: resolvedTags,
              });
            }
          };

          try {
            const pathMethods = (
              api as (path: string) => Record<string, unknown>
            )(callPath);
            const method = pathMethods[callMethod] as (
              o?: unknown
            ) => Promise<SpooshResponse<TData, TError>>;

            const mergedOptions = {
              ...(callOptions as object),
              ...pluginContext.request,
            };

            const response = await method(mergedOptions);

            if (response.data !== undefined && !response.error) {
              updateState({
                data: response.data,
                error: undefined,
                timestamp: Date.now(),
              });
            }

            return response;
          } catch (err) {
            if (abortController.signal.aborted) {
              return {
                status: 0,
                data: undefined,
                error: undefined,
                aborted: true,
              } as SpooshResponse<TData, TError>;
            }

            const errorResponse: SpooshResponse<TData, TError> = {
              status: 0,
              error: err as TError,
              data: undefined,
            };

            return errorResponse;
          }
        };

        const existingPromise = stateManager.getPendingPromise(queryKey);
        const et = pluginContext.eventTracer?.(PLUGIN_NAME);

        if (existingPromise) {
          return existingPromise as Promise<SpooshResponse<TData, TError>>;
        }

        et?.emit("Prefetching", { queryKey, color: "info" });

        const fetchPromise = pluginExecutor.executeMiddleware(
          "read",
          pluginContext,
          coreFetch
        ) as Promise<SpooshResponse<TData, TError>>;

        storePromiseInCache(fetchPromise, {
          stateManager,
          queryKey,
          timeout,
        });

        return fetchPromise;
      };

      return { prefetch } as PrefetchInstanceApi;
    },
  };
}
