/**
 * Built-in accumulate strategies for combining SSE events.
 * - "replace": new value replaces old (default)
 * - "merge": smart merge (concat strings, spread objects)
 */
export type AccumulateStrategy = "replace" | "merge";

/**
 * Custom accumulator function.
 */
export type AccumulateFunction = (prev: unknown, current: unknown) => unknown;

/**
 * Field-specific accumulate config.
 * Specifies which fields should be merged instead of replaced.
 */
export type AccumulateFieldConfig = Record<string, AccumulateStrategy>;

/**
 * Accumulate configuration: global strategy, field config, function, or per-event mapping.
 */
export type AccumulateConfig =
  | AccumulateStrategy
  | AccumulateFieldConfig
  | AccumulateFunction
  | Record<
      string,
      AccumulateStrategy | AccumulateFieldConfig | AccumulateFunction
    >;
