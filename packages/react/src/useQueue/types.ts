import type {
  SpooshResponse,
  QueueSelectorClient,
  SpooshBody,
  QueueItem,
  QueueStats,
} from "@spoosh/core";

type TriggerAwaitedReturn<T> = T extends (
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ...args: any[]
) => infer R
  ? Awaited<R>
  : never;

type ExtractInputFromResponse<T> = T extends { input: infer I } ? I : never;

type ExtractTriggerQuery<I> = I extends { query: infer Q }
  ? undefined extends Q
    ? { query?: Exclude<Q, undefined> }
    : { query: Q }
  : unknown;

type ExtractTriggerBody<I> = I extends { body: infer B }
  ? undefined extends B
    ? { body?: Exclude<B, undefined> | SpooshBody<Exclude<B, undefined>> }
    : { body: B | SpooshBody<B> }
  : unknown;

type ExtractTriggerParams<I> = I extends { params: infer P }
  ? { params: P }
  : unknown;

export type QueueTriggerInput<T> =
  ExtractInputFromResponse<TriggerAwaitedReturn<T>> extends infer I
    ? [I] extends [never]
      ? object
      : ExtractTriggerQuery<I> & ExtractTriggerBody<I> & ExtractTriggerParams<I>
    : object;

/**
 * Options for useQueue hook.
 */
export interface UseQueueOptions {
  /** Maximum concurrent operations. Defaults to 3. */
  concurrency?: number;

  /** Whether to start processing immediately on trigger. Defaults to true. */
  autoStart?: boolean;
}

/**
 * Result returned by useQueue hook.
 *
 * @template TData - The response data type
 * @template TError - The error type
 * @template TTriggerInput - The trigger input type
 * @template TMeta - Plugin-contributed metadata on queue items
 */
export type UseQueueResult<TData, TError, TTriggerInput, TMeta = object> = {
  /** Add item to queue and execute (if autoStart is true). Returns promise for this item. */
  trigger: (input?: TTriggerInput) => Promise<SpooshResponse<TData, TError>>;

  /** All tasks in queue with their current status */
  tasks: QueueItem<TData, TError, TMeta>[];

  /** Queue statistics (pending/loading/settled/success/failed/total/percentage) */
  stats: QueueStats;

  /** Abort task by ID, or all tasks if no ID */
  abort: (id?: string) => void;

  /** Retry failed task by ID, or all failed if no ID */
  retry: (id?: string) => Promise<void>;

  /** Remove task by ID, or all finished if no ID */
  remove: (id?: string) => void;

  /** Abort all and clear queue */
  clear: () => void;

  /** Start processing queued items. Only needed when autoStart is false. */
  start: () => void;

  /** Whether queue processing has started */
  isStarted: boolean;
};

/**
 * API client type for queue selector.
 * Supports all HTTP methods (GET, POST, PUT, PATCH, DELETE).
 */
export type QueueApiClient<TSchema, TDefaultError> = QueueSelectorClient<
  TSchema,
  TDefaultError
>;
