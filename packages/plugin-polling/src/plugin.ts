import type { SpooshPlugin, PluginContext } from "@spoosh/core";

import type {
  PollingReadOptions,
  PollingWriteOptions,
  PollingInfiniteReadOptions,
  PollingReadResult,
  PollingWriteResult,
} from "./types";

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

    onResponse(context) {
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
