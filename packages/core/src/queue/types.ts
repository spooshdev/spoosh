import type { SpooshResponse } from "../types/response.types";

/**
 * Status of an item in the queue.
 */
export type QueueItemStatus =
  | "pending"
  | "running"
  | "success"
  | "error"
  | "aborted";

/**
 * Represents a single item in the queue.
 */
export interface QueueItem<
  TData = unknown,
  TError = unknown,
  TMeta = Record<string, unknown>,
> {
  /** Unique identifier for this queue item */
  id: string;

  /** Current status of the item */
  status: QueueItemStatus;

  /** Response data on success */
  data?: TData;

  /** Error on failure */
  error?: TError;

  /** Original trigger input */
  input?: {
    body?: unknown;
    query?: unknown;
    params?: Record<string, string | number>;
  };

  /** Plugin-contributed metadata (e.g., progress, transformedData) */
  meta?: TMeta;
}

/**
 * Statistics information for the queue.
 */
export interface QueueStats {
  /** Number of pending items waiting to run */
  pending: number;

  /** Number of currently running items */
  running: number;

  /** Number of settled items (success, error, or aborted) */
  settled: number;

  /** Number of successful items */
  success: number;

  /** Number of failed items (error or aborted) */
  failed: number;

  /** Total number of items in queue */
  total: number;

  /** Completion percentage (0-100) */
  percentage: number;
}

/**
 * Input type for queue trigger.
 */
export interface QueueTriggerInput {
  body?: unknown;
  query?: unknown;
  params?: Record<string, string | number>;
}

/**
 * Queue controller instance.
 * Framework-agnostic - can be used directly in Angular, Vue, etc.
 */
export interface QueueController<
  TData = unknown,
  TError = unknown,
  TMeta = Record<string, unknown>,
> {
  /** Add item to queue and execute (if autoStart is true). Returns promise that resolves when item completes. */
  trigger: (input: QueueTriggerInput) => Promise<SpooshResponse<TData, TError>>;

  /** Get current queue state */
  getQueue: () => QueueItem<TData, TError, TMeta>[];

  /** Get queue statistics */
  getStats: () => QueueStats;

  /** Subscribe to queue state changes */
  subscribe: (callback: () => void) => () => void;

  /** Abort item by ID, or all items if no ID provided */
  abort: (id?: string) => void;

  /** Retry failed/aborted item by ID, or all failed items if no ID provided */
  retry: (id?: string) => Promise<void>;

  /** Remove item by ID, or all completed/failed/aborted items if no ID provided */
  remove: (id?: string) => void;

  /** Abort all and clear entire queue */
  clear: () => void;

  /** Update the concurrency limit */
  setConcurrency: (concurrency: number) => void;

  /** Start processing queued items. Only needed when autoStart is false. */
  start: () => void;

  /** Check if queue processing has started */
  isStarted: () => boolean;
}

/**
 * Configuration for creating a queue controller.
 */
export interface QueueControllerConfig {
  /** API path */
  path: string;

  /** HTTP method */
  method: string;

  /** Maximum concurrent operations. Defaults to 3. */
  concurrency?: number;

  /** Operation type for plugin middleware */
  operationType: "read" | "write" | "queue";

  /** Hook-level plugin options (e.g., progress, retries) */
  hookOptions?: Record<string, unknown>;

  /** Whether to start processing immediately on trigger. Defaults to true. */
  autoStart?: boolean;
}
