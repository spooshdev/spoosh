export type PollingIntervalValue = number | false;

export type PollingIntervalFn<TData = unknown, TError = unknown> = (
  data: TData | undefined,
  error: TError | undefined
) => PollingIntervalValue;

export type PollingInterval<TData = unknown, TError = unknown> =
  | PollingIntervalValue
  | PollingIntervalFn<TData, TError>;

export interface PollingReadOptions {
  /** Polling interval in milliseconds, `false` to disable, or a function for dynamic intervals. */
  pollingInterval?: PollingInterval;
}

export type PollingWriteOptions = object;

export type PollingInfiniteReadOptions = object;

export type PollingReadResult = object;

export type PollingWriteResult = object;

declare module "@spoosh/core" {
  interface PluginResolvers<TContext> {
    pollingInterval:
      | PollingInterval<TContext["data"], TContext["error"]>
      | undefined;
  }
}
