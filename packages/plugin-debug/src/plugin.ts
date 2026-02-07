import type { SpooshPlugin, PluginContext, SpooshResponse } from "@spoosh/core";
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
 * @see {@link https://spoosh.dev/docs/react/plugins/debug | Debug Plugin Documentation}
 *
 * @returns Debug plugin instance
 *
 * @example
 * ```ts
 * import { Spoosh } from "@spoosh/core";
 *
 * // Basic usage - logs all phases
 * const spoosh = new Spoosh<ApiSchema, Error>("/api")
 *   .use([
 *     // ... other plugins
 *     debugPlugin(),
 *   ]);
 *
 * // With cache logging
 * const spoosh = new Spoosh<ApiSchema, Error>("/api")
 *   .use([
 *     // ... other plugins
 *     debugPlugin({ logCache: true }),
 *   ]);
 *
 * // Custom logger with object shape
 * const spoosh = new Spoosh<ApiSchema, Error>("/api")
 *   .use([
 *     // ... other plugins
 *     debugPlugin({
 *       logger: (entry) => {
 *         console.log(entry.phase, entry.path, entry.state.data);
 *       },
 *     }),
 *   ]);
 *
 * // Disable in production
 * const spoosh = new Spoosh<ApiSchema, Error>("/api")
 *   .use([
 *     // ... other plugins
 *     debugPlugin({ enabled: process.env.NODE_ENV === 'development' }),
 *   ]);
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

  const logPhase = (
    phase: DebugPhase,
    context: PluginContext,
    response?: SpooshResponse<unknown, unknown>
  ) => {
    if (!enabled) return;

    const cacheEntries = logCache
      ? context.stateManager
          .getCacheEntriesByTags(context.tags)
          .map(({ key, entry }) => ({ key, data: entry.state.data }))
      : undefined;

    const cached = context.stateManager.getCache(context.queryKey);

    const entry: DebugLogEntry = {
      phase,
      operationType: context.operationType,
      method: context.method,
      path: context.path,
      queryKey: context.queryKey,
      requestTimestamp: context.requestTimestamp,
      tags: context.tags,
      requestOptions: context.request,
      state: {
        data: cached?.state.data,
        error: cached?.state.error,
        timestamp: cached?.state.timestamp ?? Date.now(),
      },
      response: response
        ? {
            data: response.data,
            error: response.error,
            status: response.status,
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

    const label = `[spoosh] ${context.operationType} ${context.method} /${context.path} → ${phase}`;

    console.groupCollapsed(label);
    console.log("Query Key:", context.queryKey);
    console.log("Tags:", context.tags);
    console.log("Request Options:", context.request);
    console.log("Cache State:", cached?.state);

    if (response) {
      console.log("Response:", response);
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

    afterResponse(context, response) {
      logPhase("afterFetch", context, response);
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
