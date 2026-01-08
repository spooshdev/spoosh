export type PollingIntervalValue = number | false;

export type PollingIntervalFn<TData = unknown, TError = unknown> = (
  data: TData | undefined,
  error: TError | undefined
) => PollingIntervalValue;

export type PollingInterval<TData = unknown, TError = unknown> =
  | PollingIntervalValue
  | PollingIntervalFn<TData, TError>;

// Non-generic version for plugin type inference
export interface PollingReadOptions {
  pollingInterval?: PollingInterval;
}

export type PollingWriteOptions = object;

export type PollingInfiniteReadOptions = object;

export type PollingReadResult = object;

export type PollingWriteResult = object;
