import type { SpooshPlugin } from "@spoosh/core";

import type {
  DebounceReadOptions,
  DebounceInfiniteReadOptions,
  DebounceReadResult,
  DebounceWriteOptions,
  DebounceWriteResult,
} from "./types";

type RequestOptionsSnapshot = {
  query?: Record<string, unknown>;
  params?: Record<string, string | number>;
};

type PrevContext = {
  prevQuery?: Record<string, unknown>;
  prevParams?: Record<string, string | number>;
};

function resolveDebounceMs(
  debounce: number | ((context: PrevContext) => number) | undefined,
  context: PrevContext
): number {
  if (debounce === undefined) return 0;
  if (typeof debounce === "number") return debounce;

  return debounce(context);
}

/**
 * Enables debouncing for read operations.
 *
 * Delays requests until input stops changing, useful for search inputs
 * to avoid excessive API calls while typing.
 *
 * @see {@link https://spoosh.dev/docs/react/plugins/debounce | Debounce Plugin Documentation}
 *
 * @example
 * ```ts
 * import { Spoosh } from "@spoosh/core";
 *
 * const client = new Spoosh<ApiSchema, Error>("/api")
 *   .use([
 *     // ... other plugins
 *     debouncePlugin(),
 *   ]);
 *
 * // Debounce search by 300ms
 * useRead((api) => api("search").GET({ query: { q: searchTerm } }), {
 *   debounce: 300,
 * });
 *
 * // Dynamic debounce based on previous query
 * useRead((api) => api("search").GET({ query: { q: searchTerm } }), {
 *   debounce: ({ prevQuery }) => prevQuery?.q ? 300 : 0,
 * });
 * ```
 */
export function debouncePlugin(): SpooshPlugin<{
  readOptions: DebounceReadOptions;
  writeOptions: DebounceWriteOptions;
  infiniteReadOptions: DebounceInfiniteReadOptions;
  readResult: DebounceReadResult;
  writeResult: DebounceWriteResult;
}> {
  const timers = new Map<string, ReturnType<typeof setTimeout>>();
  const latestQueryKeys = new Map<string, string>();
  const prevRequests = new Map<string, RequestOptionsSnapshot>();

  return {
    name: "spoosh:debounce",
    operations: ["read", "infiniteRead"],

    lifecycle: {
      onUnmount: (context) => {
        const { path, method } = context;
        const stableKey = `${path}:${method}`;

        const existingTimer = timers.get(stableKey);

        if (existingTimer) {
          clearTimeout(existingTimer);
          timers.delete(stableKey);
        }

        latestQueryKeys.delete(stableKey);
        prevRequests.delete(stableKey);
      },
    },

    middleware: async (context, next) => {
      const pluginOptions = context.pluginOptions as
        | DebounceReadOptions
        | undefined;
      const debounceOption = pluginOptions?.debounce;

      if (debounceOption === undefined || context.forceRefetch) {
        return next();
      }

      const { queryKey, request, path, method } = context;
      const stableKey = `${path}:${method}`;

      const opts = request as
        | (RequestOptionsSnapshot & Record<string, unknown>)
        | undefined;

      const currentRequest: RequestOptionsSnapshot = {
        query: opts?.query,
        params: opts?.params,
      };

      const prevRequest = prevRequests.get(stableKey);

      const prevContext: PrevContext = {};

      if (prevRequest?.query !== undefined) {
        prevContext.prevQuery = prevRequest.query;
      }

      if (prevRequest?.params !== undefined) {
        prevContext.prevParams = prevRequest.params;
      }

      const debounceMs = resolveDebounceMs(debounceOption, prevContext);

      prevRequests.set(stableKey, currentRequest);

      if (!debounceMs || debounceMs <= 0) {
        return next();
      }

      const existingQueryKey = latestQueryKeys.get(stableKey);

      if (existingQueryKey === queryKey) {
        const cached = context.stateManager.getCache(queryKey);

        if (cached?.state?.data !== undefined) {
          return { data: cached.state.data, status: 200 };
        }

        return { data: undefined, status: 0 };
      }

      const existingTimer = timers.get(stableKey);

      if (existingTimer) {
        clearTimeout(existingTimer);
      }

      latestQueryKeys.set(stableKey, queryKey);

      const cached = context.stateManager.getCache(queryKey);

      const timer = setTimeout(() => {
        timers.delete(stableKey);
        const latestKey = latestQueryKeys.get(stableKey);

        if (latestKey) {
          context.eventEmitter.emit("refetch", {
            queryKey: latestKey,
            reason: "invalidate",
          });
        }
      }, debounceMs);

      timers.set(stableKey, timer);

      if (cached?.state?.data !== undefined) {
        return { data: cached.state.data, status: 200 };
      }

      return { data: undefined, status: 0 };
    },
  };
}
