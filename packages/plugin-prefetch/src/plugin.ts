import type {
  SpooshPlugin,
  InstanceApiContext,
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

/**
 * Provides prefetching capabilities to load data before it's needed.
 *
 * The prefetch function runs through the full plugin middleware chain,
 * so features like caching, retry, and deduplication work automatically.
 *
 * @param config - Configuration options (reserved for future use)
 *
 * @returns Prefetch plugin instance
 *
 * @example
 * ```ts
 * // Setup
 * const plugins = [prefetchPlugin(), cachePlugin(), retryPlugin()];
 * const { prefetch } = createReactSpoosh(spoosh);
 *
 * // Basic prefetch
 * await prefetch((api) => api.posts.$get());
 *
 * // Prefetch with query options
 * await prefetch((api) => api.posts.$get({ query: { page: 1, limit: 10 } }));
 *
 * // Prefetch with plugin options (staleTime, retries, etc.)
 * await prefetch((api) => api.users[userId].$get(), {
 *   staleTime: 60000,
 *   retries: 3,
 * });
 *
 * // Prefetch on hover
 * <Link
 *   href="/posts/1"
 *   onMouseEnter={() => prefetch((api) => api.posts[1].$get())}
 * >
 *   View Post
 * </Link>
 * ```
 */
export function prefetchPlugin(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _config: PrefetchPluginConfig = {}
): SpooshPlugin<{
  instanceApi: PrefetchInstanceApi;
}> {
  return {
    name: "spoosh:prefetch",
    operations: [],

    instanceApi(context: InstanceApiContext) {
      const { api, stateManager, eventEmitter, pluginExecutor } = context;

      const prefetch = async <TData = unknown, TError = unknown>(
        selector: (api: unknown) => unknown,
        options: PrefetchOptions = {}
      ): Promise<SpooshResponse<TData, TError>> => {
        const { tags, additionalTags } = options;

        let callPath: string[] = [];
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
            "prefetch requires selecting a $get method. " +
              "Example: prefetch((api) => api.posts.$get())"
          );
        }

        const resolvedPath = resolvePath(callPath, undefined);
        const resolvedTags = resolveTags(
          { tags, additionalTags },
          resolvedPath
        );

        const queryKey = stateManager.createQueryKey({
          path: callPath,
          method: callMethod,
          options: callOptions,
        });

        const initialState = createInitialState<TData, TError>();

        const pluginContext = pluginExecutor.createContext<TData, TError>({
          operationType: "read",
          path: callPath,
          method: callMethod as "GET",
          queryKey,
          tags: resolvedTags,
          requestTimestamp: Date.now(),
          requestOptions: (callOptions ?? {}) as Record<string, unknown>,
          state: initialState,
          metadata: new Map(),
          pluginOptions: options,
          abort: () => {},
          stateManager,
          eventEmitter,
        });

        const coreFetch = async (): Promise<SpooshResponse<TData, TError>> => {
          const abortController = new AbortController();
          pluginContext.requestOptions.signal = abortController.signal;

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

          updateState({ fetching: true, loading: true });

          try {
            let current: unknown = api;

            for (const segment of resolvedPath) {
              current = (current as Record<string, unknown>)[segment];
            }

            const method = (current as Record<string, unknown>)[callMethod] as (
              o?: unknown
            ) => Promise<SpooshResponse<TData, TError>>;

            const mergedOptions = {
              ...(callOptions as object),
              ...pluginContext.requestOptions,
            };

            const response = await method(mergedOptions);
            pluginContext.response = response;

            if (response.error) {
              updateState({
                fetching: false,
                loading: false,
                error: response.error,
              });
            } else {
              updateState({
                fetching: false,
                loading: false,
                data: response.data,
                error: undefined,
                timestamp: Date.now(),
              });
            }

            return response;
          } catch (err) {
            const errorResponse: SpooshResponse<TData, TError> = {
              status: 0,
              error: err as TError,
              data: undefined,
            };

            pluginContext.response = errorResponse;

            updateState({
              fetching: false,
              loading: false,
              error: err as TError,
            });

            return errorResponse;
          }
        };

        const fetchPromise = pluginExecutor.executeMiddleware(
          "read",
          pluginContext,
          coreFetch
        );

        stateManager.setCache(queryKey, {
          promise: fetchPromise,
          tags: resolvedTags,
        });

        fetchPromise.finally(() => {
          stateManager.setCache(queryKey, { promise: undefined });
        });

        return fetchPromise;
      };

      return { prefetch } as PrefetchInstanceApi;
    },
  };
}
