import type { SpooshPlugin } from "@spoosh/core";

import type {
  RetryPluginConfig,
  RetryReadOptions,
  RetryWriteOptions,
  RetryInfiniteReadOptions,
  RetryReadResult,
  RetryWriteResult,
} from "./types";

/**
 * Enables automatic retry for failed requests.
 *
 * Retries failed requests with configurable attempt count and delay.
 *
 * @param config - Plugin configuration
 *
 * @see {@link https://spoosh.dev/docs/plugins/retry | Retry Plugin Documentation}
 *
 * @example
 * ```ts
 * import { Spoosh } from "@spoosh/core";
 *
 * const client = new Spoosh<ApiSchema, Error>("/api")
 *   .use([
 *     // ... other plugins
 *     retryPlugin({ retries: 3, retryDelay: 1000 }),
 *   ]);
 *
 * // Per-query override
 * useRead((api) => api.posts.$get(), {
 *   retries: 5,
 *   retryDelay: 2000,
 * });
 * ```
 */
export function retryPlugin(config: RetryPluginConfig = {}): SpooshPlugin<{
  readOptions: RetryReadOptions;
  writeOptions: RetryWriteOptions;
  infiniteReadOptions: RetryInfiniteReadOptions;
  readResult: RetryReadResult;
  writeResult: RetryWriteResult;
}> {
  const { retries: defaultRetries = 3, retryDelay: defaultRetryDelay = 1000 } =
    config;

  return {
    name: "spoosh:retry",
    operations: ["read", "write", "infiniteRead"],

    middleware: async (context, next) => {
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

      return next();
    },
  };
}
