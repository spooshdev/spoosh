export interface ProgressInfo {
  loaded: number;

  total: number;
}

export interface ProgressOptions {
  /** Response header name to read total size from when Content-Length is unavailable. */
  totalHeader?: string;
}

export interface ProgressReadOptions {
  /** Enable progress tracking. Forces XHR transport. */
  progress?: boolean | ProgressOptions;
}

export interface ProgressWriteOptions {
  /** Enable progress tracking. Forces XHR transport. */
  progress?: boolean | ProgressOptions;
}

export type ProgressInfiniteReadOptions = ProgressReadOptions;

export interface ProgressReadResult {
  progress?: ProgressInfo;
}

export interface ProgressWriteResult {
  progress?: ProgressInfo;
}
