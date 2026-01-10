import type { EnlacePlugin, PluginContext, PluginPhase } from "../../types";
import type {
  DebugPluginConfig,
  DebugReadOptions,
  DebugWriteOptions,
  DebugInfiniteReadOptions,
  DebugReadResult,
  DebugWriteResult,
  DebugLogEntry,
} from "./types";

/**
 * Development plugin for debugging and inspecting plugin context.
 *
 * Logs detailed information about each plugin phase including paths,
 * request options, cache entries, and state changes.
 *
 * @param config - Plugin configuration
 * @returns Debug plugin instance
 *
 * @example
 * ```ts
 * // Basic usage - logs all phases
 * const plugins = [debugPlugin()];
 *
 * // With cache logging
 * const plugins = [debugPlugin({ logCache: true })];
 *
 * // Custom logger with object shape
 * const plugins = [debugPlugin({
 *   logger: (entry) => {
 *     console.log(entry.phase, entry.path, entry.state.data);
 *   },
 * })];
 *
 * // Disable in production
 * const plugins = [debugPlugin({ enabled: process.env.NODE_ENV === 'development' })];
 * ```
 */
export function debugPlugin(config: DebugPluginConfig = {}): EnlacePlugin<{
  readOptions: DebugReadOptions;
  writeOptions: DebugWriteOptions;
  infiniteReadOptions: DebugInfiniteReadOptions;
  readResult: DebugReadResult;
  writeResult: DebugWriteResult;
}> {
  const { enabled = true, logCache = false, logger } = config;

  let lastRequestTimestamp: number | null = null;

  const logPhase = (phase: PluginPhase, context: PluginContext) => {
    if (!enabled) return;

    const cacheEntries = logCache
      ? context.stateManager
          .getCacheEntriesByTags(context.tags)
          .map(({ key, entry }) => ({ key, data: entry.state.data }))
      : undefined;

    const entry: DebugLogEntry = {
      phase,
      operationType: context.operationType,
      method: context.method,
      path: context.path.join("/"),
      queryKey: context.queryKey,
      requestTimestamp: context.requestTimestamp,
      tags: context.tags,
      requestOptions: context.requestOptions,
      state: {
        loading: context.state.loading,
        fetching: context.state.fetching,
        data: context.state.data,
        error: context.state.error,
        isOptimistic: context.state.isOptimistic,
        isStale: context.state.isStale,
        timestamp: context.state.timestamp,
      },
      response: context.response
        ? {
            data: context.response.data,
            error: context.response.error,
            status: context.response.status,
          }
        : undefined,
      cacheEntries,
    };

    if (logger) {
      logger(entry);
      return;
    }

    if (
      lastRequestTimestamp &&
      lastRequestTimestamp !== context.requestTimestamp
    ) {
      console.log("─".repeat(80));
    }
    lastRequestTimestamp = context.requestTimestamp;

    const label = `[enlace] ${context.operationType} ${context.method} /${context.path.join("/")} → ${phase}`;

    console.groupCollapsed(label);
    console.log("Query Key:", context.queryKey);
    console.log("Tags:", context.tags);
    console.log("Request Options:", context.requestOptions);
    console.log("State:", context.state);

    if (context.response) {
      console.log("Response:", context.response);
    }

    if (cacheEntries) {
      console.groupCollapsed(`Cache Entries (${cacheEntries.length})`);
      for (const { key, data } of cacheEntries) {
        console.log(key, data);
      }
      console.groupEnd();
    }

    console.groupEnd();
  };

  return {
    name: "enlace:debug",
    operations: ["read", "write", "infiniteRead"],

    handlers: {
      beforeFetch(context) {
        logPhase("beforeFetch", context);
        return context;
      },

      afterFetch(context) {
        logPhase("afterFetch", context);
        return context;
      },

      onSuccess(context) {
        logPhase("onSuccess", context);
        return context;
      },

      onError(context) {
        logPhase("onError", context);
        return context;
      },

      onMount(context) {
        logPhase("onMount", context);
        return context;
      },

      onUnmount(context) {
        logPhase("onUnmount", context);
        return context;
      },

      onOptionsUpdate(context) {
        logPhase("onOptionsUpdate", context);
        return context;
      },
    },
  };
}
