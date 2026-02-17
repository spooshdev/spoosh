import type { ResolverContext } from "@spoosh/core";

export type PollingIntervalValue = number | false;

export interface PollingIntervalContext<TData = unknown, TError = unknown> {
  data: TData | undefined;
  error: TError | undefined;
}

export type PollingIntervalFn<TData = unknown, TError = unknown> = (
  context: PollingIntervalContext<TData, TError>
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
  interface PluginResolvers<TContext extends ResolverContext> {
    pollingInterval:
      | PollingIntervalValue
      | ((context: {
          data: TContext["data"] | undefined;
          error: TContext["error"] | undefined;
        }) => PollingIntervalValue)
      | undefined;
  }
}
