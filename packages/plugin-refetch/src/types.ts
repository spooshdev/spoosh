export interface RefetchConfig {
  /** Automatically refetch when window regains focus. */
  onFocus?: boolean;

  /** Automatically refetch when network reconnects. */
  onReconnect?: boolean;
}

export interface RefetchPluginConfig {
  /** Automatically refetch when window regains focus. Defaults to `false`. */
  refetchOnFocus?: boolean;

  /** Automatically refetch when network reconnects. Defaults to `false`. */
  refetchOnReconnect?: boolean;
}

export interface RefetchReadOptions {
  /** Refetch configuration. Overrides plugin defaults. */
  refetch?: RefetchConfig;
}

export type RefetchWriteOptions = object;

export type RefetchPagesOptions = object;

export type RefetchReadResult = object;

export type RefetchWriteResult = object;
