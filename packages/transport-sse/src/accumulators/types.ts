/**
 * Built-in accumulate strategies for combining SSE events.
 */
export type AccumulateStrategy =
  | "replace"
  | "concat"
  | "merge";

/**
 * Custom accumulator function.
 */
export type AccumulateFunction = (prev: unknown, current: unknown) => unknown;

/**
 * Accumulate configuration: global strategy, function, or per-event mapping.
 */
export type AccumulateConfig =
  | AccumulateStrategy
  | AccumulateFunction
  | Record<string, AccumulateStrategy | AccumulateFunction>;
