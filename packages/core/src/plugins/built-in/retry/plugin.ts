import type { EnlacePlugin } from "../../types";
import type {
  RetryPluginConfig,
  RetryReadOptions,
  RetryWriteOptions,
  RetryInfiniteReadOptions,
  RetryReadResult,
  RetryWriteResult,
} from "./types";

/**
 * Automatically retries failed requests with configurable attempts and delay.
 *
 * @param config - Plugin configuration
 * @returns Retry plugin instance
 *
 * @example
 * ```ts
 * const plugins = [
 *   retryPlugin({ retries: 3, retryDelay: 1000 }),
 * ];
 *
 * // Per-query override
 * useRead((api) => api.posts.$get(), { retries: 5, retryDelay: 2000 });
 *
 * // Disable retries for a specific query
 * useRead((api) => api.posts.$get(), { retries: false });
 * ```
 */
export function retryPlugin(config: RetryPluginConfig = {}): EnlacePlugin<{
  readOptions: RetryReadOptions;
  writeOptions: RetryWriteOptions;
  infiniteReadOptions: RetryInfiniteReadOptions;
  readResult: RetryReadResult;
  writeResult: RetryWriteResult;
}> {
  const { retries: defaultRetries = 3, retryDelay: defaultRetryDelay = 1000 } =
    config;

  return {
    name: "enlace:retry",
    operations: ["read", "write", "infiniteRead"],

    handlers: {
      beforeFetch(context) {
        const pluginOptions = context.pluginOptions as
          | RetryReadOptions
          | undefined;

        const retries = pluginOptions?.retries ?? defaultRetries;
        const retryDelay = pluginOptions?.retryDelay ?? defaultRetryDelay;

        context.requestOptions = {
          ...context.requestOptions,
          retries,
          retryDelay,
        };

        return context;
      },
    },
  };
}
