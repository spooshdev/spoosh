import type { EnlacePlugin } from "../../types";
import type {
  RetryPluginConfig,
  RetryReadOptions,
  RetryWriteOptions,
  RetryInfiniteReadOptions,
  RetryReadResult,
  RetryWriteResult,
} from "./types";

export function retryPlugin(
  config: RetryPluginConfig = {}
): EnlacePlugin<{
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
        const pluginOptions = context.metadata.get("pluginOptions") as
          | RetryReadOptions
          | undefined;

        const retries = pluginOptions?.retries ?? defaultRetries;
        const retryDelay = pluginOptions?.retryDelay ?? defaultRetryDelay;

        context.requestOptions = {
          ...context.requestOptions,
          retry: retries,
          retryDelay,
        };

        return context;
      },
    },
  };
}
