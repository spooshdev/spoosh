import type { EnlacePlugin, PluginContext } from "../../types";
import type {
  RefetchPluginConfig,
  RefetchReadOptions,
  RefetchWriteOptions,
  RefetchInfiniteReadOptions,
  RefetchReadResult,
  RefetchWriteResult,
} from "./types";

type CleanupFn = () => void;

/**
 * Enables automatic refetching on window focus, network reconnect, and tag invalidation.
 *
 * @param config - Plugin configuration
 * @returns Refetch plugin instance
 *
 * @example
 * ```ts
 * const plugins = [
 *   refetchPlugin({ refetchOnFocus: true, refetchOnReconnect: true }),
 * ];
 *
 * // Per-query override
 * useRead((api) => api.posts.$get(), {
 *   refetchOnFocus: false, // Disable for this query
 * });
 * ```
 */
export function refetchPlugin(config: RefetchPluginConfig = {}): EnlacePlugin<{
  readOptions: RefetchReadOptions;
  writeOptions: RefetchWriteOptions;
  infiniteReadOptions: RefetchInfiniteReadOptions;
  readResult: RefetchReadResult;
  writeResult: RefetchWriteResult;
}> {
  const { refetchOnFocus = false, refetchOnReconnect = false } = config;

  const invalidateUnsubscribers = new Map<string, CleanupFn>();
  const focusUnsubscribers = new Map<string, CleanupFn>();
  const reconnectUnsubscribers = new Map<string, CleanupFn>();

  const isBrowser = typeof window !== "undefined";

  const setupFocusListener = (queryKey: string, execute: () => void) => {
    if (!isBrowser) return;

    const handler = () => {
      if (document.visibilityState === "visible") {
        execute();
      }
    };

    document.addEventListener("visibilitychange", handler);
    focusUnsubscribers.set(queryKey, () => {
      document.removeEventListener("visibilitychange", handler);
    });
  };

  const setupReconnectListener = (queryKey: string, execute: () => void) => {
    if (!isBrowser) return;

    const handler = () => execute();

    window.addEventListener("online", handler);
    reconnectUnsubscribers.set(queryKey, () => {
      window.removeEventListener("online", handler);
    });
  };

  const cleanupQuery = (queryKey: string) => {
    const invalidateUnsub = invalidateUnsubscribers.get(queryKey);
    if (invalidateUnsub) {
      invalidateUnsub();
      invalidateUnsubscribers.delete(queryKey);
    }

    const focusUnsub = focusUnsubscribers.get(queryKey);
    if (focusUnsub) {
      focusUnsub();
      focusUnsubscribers.delete(queryKey);
    }

    const reconnectUnsub = reconnectUnsubscribers.get(queryKey);
    if (reconnectUnsub) {
      reconnectUnsub();
      reconnectUnsubscribers.delete(queryKey);
    }
  };

  return {
    name: "enlace:refetch",
    operations: ["read", "infiniteRead"],

    handlers: {
      onMount(context: PluginContext) {
        const { queryKey, tags, eventEmitter, metadata } = context;

        const execute = metadata.get("execute") as
          | ((force?: boolean) => void)
          | undefined;

        if (!execute) return context;

        const pluginOptions = context.pluginOptions as
          | RefetchReadOptions
          | undefined;

        const shouldRefetchOnFocus =
          pluginOptions?.refetchOnFocus ?? refetchOnFocus;
        const shouldRefetchOnReconnect =
          pluginOptions?.refetchOnReconnect ?? refetchOnReconnect;

        if (tags.length > 0) {
          const unsubscribe = eventEmitter.on<string[]>(
            "invalidate",
            (invalidatedTags) => {
              const hasMatch = invalidatedTags.some((tag) =>
                tags.includes(tag)
              );

              if (hasMatch) {
                execute(true);
              }
            }
          );

          invalidateUnsubscribers.set(queryKey, unsubscribe);
        }

        if (shouldRefetchOnFocus) {
          setupFocusListener(queryKey, () => execute(true));
        }

        if (shouldRefetchOnReconnect) {
          setupReconnectListener(queryKey, () => execute(true));
        }

        return context;
      },

      onUnmount(context: PluginContext) {
        cleanupQuery(context.queryKey);
        return context;
      },
    },
  };
}
