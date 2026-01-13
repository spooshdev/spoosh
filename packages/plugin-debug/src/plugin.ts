import type { SpooshPlugin, PluginContext } from "@spoosh/core";
import type {
  DebugPluginConfig,
  DebugReadOptions,
  DebugWriteOptions,
  DebugInfiniteReadOptions,
  DebugReadResult,
  DebugWriteResult,
  DebugLogEntry,
} from "./types";

type DebugPhase =
  | "onMount"
  | "onUpdate"
  | "onUnmount"
  | "beforeFetch"
  | "afterFetch";

/**
 * Development plugin for debugging and inspecting plugin context.
 *
 * Logs detailed information about each plugin phase including paths,
 * request options, cache entries, and state changes.
 *
 * @param config - Plugin configuration
 *
 * @see {@link https://spoosh.dev/docs/plugins/debug | Debug Plugin Documentation}
 *
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
export function debugPlugin(config: DebugPluginConfig = {}): SpooshPlugin<{
  readOptions: DebugReadOptions;
  writeOptions: DebugWriteOptions;
  infiniteReadOptions: DebugInfiniteReadOptions;
  readResult: DebugReadResult;
  writeResult: DebugWriteResult;
}> {
  const { enabled = true, logCache = false, logger } = config;

  let lastRequestTimestamp: number | null = null;

  const logPhase = (phase: DebugPhase, context: PluginContext) => {
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
        data: context.state.data,
        error: context.state.error,
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

    const label = `[spoosh] ${context.operationType} ${context.method} /${context.path.join("/")} → ${phase}`;

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
    name: "spoosh:debug",
    operations: ["read", "write", "infiniteRead"],

    middleware: async (context, next) => {
      logPhase("beforeFetch", context);
      return next();
    },

    onResponse(context, response) {
      context.response = response;
      logPhase("afterFetch", context);
    },

    lifecycle: {
      onMount(context) {
        logPhase("onMount", context);
      },

      onUpdate(context) {
        logPhase("onUpdate", context);
      },

      onUnmount(context) {
        logPhase("onUnmount", context);
      },
    },
  };
}
