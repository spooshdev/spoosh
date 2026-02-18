export interface RefetchPluginConfig {
  /** Automatically refetch when window regains focus. Defaults to `false`. */
  refetchOnFocus?: boolean;

  /** Automatically refetch when network reconnects. Defaults to `false`. */
  refetchOnReconnect?: boolean;
}

export interface RefetchReadOptions {
  /** Automatically refetch when window regains focus. Overrides plugin default. */
  refetchOnFocus?: boolean;

  /** Automatically refetch when network reconnects. Overrides plugin default. */
  refetchOnReconnect?: boolean;
}

export type RefetchWriteOptions = object;

export type RefetchPagesOptions = object;

export type RefetchReadResult = object;

export type RefetchWriteResult = object;
