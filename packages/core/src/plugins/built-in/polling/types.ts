/** Value for polling interval: milliseconds or `false` to disable. */
export type PollingIntervalValue = number | false;

/**
 * Function to dynamically determine polling interval based on current state.
 * @param data - Current data from the query
 * @param error - Current error from the query
 * @returns Polling interval in milliseconds, or `false` to stop polling
 */
export type PollingIntervalFn<TData = unknown, TError = unknown> = (
  data: TData | undefined,
  error: TError | undefined
) => PollingIntervalValue;

/**
 * Polling interval configuration.
 * Can be a static value in milliseconds, `false` to disable, or a function for dynamic intervals.
 */
export type PollingInterval<TData = unknown, TError = unknown> =
  | PollingIntervalValue
  | PollingIntervalFn<TData, TError>;

/**
 * Options available in useRead when polling plugin is enabled.
 */
export interface PollingReadOptions {
  /** Polling interval in milliseconds, `false` to disable, or a function for dynamic intervals. */
  pollingInterval?: PollingInterval;
}

export type PollingWriteOptions = object;

export type PollingInfiniteReadOptions = object;

export type PollingReadResult = object;

export type PollingWriteResult = object;
