import type { EnlacePlugin, PluginContext } from "../../types";
import type {
  PollingReadOptions,
  PollingWriteOptions,
  PollingInfiniteReadOptions,
  PollingReadResult,
  PollingWriteResult,
} from "./types";

export function pollingPlugin(): EnlacePlugin<
  PollingReadOptions,
  PollingWriteOptions,
  PollingInfiniteReadOptions,
  PollingReadResult,
  PollingWriteResult
> {
  const timeouts = new Map<string, ReturnType<typeof setTimeout>>();
  const refetchFns = new Map<string, () => void>();

  const clearPolling = (queryKey: string) => {
    const timeout = timeouts.get(queryKey);

    if (timeout) {
      clearTimeout(timeout);
      timeouts.delete(queryKey);
    }
  };

  const scheduleNextPoll = (context: PluginContext) => {
    const { queryKey, metadata } = context;

    const pluginOptions = metadata.get("pluginOptions") as
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

    const refetch = refetchFns.get(queryKey);

    if (!refetch) return;

    const timeout = setTimeout(() => {
      refetch();
    }, resolvedInterval);

    timeouts.set(queryKey, timeout);
  };

  return {
    name: "enlace:polling",
    operations: ["read", "infiniteRead"],

    handlers: {
      onMount(context: PluginContext) {
        const execute = context.metadata.get("execute") as
          | (() => void)
          | undefined;

        if (execute) {
          refetchFns.set(context.queryKey, execute);
        }

        return context;
      },

      onSuccess(context: PluginContext) {
        scheduleNextPoll(context);
        return context;
      },

      onError(context: PluginContext) {
        scheduleNextPoll(context);
        return context;
      },

      onUnmount(context: PluginContext) {
        clearPolling(context.queryKey);
        refetchFns.delete(context.queryKey);
        return context;
      },
    },

    cleanup() {
      timeouts.forEach((timeout) => clearTimeout(timeout));
      timeouts.clear();
      refetchFns.clear();
    },
  };
}
