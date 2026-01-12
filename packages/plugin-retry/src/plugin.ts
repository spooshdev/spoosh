import type { SpooshPlugin } from "@spoosh/core";

import type {
  RetryPluginConfig,
  RetryReadOptions,
  RetryWriteOptions,
  RetryInfiniteReadOptions,
  RetryReadResult,
  RetryWriteResult,
} from "./types";

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
