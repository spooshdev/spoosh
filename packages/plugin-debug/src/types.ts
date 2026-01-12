export interface DebugLogEntry {
  phase: string;
  operationType: string;
  method: string;
  path: string;
  queryKey: string;
  requestTimestamp: number;
  tags: string[];
  requestOptions: unknown;
  state: {
    loading: boolean;
    fetching: boolean;
    data: unknown;
    error: unknown;
    timestamp: number;
  };
  response?: {
    data: unknown;
    error: unknown;
    status?: number;
  };
  cacheEntries?: Array<{ key: string; data: unknown }>;
}

export interface DebugPluginConfig {
  /** Enable logging. Defaults to `true`. */
  enabled?: boolean;

  /** Log cache entries on each phase. Defaults to `false`. */
  logCache?: boolean;

  /** Custom logger function. Receives structured log entry. */
  logger?: (entry: DebugLogEntry) => void;
}

export type DebugReadOptions = object;

export type DebugWriteOptions = object;

export type DebugInfiniteReadOptions = object;

export type DebugReadResult = object;

export type DebugWriteResult = object;
