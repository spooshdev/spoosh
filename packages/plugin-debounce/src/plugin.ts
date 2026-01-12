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
  body?: unknown;
  formData?: Record<string, unknown>;
};

type PrevContext = {
  prevQuery?: Record<string, unknown>;
  prevParams?: Record<string, string | number>;
  prevBody?: unknown;
  prevFormData?: Record<string, unknown>;
};

function resolveDebounceMs(
  debounce: number | ((context: PrevContext) => number) | undefined,
  context: PrevContext
): number {
  if (debounce === undefined) return 0;
  if (typeof debounce === "number") return debounce;

  return debounce(context);
}

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

    middleware: async (context, next) => {
      const pluginOptions = context.pluginOptions as
        | DebounceReadOptions
        | undefined;
      const debounceOption = pluginOptions?.debounce;

      if (debounceOption === undefined || context.forceRefetch) {
        return next();
      }

      const { queryKey, requestOptions, path, method } = context;
      const stableKey = `${path.join("/")}:${method}`;

      const opts = requestOptions as
        | (RequestOptionsSnapshot & Record<string, unknown>)
        | undefined;

      const currentRequest: RequestOptionsSnapshot = {
        query: opts?.query,
        params: opts?.params,
        body: opts?.body,
        formData: opts?.formData,
      };

      const prevRequest = prevRequests.get(stableKey);

      const prevContext: PrevContext = {};

      if (prevRequest?.query !== undefined) {
        prevContext.prevQuery = prevRequest.query;
      }

      if (prevRequest?.params !== undefined) {
        prevContext.prevParams = prevRequest.params;
      }

      if (prevRequest?.body !== undefined) {
        prevContext.prevBody = prevRequest.body;
      }

      if (prevRequest?.formData !== undefined) {
        prevContext.prevFormData = prevRequest.formData;
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
