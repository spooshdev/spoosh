import type {
  AccumulateStrategy,
  AccumulateFunction,
  AccumulateConfig,
  AccumulateFieldConfig,
} from "./types";

/**
 * Replace strategy: use current value (default behavior).
 */
export function replaceAccumulate(prev: unknown, current: unknown): unknown {
  if (current === undefined) return prev;

  return current;
}

/**
 * Merge strategy: smart merge based on type.
 * - Arrays: concatenate
 * - Strings: concatenate
 * - Objects: shallow spread
 * - Numbers/booleans/null: replace (atomic values)
 */
export function mergeAccumulate(prev: unknown, current: unknown): unknown {
  if (current === undefined) return prev;

  if (Array.isArray(current)) {
    if (Array.isArray(prev)) {
      return [...prev, ...current];
    }

    return current;
  }

  if (typeof prev === "string" && typeof current === "string") {
    return prev + current;
  }

  if (
    prev !== null &&
    prev !== undefined &&
    typeof prev === "object" &&
    current !== null &&
    typeof current === "object"
  ) {
    return { ...prev, ...current };
  }

  return current;
}

/**
 * Check if config is a field-specific config (object with strategy values).
 */
function isFieldConfig(config: unknown): config is AccumulateFieldConfig {
  if (typeof config !== "object" || config === null || Array.isArray(config)) {
    return false;
  }

  const values = Object.values(config);

  if (values.length === 0) return false;

  return values.every((v) => v === "replace" || v === "merge");
}

/**
 * Apply field-specific accumulation.
 * Merges specified fields, replaces others.
 */
function applyFieldConfig(
  prev: unknown,
  current: unknown,
  fieldConfig: AccumulateFieldConfig
): unknown {
  if (current === undefined) return prev;

  if (
    typeof current !== "object" ||
    current === null ||
    Array.isArray(current)
  ) {
    return current;
  }

  const prevObj =
    typeof prev === "object" && prev !== null && !Array.isArray(prev)
      ? (prev as Record<string, unknown>)
      : {};

  const currObj = current as Record<string, unknown>;
  const result: Record<string, unknown> = { ...prevObj, ...currObj };

  for (const [field, strategy] of Object.entries(fieldConfig)) {
    if (strategy === "merge" && field in currObj) {
      result[field] = mergeAccumulate(prevObj[field], currObj[field]);
    }
  }

  return result;
}

/**
 * Get accumulator function for a given strategy.
 */
export function getAccumulator(
  strategy: AccumulateStrategy
): AccumulateFunction {
  switch (strategy) {
    case "replace":
      return replaceAccumulate;
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

  if (typeof config === "string") {
    return getAccumulator(config);
  }

  if (typeof config === "object" && !Array.isArray(config)) {
    const eventConfig = config[eventType];

    if (eventConfig === undefined) {
      return replaceAccumulate;
    }

    if (typeof eventConfig === "function") {
      return eventConfig;
    }

    if (typeof eventConfig === "string") {
      return getAccumulator(eventConfig);
    }

    if (isFieldConfig(eventConfig)) {
      return (prev, curr) => applyFieldConfig(prev, curr, eventConfig);
    }

    return replaceAccumulate;
  }

  return replaceAccumulate;
}
