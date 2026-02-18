export interface ThrottleReadOptions {
  /** Throttle requests to max 1 per X milliseconds. Extras return cached data. */
  throttle?: number;
}

export type ThrottlePagesOptions = ThrottleReadOptions;

export type ThrottleWriteOptions = object;

export type ThrottleReadResult = object;

export type ThrottleWriteResult = object;
