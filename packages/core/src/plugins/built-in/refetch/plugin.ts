import type { EventEmitter } from "../../../events/emitter";
import type { EnlacePlugin, RefetchEvent } from "../../types";
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

  const setupFocusListener = (queryKey: string, eventEmitter: EventEmitter) => {
    if (!isBrowser) return;

    const handler = () => {
      if (document.visibilityState === "visible") {
        eventEmitter.emit<RefetchEvent>("refetch", {
          queryKey,
          reason: "focus",
        });
      }
    };

    document.addEventListener("visibilitychange", handler);
    focusUnsubscribers.set(queryKey, () => {
      document.removeEventListener("visibilitychange", handler);
    });
  };

  const setupReconnectListener = (
    queryKey: string,
    eventEmitter: EventEmitter
  ) => {
    if (!isBrowser) return;

    const handler = () => {
      eventEmitter.emit<RefetchEvent>("refetch", {
        queryKey,
        reason: "reconnect",
      });
    };

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
    dependencies: ["enlace:invalidation"],

    handlers: {
      onMount(context) {
        const { queryKey, tags, eventEmitter } = context;

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
                eventEmitter.emit<RefetchEvent>("refetch", {
                  queryKey,
                  reason: "invalidate",
                });
              }
            }
          );

          invalidateUnsubscribers.set(queryKey, unsubscribe);
        }

        if (shouldRefetchOnFocus) {
          setupFocusListener(queryKey, eventEmitter);
        }

        if (shouldRefetchOnReconnect) {
          setupReconnectListener(queryKey, eventEmitter);
        }

        return context;
      },

      onUnmount(context) {
        cleanupQuery(context.queryKey);
        return context;
      },
    },
  };
}
