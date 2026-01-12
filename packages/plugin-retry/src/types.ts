export interface RetryPluginConfig {
  /** Number of retry attempts. Set to `false` to disable retries. Defaults to 3. */
  retries?: number | false;

  /** Delay between retries in milliseconds. Defaults to 1000. */
  retryDelay?: number;
}

export interface RetryReadOptions {
  /** Number of retry attempts. Set to `false` to disable retries. Overrides plugin default. */
  retries?: number | false;

  /** Delay between retries in milliseconds. Overrides plugin default. */
  retryDelay?: number;
}

export interface RetryWriteOptions {
  /** Number of retry attempts. Set to `false` to disable retries. Overrides plugin default. */
  retries?: number | false;

  /** Delay between retries in milliseconds. Overrides plugin default. */
  retryDelay?: number;
}

export type RetryInfiniteReadOptions = RetryReadOptions;

export type RetryReadResult = object;

export type RetryWriteResult = object;
