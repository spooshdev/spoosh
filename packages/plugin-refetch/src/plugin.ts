import type { EventEmitter, SpooshPlugin } from "@spoosh/core";
import type {
  RefetchPluginConfig,
  RefetchReadOptions,
  RefetchWriteOptions,
  RefetchInfiniteReadOptions,
  RefetchReadResult,
  RefetchWriteResult,
} from "./types";

type CleanupFn = () => void;

type HookListenerEntry = {
  queryKey: string;
  focusCleanup?: CleanupFn;
  reconnectCleanup?: CleanupFn;
};

/**
 * Enables automatic refetching on window focus and network reconnect.
 *
 * @param config - Plugin configuration
 *
 * @see {@link https://spoosh.dev/docs/plugins/refetch | Refetch Plugin Documentation}
 *
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
export function refetchPlugin(config: RefetchPluginConfig = {}): SpooshPlugin<{
  readOptions: RefetchReadOptions;
  writeOptions: RefetchWriteOptions;
  infiniteReadOptions: RefetchInfiniteReadOptions;
  readResult: RefetchReadResult;
  writeResult: RefetchWriteResult;
}> {
  const { refetchOnFocus = false, refetchOnReconnect = false } = config;

  const listenersByHook = new Map<string, HookListenerEntry>();

  const isBrowser = typeof window !== "undefined";

  const setupFocusListener = (
    hookId: string,
    queryKey: string,
    eventEmitter: EventEmitter
  ) => {
    if (!isBrowser) return;

    const visibilityHandler = () => {
      if (document.visibilityState === "visible") {
        eventEmitter.emit("refetch", {
          queryKey,
          reason: "focus",
        });
      }
    };

    const focusHandler = () => {
      eventEmitter.emit("refetch", {
        queryKey,
        reason: "focus",
      });
    };

    document.addEventListener("visibilitychange", visibilityHandler);
    window.addEventListener("focus", focusHandler);

    const entry = listenersByHook.get(hookId) ?? { queryKey };
    entry.queryKey = queryKey;
    entry.focusCleanup = () => {
      document.removeEventListener("visibilitychange", visibilityHandler);
      window.removeEventListener("focus", focusHandler);
    };
    listenersByHook.set(hookId, entry);
  };

  const setupReconnectListener = (
    hookId: string,
    queryKey: string,
    eventEmitter: EventEmitter
  ) => {
    if (!isBrowser) return;

    const handler = () => {
      eventEmitter.emit("refetch", {
        queryKey,
        reason: "reconnect",
      });
    };

    window.addEventListener("online", handler);

    const entry = listenersByHook.get(hookId) ?? { queryKey };
    entry.queryKey = queryKey;
    entry.reconnectCleanup = () => {
      window.removeEventListener("online", handler);
    };
    listenersByHook.set(hookId, entry);
  };

  const cleanupHook = (hookId: string) => {
    const entry = listenersByHook.get(hookId);

    if (entry) {
      entry.focusCleanup?.();
      entry.reconnectCleanup?.();
      listenersByHook.delete(hookId);
    }
  };

  const hasFocusListener = (hookId: string): boolean => {
    return listenersByHook.get(hookId)?.focusCleanup !== undefined;
  };

  const hasReconnectListener = (hookId: string): boolean => {
    return listenersByHook.get(hookId)?.reconnectCleanup !== undefined;
  };

  const removeFocusListener = (hookId: string) => {
    const entry = listenersByHook.get(hookId);

    if (entry?.focusCleanup) {
      entry.focusCleanup();
      entry.focusCleanup = undefined;
    }
  };

  const removeReconnectListener = (hookId: string) => {
    const entry = listenersByHook.get(hookId);

    if (entry?.reconnectCleanup) {
      entry.reconnectCleanup();
      entry.reconnectCleanup = undefined;
    }
  };

  return {
    name: "spoosh:refetch",
    operations: ["read", "infiniteRead"],

    lifecycle: {
      onMount(context) {
        const { queryKey, eventEmitter, hookId } = context;

        if (!hookId) return;

        const pluginOptions = context.pluginOptions as
          | RefetchReadOptions
          | undefined;

        const shouldRefetchOnFocus =
          pluginOptions?.refetchOnFocus ?? refetchOnFocus;
        const shouldRefetchOnReconnect =
          pluginOptions?.refetchOnReconnect ?? refetchOnReconnect;

        if (shouldRefetchOnFocus) {
          setupFocusListener(hookId, queryKey, eventEmitter);
        }

        if (shouldRefetchOnReconnect) {
          setupReconnectListener(hookId, queryKey, eventEmitter);
        }
      },

      onUpdate(context) {
        const { queryKey, eventEmitter, hookId } = context;

        if (!hookId) return;

        const pluginOptions = context.pluginOptions as
          | RefetchReadOptions
          | undefined;

        const shouldRefetchOnFocus =
          pluginOptions?.refetchOnFocus ?? refetchOnFocus;
        const shouldRefetchOnReconnect =
          pluginOptions?.refetchOnReconnect ?? refetchOnReconnect;

        const entry = listenersByHook.get(hookId);
        const queryKeyChanged = entry && entry.queryKey !== queryKey;

        if (queryKeyChanged) {
          cleanupHook(hookId);
        }

        if (shouldRefetchOnFocus && !hasFocusListener(hookId)) {
          setupFocusListener(hookId, queryKey, eventEmitter);
        } else if (!shouldRefetchOnFocus && hasFocusListener(hookId)) {
          removeFocusListener(hookId);
        }

        if (shouldRefetchOnReconnect && !hasReconnectListener(hookId)) {
          setupReconnectListener(hookId, queryKey, eventEmitter);
        } else if (!shouldRefetchOnReconnect && hasReconnectListener(hookId)) {
          removeReconnectListener(hookId);
        }
      },

      onUnmount(context) {
        if (context.hookId) {
          cleanupHook(context.hookId);
        }
      },
    },
  };
}
