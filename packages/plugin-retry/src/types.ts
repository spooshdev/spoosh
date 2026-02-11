/**
 * Context passed to the shouldRetry callback.
 */
export interface ShouldRetryContext {
  /** HTTP status code from the response, if available */
  status?: number;

  /** The error that occurred, if any */
  error: unknown;

  /** Current attempt number (0-indexed) */
  attempt: number;

  /** Maximum number of retries configured */
  maxRetries: number;
}

/**
 * Callback to determine if a request should be retried.
 * Network errors are always retried regardless of this callback's return value.
 *
 * @returns `true` to retry, `false` to stop retrying
 */
export type ShouldRetryCallback = (context: ShouldRetryContext) => boolean;

/** Status codes that are retried by default: 408, 429, 500, 502, 503, 504 */
export const DEFAULT_RETRY_STATUS_CODES = [408, 429, 500, 502, 503, 504] as const;

export interface RetryPluginConfig {
  /** Number of retry attempts. Set to `false` to disable retries. Defaults to 3. */
  retries?: number | false;

  /** Delay between retries in milliseconds. Defaults to 1000. */
  retryDelay?: number;

  /**
   * Custom callback to determine if a request should be retried.
   * Network errors are always retried regardless of this callback.
   * Defaults to retrying on status codes: 408, 429, 500, 502, 503, 504.
   */
  shouldRetry?: ShouldRetryCallback;
}

export interface RetryReadOptions {
  /** Number of retry attempts. Set to `false` to disable retries. Overrides plugin default. */
  retries?: number | false;

  /** Delay between retries in milliseconds. Overrides plugin default. */
  retryDelay?: number;

  /**
   * Custom callback to determine if a request should be retried.
   * Network errors are always retried regardless of this callback.
   * Overrides plugin default.
   */
  shouldRetry?: ShouldRetryCallback;
}

export interface RetryWriteOptions {
  /** Number of retry attempts. Set to `false` to disable retries. Overrides plugin default. */
  retries?: number | false;

  /** Delay between retries in milliseconds. Overrides plugin default. */
  retryDelay?: number;

  /**
   * Custom callback to determine if a request should be retried.
   * Network errors are always retried regardless of this callback.
   * Overrides plugin default.
   */
  shouldRetry?: ShouldRetryCallback;
}

export type RetryInfiniteReadOptions = RetryReadOptions;

export type RetryReadResult = object;

export type RetryWriteResult = object;
