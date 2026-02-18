export interface InitialDataReadOptions<TData = unknown> {
  /** Data to use immediately on first mount (before fetch completes) */
  initialData?: TData;

  /** Refetch fresh data after showing initial data. Default: true */
  refetchOnInitialData?: boolean;
}

export type InitialDataPagesOptions<TData = unknown> =
  InitialDataReadOptions<TData>;

export interface InitialDataReadResult {
  /** True if currently showing initial data (not yet fetched from server) */
  isInitialData: boolean;
}

export type InitialDataWriteOptions = object;

export type InitialDataWriteResult = object;

declare module "@spoosh/core" {
  interface PluginResolvers<TContext> {
    initialData: TContext["data"] | undefined;
  }
}
