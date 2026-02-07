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
 * @see {@link https://spoosh.dev/docs/react/plugins/refetch | Refetch Plugin Documentation}
 *
 * @returns Refetch plugin instance
 *
 * @example
 * ```ts
 * import { Spoosh } from "@spoosh/core";
 *
 * const spoosh = new Spoosh<ApiSchema, Error>("/api")
 *   .use([
 *     // ... other plugins
 *     refetchPlugin({ refetchOnFocus: true, refetchOnReconnect: true }),
 *   ]);
 *
 * // Per-query override
 * useRead((api) => api("posts").GET(), {
 *   refetchOnFocus: false,
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
    instanceId: string,
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

    const entry = listenersByHook.get(instanceId) ?? { queryKey };
    entry.queryKey = queryKey;
    entry.focusCleanup = () => {
      document.removeEventListener("visibilitychange", visibilityHandler);
      window.removeEventListener("focus", focusHandler);
    };
    listenersByHook.set(instanceId, entry);
  };

  const setupReconnectListener = (
    instanceId: string,
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

    const entry = listenersByHook.get(instanceId) ?? { queryKey };
    entry.queryKey = queryKey;
    entry.reconnectCleanup = () => {
      window.removeEventListener("online", handler);
    };
    listenersByHook.set(instanceId, entry);
  };

  const cleanupHook = (instanceId: string) => {
    const entry = listenersByHook.get(instanceId);

    if (entry) {
      entry.focusCleanup?.();
      entry.reconnectCleanup?.();
      listenersByHook.delete(instanceId);
    }
  };

  const hasFocusListener = (instanceId: string): boolean => {
    return listenersByHook.get(instanceId)?.focusCleanup !== undefined;
  };

  const hasReconnectListener = (instanceId: string): boolean => {
    return listenersByHook.get(instanceId)?.reconnectCleanup !== undefined;
  };

  const removeFocusListener = (instanceId: string) => {
    const entry = listenersByHook.get(instanceId);

    if (entry?.focusCleanup) {
      entry.focusCleanup();
      entry.focusCleanup = undefined;
    }
  };

  const removeReconnectListener = (instanceId: string) => {
    const entry = listenersByHook.get(instanceId);

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
        const { queryKey, eventEmitter, instanceId } = context;

        if (!instanceId) return;

        const pluginOptions = context.pluginOptions as
          | RefetchReadOptions
          | undefined;

        const shouldRefetchOnFocus =
          pluginOptions?.refetchOnFocus ?? refetchOnFocus;
        const shouldRefetchOnReconnect =
          pluginOptions?.refetchOnReconnect ?? refetchOnReconnect;

        if (shouldRefetchOnFocus) {
          setupFocusListener(instanceId, queryKey, eventEmitter);
        }

        if (shouldRefetchOnReconnect) {
          setupReconnectListener(instanceId, queryKey, eventEmitter);
        }
      },

      onUpdate(context) {
        const { queryKey, eventEmitter, instanceId } = context;

        if (!instanceId) return;

        const pluginOptions = context.pluginOptions as
          | RefetchReadOptions
          | undefined;

        const shouldRefetchOnFocus =
          pluginOptions?.refetchOnFocus ?? refetchOnFocus;
        const shouldRefetchOnReconnect =
          pluginOptions?.refetchOnReconnect ?? refetchOnReconnect;

        const entry = listenersByHook.get(instanceId);
        const queryKeyChanged = entry && entry.queryKey !== queryKey;

        if (queryKeyChanged) {
          cleanupHook(instanceId);
        }

        if (shouldRefetchOnFocus && !hasFocusListener(instanceId)) {
          setupFocusListener(instanceId, queryKey, eventEmitter);
        } else if (!shouldRefetchOnFocus && hasFocusListener(instanceId)) {
          removeFocusListener(instanceId);
        }

        if (shouldRefetchOnReconnect && !hasReconnectListener(instanceId)) {
          setupReconnectListener(instanceId, queryKey, eventEmitter);
        } else if (
          !shouldRefetchOnReconnect &&
          hasReconnectListener(instanceId)
        ) {
          removeReconnectListener(instanceId);
        }
      },

      onUnmount(context) {
        if (context.instanceId) {
          cleanupHook(context.instanceId);
        }
      },
    },
  };
}
