import type { SpooshPlugin, PluginContext } from "@spoosh/core";

import type {
  PollingReadOptions,
  PollingWriteOptions,
  PollingInfiniteReadOptions,
  PollingReadResult,
  PollingWriteResult,
} from "./types";

/**
 * Enables automatic polling for queries at configurable intervals.
 *
 * Automatically refetches data at specified intervals to keep it fresh.
 * Supports dynamic intervals based on current data or error state.
 *
 * @see {@link https://spoosh.dev/docs/plugins/polling | Polling Plugin Documentation}
 *
 * @example
 * ```ts
 * import { Spoosh } from "@spoosh/core";
 *
 * const client = new Spoosh<ApiSchema, Error>("/api")
 *   .use([
 *     // ... other plugins
 *     pollingPlugin(),
 *   ]);
 *
 * // Poll every 5 seconds
 * useRead((api) => api("posts").GET(), {
 *   pollingInterval: 5000,
 * });
 *
 * // Dynamic interval based on data
 * useRead((api) => api("posts").GET(), {
 *   pollingInterval: (data, error) => error ? 10000 : 5000,
 * });
 * ```
 */
export function pollingPlugin(): SpooshPlugin<{
  readOptions: PollingReadOptions;
  writeOptions: PollingWriteOptions;
  infiniteReadOptions: PollingInfiniteReadOptions;
  readResult: PollingReadResult;
  writeResult: PollingWriteResult;
}> {
  const timeouts = new Map<string, ReturnType<typeof setTimeout>>();

  const clearPolling = (queryKey: string) => {
    const timeout = timeouts.get(queryKey);

    if (timeout) {
      clearTimeout(timeout);
      timeouts.delete(queryKey);
    }
  };

  const scheduleNextPoll = (context: PluginContext) => {
    const { queryKey, eventEmitter } = context;

    const pluginOptions = context.pluginOptions as
      | PollingReadOptions
      | undefined;
    const pollingInterval = pluginOptions?.pollingInterval;

    if (!pollingInterval) return;

    const cached = context.stateManager.getCache(queryKey);
    const data = cached?.state.data;
    const error = cached?.state.error;

    const resolvedInterval =
      typeof pollingInterval === "function"
        ? pollingInterval(data, error)
        : pollingInterval;

    if (resolvedInterval === false || resolvedInterval <= 0) return;

    clearPolling(queryKey);

    const timeout = setTimeout(() => {
      timeouts.delete(queryKey);

      eventEmitter.emit("refetch", {
        queryKey,
        reason: "polling",
      });
    }, resolvedInterval);

    timeouts.set(queryKey, timeout);
  };

  return {
    name: "spoosh:polling",
    operations: ["read", "infiniteRead"],

    afterResponse(context) {
      scheduleNextPoll(context);
    },

    lifecycle: {
      onUpdate(context, previousContext) {
        if (previousContext.queryKey !== context.queryKey) {
          clearPolling(previousContext.queryKey);
        }

        const { queryKey } = context;

        const pluginOptions = context.pluginOptions as
          | PollingReadOptions
          | undefined;
        const pollingInterval = pluginOptions?.pollingInterval;

        if (!pollingInterval) {
          clearPolling(queryKey);
          return;
        }

        const currentTimeout = timeouts.get(queryKey);

        if (!currentTimeout) {
          scheduleNextPoll(context);
        }
      },

      onUnmount(context) {
        clearPolling(context.queryKey);
      },
    },
  };
}
