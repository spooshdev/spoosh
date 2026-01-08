import type { EnlacePlugin, PluginContext } from "../../types";
import type {
  RevalidationPluginConfig,
  RevalidationReadOptions,
  RevalidationWriteOptions,
  RevalidationInfiniteReadOptions,
  RevalidationReadResult,
  RevalidationWriteResult,
} from "./types";

type CleanupFn = () => void;

export function revalidationPlugin(
  config: RevalidationPluginConfig = {}
): EnlacePlugin<
  RevalidationReadOptions,
  RevalidationWriteOptions,
  RevalidationInfiniteReadOptions,
  RevalidationReadResult,
  RevalidationWriteResult
> {
  const { revalidateOnFocus = false, revalidateOnReconnect = false } = config;

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
    name: "enlace:revalidation",
    operations: ["read", "infiniteRead"],

    handlers: {
      onMount(context: PluginContext) {
        const { queryKey, tags, eventEmitter, metadata } = context;

        const execute = metadata.get("execute") as (() => void) | undefined;

        if (!execute) return context;

        const pluginOptions = metadata.get("pluginOptions") as
          | RevalidationReadOptions
          | undefined;

        const shouldRevalidateOnFocus =
          pluginOptions?.revalidateOnFocus ?? revalidateOnFocus;
        const shouldRevalidateOnReconnect =
          pluginOptions?.revalidateOnReconnect ?? revalidateOnReconnect;

        if (tags.length > 0) {
          const unsubscribe = eventEmitter.on<string[]>(
            "invalidate",
            (invalidatedTags) => {
              const hasMatch = invalidatedTags.some((tag) =>
                tags.includes(tag)
              );

              if (hasMatch) {
                execute();
              }
            }
          );

          invalidateUnsubscribers.set(queryKey, unsubscribe);
        }

        if (shouldRevalidateOnFocus) {
          setupFocusListener(queryKey, execute);
        }

        if (shouldRevalidateOnReconnect) {
          setupReconnectListener(queryKey, execute);
        }

        return context;
      },

      onUnmount(context: PluginContext) {
        cleanupQuery(context.queryKey);
        return context;
      },
    },

    cleanup() {
      invalidateUnsubscribers.forEach((unsub) => unsub());
      invalidateUnsubscribers.clear();

      focusUnsubscribers.forEach((unsub) => unsub());
      focusUnsubscribers.clear();

      reconnectUnsubscribers.forEach((unsub) => unsub());
      reconnectUnsubscribers.clear();
    },
  };
}
