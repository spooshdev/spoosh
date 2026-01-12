import type { SpooshPlugin } from "@spoosh/core";

import type {
  ThrottleReadOptions,
  ThrottleInfiniteReadOptions,
  ThrottleReadResult,
  ThrottleWriteOptions,
  ThrottleWriteResult,
} from "./types";

export function throttlePlugin(): SpooshPlugin<{
  readOptions: ThrottleReadOptions;
  writeOptions: ThrottleWriteOptions;
  infiniteReadOptions: ThrottleInfiniteReadOptions;
  readResult: ThrottleReadResult;
  writeResult: ThrottleWriteResult;
}> {
  const lastFetchTime = new Map<string, number>();

  return {
    name: "spoosh:throttle",
    operations: ["read", "infiniteRead"],

    middleware: async (context, next) => {
      const pluginOptions = context.pluginOptions as
        | ThrottleReadOptions
        | undefined;
      const throttleMs = pluginOptions?.throttle;

      if (!throttleMs || throttleMs <= 0) {
        return next();
      }

      const { queryKey } = context;
      const now = Date.now();
      const lastTime = lastFetchTime.get(queryKey) ?? 0;
      const elapsed = now - lastTime;

      if (elapsed < throttleMs) {
        const cached = context.stateManager.getCache(queryKey);

        if (cached?.state?.data !== undefined) {
          return { data: cached.state.data, status: 200 };
        }

        return { data: undefined, status: 0 };
      }

      lastFetchTime.set(queryKey, now);

      return next();
    },
  };
}
