import type { SpooshResponse } from "../types/response.types";

/**
 * Status of an item in the queue.
 */
export type QueueItemStatus =
  | "pending"
  | "loading"
  | "success"
  | "error"
  | "aborted";

/**
 * Represents a single item in the queue.
 */
export interface QueueItem<TData = unknown, TError = unknown> {
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
}

/**
 * Progress information for the queue.
 */
export interface QueueProgress {
  /** Number of completed items (success, error, or aborted) */
  completed: number;

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
export interface QueueController<TData = unknown, TError = unknown> {
  /** Add item to queue and execute. Returns promise that resolves when item completes. */
  trigger: (input: QueueTriggerInput) => Promise<SpooshResponse<TData, TError>>;

  /** Get current queue state */
  getQueue: () => QueueItem<TData, TError>[];

  /** Get current progress */
  getProgress: () => QueueProgress;

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

  /** Operation type for plugin middleware (derived from HTTP method) */
  operationType: "read" | "write";
}
