export type DedupeMode = "in-flight" | false;

export type DeduplicationConfig = {
  /**
   * Deduplication mode for read operations.
   * @default "in-flight"
   */
  read?: DedupeMode;

  /**
   * Deduplication mode for write operations.
   * @default false
   */
  write?: DedupeMode;
};

export type DeduplicationReadOptions = {
  /**
   * Override deduplication for this request.
   * - `"in-flight"`: Reuse in-flight request promise if one exists
   * - `false`: Always make a new request
   */
  dedupe?: DedupeMode;
};

export type DeduplicationWriteOptions = {
  /**
   * Override deduplication for this request.
   * - `"in-flight"`: Reuse in-flight request promise if one exists
   * - `false`: Always make a new request
   */
  dedupe?: DedupeMode;
};

export type DeduplicationInfiniteReadOptions = {
  /**
   * Override deduplication for this request.
   * - `"in-flight"`: Reuse in-flight request promise if one exists
   * - `false`: Always make a new request
   */
  dedupe?: DedupeMode;
};

export type DeduplicationReadResult = object;

export type DeduplicationWriteResult = object;
