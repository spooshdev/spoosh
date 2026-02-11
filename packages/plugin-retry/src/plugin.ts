import { isNetworkError, isAbortError, clone } from "@spoosh/core";
import type { SpooshPlugin, SpooshResponse } from "@spoosh/core";

import type {
  RetryPluginConfig,
  RetryReadOptions,
  RetryWriteOptions,
  RetryInfiniteReadOptions,
  RetryReadResult,
  RetryWriteResult,
  ShouldRetryCallback,
} from "./types";
import { DEFAULT_RETRY_STATUS_CODES } from "./types";

const PLUGIN_NAME = "spoosh:retry";

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const defaultShouldRetry: ShouldRetryCallback = ({ status }) => {
  if (status === undefined) return false;
  return (DEFAULT_RETRY_STATUS_CODES as readonly number[]).includes(status);
};

/**
 * Enables automatic retry for failed requests.
 *
 * Retries failed requests with configurable attempt count and delay.
 *
 * @param config - Plugin configuration
 *
 * @see {@link https://spoosh.dev/docs/react/plugins/retry | Retry Plugin Documentation}
 *
 * @example
 * ```ts
 * import { Spoosh } from "@spoosh/core";
 *
 * const spoosh = new Spoosh<ApiSchema, Error>("/api")
 *   .use([
 *     // ... other plugins
 *     retryPlugin({ retries: 3, retryDelay: 1000 }),
 *   ]);
 *
 * // Per-query override
 * useRead((api) => api("posts").GET(), {
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
  const {
    retries: defaultRetries = 3,
    retryDelay: defaultRetryDelay = 1000,
    shouldRetry: defaultShouldRetryFn = defaultShouldRetry,
  } = config;

  return {
    name: PLUGIN_NAME,
    operations: ["read", "write", "infiniteRead"],
    priority: 200,

    middleware: async (context, next) => {
      const t = context.tracer?.(PLUGIN_NAME);
      const pluginOptions = context.pluginOptions as
        | RetryReadOptions
        | undefined;

      const retriesConfig = pluginOptions?.retries ?? defaultRetries;
      const retryDelayConfig = pluginOptions?.retryDelay ?? defaultRetryDelay;
      const shouldRetryFn = pluginOptions?.shouldRetry ?? defaultShouldRetryFn;

      const maxRetries = retriesConfig === false ? 0 : retriesConfig;

      if (!maxRetries || maxRetries < 0) {
        t?.skip("Disabled");
        return next();
      }

      const originalRequest = {
        headers: clone(context.request.headers),
        params: clone(context.request.params),
        body: clone(context.request.body),
      };

      let res: SpooshResponse<unknown, unknown>;

      for (let attempt = 0; attempt <= maxRetries; attempt++) {
        if (attempt > 0) {
          context.request.headers = clone(originalRequest.headers);
          context.request.params = clone(originalRequest.params);
          context.request.body = clone(originalRequest.body);

          t?.log(`Retry ${attempt}/${maxRetries}`, { color: "warning" });
        }

        res = await next();

        if (isAbortError(res.error)) {
          t?.log("Aborted", { color: "muted" });
          return res;
        }

        const isLastAttempt = attempt >= maxRetries;

        if (isNetworkError(res.error)) {
          if (isLastAttempt) {
            t?.log("Max retries reached (network error)", { color: "error" });
            return res;
          }

          const delayMs = retryDelayConfig * Math.pow(2, attempt);
          await delay(delayMs);
          continue;
        }

        if (res.error) {
          const shouldRetryResult = shouldRetryFn({
            status: res.status,
            error: res.error,
            attempt,
            maxRetries,
          });

          if (shouldRetryResult && !isLastAttempt) {
            t?.log(`Status ${res.status} - will retry`, { color: "warning" });
            const delayMs = retryDelayConfig * Math.pow(2, attempt);
            await delay(delayMs);
            continue;
          }

          if (attempt > 0) {
            t?.log("Max retries reached or non-retryable error", {
              color: "error",
            });
          }

          return res;
        }

        if (attempt > 0) {
          t?.log("Retry succeeded", { color: "success" });
        }

        return res;
      }

      return res!;
    },
  };
}
