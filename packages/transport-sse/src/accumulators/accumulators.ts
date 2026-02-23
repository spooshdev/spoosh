import type {
  AccumulateStrategy,
  AccumulateFunction,
  AccumulateConfig,
} from "./types";

/**
 * Replace strategy: use current value (default behavior).
 * Skips if current is undefined.
 */
export function replaceAccumulate(prev: unknown, current: unknown): unknown {
  if (current === undefined) return prev;

  return current;
}

/**
 * Concat strategy: concatenate as strings.
 * Skips if current is undefined.
 */
export function concatAccumulate(prev: unknown, current: unknown): string {
  if (current === undefined) return prev === undefined ? "" : String(prev);

  const prevStr = prev === undefined ? "" : String(prev);
  const currentStr = String(current);

  return prevStr + currentStr;
}

/**
 * Merge strategy: shallow merge objects.
 * Skips if current is undefined.
 */
export function mergeAccumulate(prev: unknown, current: unknown): unknown {
  if (current === undefined) return prev;

  if (
    prev !== null &&
    prev !== undefined &&
    typeof prev === "object" &&
    !Array.isArray(prev) &&
    current !== null &&
    typeof current === "object" &&
    !Array.isArray(current)
  ) {
    return { ...prev, ...current };
  }

  if (
    current !== null &&
    typeof current === "object" &&
    !Array.isArray(current)
  ) {
    return current;
  }

  return current;
}

/**
 * Get accumulator function for a given strategy.
 */
export function getAccumulator(strategy: AccumulateStrategy): AccumulateFunction {
  switch (strategy) {
    case "replace":
      return replaceAccumulate;
    case "concat":
      return concatAccumulate;
    case "merge":
      return mergeAccumulate;
    default:
      return replaceAccumulate;
  }
}

/**
 * Resolve accumulate config to an accumulator function for a specific event.
 */
export function resolveAccumulator(
  config: AccumulateConfig | undefined,
  eventType: string
): AccumulateFunction {
  if (!config) {
    return replaceAccumulate;
  }

  if (typeof config === "function") {
    return config;
  }

  if (typeof config === "object" && !Array.isArray(config)) {
    const eventConfig = config[eventType];

    if (typeof eventConfig === "function") {
      return eventConfig;
    }

    if (typeof eventConfig === "string") {
      return getAccumulator(eventConfig);
    }

    return replaceAccumulate;
  }

  return getAccumulator(config as AccumulateStrategy);
}
