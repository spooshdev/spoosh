import type { EnlacePlugin, PluginContext } from "../../types";
import type {
  RevalidationReadOptions,
  RevalidationWriteOptions,
} from "./types";

export type { RevalidationReadOptions, RevalidationWriteOptions };

export interface RevalidationPluginConfig {
  revalidateOnFocus?: boolean;
  revalidateOnReconnect?: boolean;
}

export function revalidationPlugin(
  config: RevalidationPluginConfig = {}
): EnlacePlugin<RevalidationReadOptions, RevalidationWriteOptions> {
  const unsubscribers = new Map<string, () => void>();

  return {
    name: "enlace:revalidation",
    operations: ["read", "infiniteRead"],

    handlers: {
      onMount(context: PluginContext) {
        const { queryKey, tags, onInvalidate, metadata } = context;

        if (tags.length === 0) return context;

        const execute = metadata.get("execute") as (() => void) | undefined;

        if (!execute) return context;

        const unsubscribe = onInvalidate((invalidatedTags) => {
          const hasMatch = invalidatedTags.some((tag) => tags.includes(tag));

          if (hasMatch) {
            execute();
          }
        });

        unsubscribers.set(queryKey, unsubscribe);

        return context;
      },

      onUnmount(context: PluginContext) {
        const { queryKey } = context;
        const unsubscribe = unsubscribers.get(queryKey);

        if (unsubscribe) {
          unsubscribe();
          unsubscribers.delete(queryKey);
        }

        return context;
      },
    },

    cleanup() {
      unsubscribers.forEach((unsubscribe) => unsubscribe());
      unsubscribers.clear();
    },
  };
}
