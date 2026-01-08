export interface RetryPluginConfig {
  retries?: number | false;
  retryDelay?: number;
}

export interface RetryReadOptions {
  retries?: number | false;
  retryDelay?: number;
}

export interface RetryWriteOptions {
  retries?: number | false;
  retryDelay?: number;
}

export type RetryInfiniteReadOptions = RetryReadOptions;

export type RetryReadResult = object;

export type RetryWriteResult = object;
