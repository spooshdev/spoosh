type ParseStrategy = "auto" | "json" | "text" | "json-done";

type AccumulateStrategy = "replace" | "merge";

type AccumulatorFn<T = unknown> = (previous: T | undefined, current: T) => T;

type AccumulateFieldConfig<T> =
  T extends Record<string, unknown>
    ? { [K in keyof T]?: AccumulateStrategy }
    : Record<string, AccumulateStrategy>;

export interface UseSSEOptionsBase {
  /** Whether the subscription is enabled. Defaults to true. */
  enabled?: boolean;

  /** Max retry attempts on connection failure */
  maxRetries?: number;

  /** Delay between retries in ms */
  retryDelay?: number;
}

type ParseFn<TEvents extends Record<string, unknown> = Record<string, unknown>> =
  (data: string) => Partial<TEvents>;

export type TypedParseConfig<
  TEventKeys extends string,
  TEvents extends Record<string, unknown>,
> =
  | ParseStrategy
  | ParseFn<TEvents>
  | Partial<Record<TEventKeys, ParseStrategy | ((data: string) => unknown)>>;

export type TypedAccumulateConfig<TEvents extends Record<string, unknown>> =
  | AccumulateStrategy
  | {
      [K in keyof TEvents]?:
        | AccumulateStrategy
        | AccumulatorFn<TEvents[K]>
        | AccumulateFieldConfig<TEvents[K]>;
    };

export interface TypedUseSSEOptions<
  TEventKeys extends string,
  TEvents extends Record<string, unknown>,
  TSelectedEvents extends readonly TEventKeys[] = readonly TEventKeys[],
> extends UseSSEOptionsBase {
  /** Event types to listen for. If not provided, listens to all events. */
  events?: TSelectedEvents;

  /** Parse strategy for SSE event data. Defaults to 'auto'. */
  parse?: TypedParseConfig<TEventKeys, TEvents>;

  /** Accumulate strategy for combining events. Defaults to 'replace'. */
  accumulate?: TypedAccumulateConfig<TEvents>;
}

export interface UseSSEOptions extends UseSSEOptionsBase {
  /** Event types to listen for. If not provided, listens to all events. */
  events?: string[];

  /** Parse strategy for SSE event data. Defaults to 'auto'. */
  parse?: ParseStrategy | Record<string, ParseStrategy>;

  /** Accumulate strategy for combining events. Defaults to 'replace'. */
  accumulate?:
    | AccumulateStrategy
    | Record<string, AccumulateStrategy | AccumulatorFn>;
}

export interface UseSSEResult<TEvents, TError> {
  /** Accumulated data keyed by event type */
  data: Partial<TEvents> | undefined;

  /** Connection or parse error */
  error: TError | undefined;

  /** Whether currently connected to the SSE endpoint */
  isConnected: boolean;

  /** Whether connection is in progress */
  loading: boolean;

  /** Plugin metadata */
  meta: Record<string, never>;

  /**
   * Manually trigger connection with optional body/query overrides
   * @param options - Optional body and query parameters
   */
  trigger: (options?: { body?: unknown; query?: unknown }) => Promise<void>;

  /** Disconnect from the SSE endpoint */
  disconnect: () => void;

  /** Reset accumulated data */
  reset: () => void;
}
