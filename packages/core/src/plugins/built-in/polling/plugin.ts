import type { EnlacePlugin, PluginContext } from "../../types";
import type {
  PollingReadOptions,
  PollingWriteOptions,
  PollingInfiniteReadOptions,
  PollingReadResult,
  PollingWriteResult,
} from "./types";

/**
 * Enables automatic polling/refetching at configurable intervals.
 *
 * Supports both static intervals and dynamic intervals based on current data/error state.
 *
 * @returns Polling plugin instance
 *
 * @example
 * ```ts
 * const plugins = [pollingPlugin()];
 *
 * // Static interval
 * useRead((api) => api.posts.$get(), { pollingInterval: 5000 });
 *
 * // Dynamic interval based on data
 * useRead((api) => api.order[1].$get(), {
 *   pollingInterval: (data, error) => {
 *     if (error) return 10000; // Slower on error
 *     if (data?.status === "processing") return 1000; // Fast while processing
 *     return false; // Stop polling when complete
 *   },
 * });
 * ```
 */
export function pollingPlugin(): EnlacePlugin<{
  readOptions: PollingReadOptions;
  writeOptions: PollingWriteOptions;
  infiniteReadOptions: PollingInfiniteReadOptions;
  readResult: PollingReadResult;
  writeResult: PollingWriteResult;
}> {
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
    const { queryKey } = context;

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
          | ((force?: boolean) => void)
          | undefined;

        if (execute) {
          refetchFns.set(context.queryKey, () => execute(true));
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

      onOptionsUpdate(context: PluginContext) {
        const { queryKey } = context;
        const refetch = refetchFns.get(queryKey);

        if (!refetch) return context;

        const pluginOptions = context.pluginOptions as
          | PollingReadOptions
          | undefined;
        const pollingInterval = pluginOptions?.pollingInterval;

        if (!pollingInterval) {
          clearPolling(queryKey);
          return context;
        }

        const currentTimeout = timeouts.get(queryKey);

        if (!currentTimeout) {
          scheduleNextPoll(context);
        }

        return context;
      },
    },
  };
}
