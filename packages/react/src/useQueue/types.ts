import type {
  SpooshResponse,
  WriteSelectorClient,
  SpooshBody,
} from "@spoosh/core";
import type { QueueItem, QueueProgress } from "@spoosh/core";

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
}

/**
 * Result returned by useQueue hook.
 *
 * @template TData - The response data type
 * @template TError - The error type
 * @template TTriggerInput - The trigger input type
 */
export interface UseQueueResult<TData, TError, TTriggerInput> {
  /** Add item to queue and execute. Returns promise for this item. */
  trigger: (input?: TTriggerInput) => Promise<SpooshResponse<TData, TError>>;

  /** All items in queue with their current status */
  queue: QueueItem<TData, TError>[];

  /** Number of pending items */
  pending: number;

  /** True if any item is currently loading */
  loading: boolean;

  /** Overall queue progress */
  progress: QueueProgress;

  /** Abort item by ID, or all items if no ID */
  abort: (id?: string) => void;

  /** Retry failed item by ID, or all failed if no ID */
  retry: (id?: string) => Promise<void>;

  /** Remove item by ID, or all finished if no ID */
  remove: (id?: string) => void;

  /** Abort all and clear queue */
  clear: () => void;
}

/**
 * API client type for queue selector.
 */
export type QueueApiClient<TSchema, TDefaultError> = WriteSelectorClient<
  TSchema,
  TDefaultError
>;
