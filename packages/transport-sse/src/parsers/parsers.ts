import type { ParseStrategy, ParseFunction, ParseConfig } from "./types";

/**
 * JSON-Done parser: parses JSON, returns undefined for [DONE] signal.
 * Ideal for AI streaming APIs (OpenAI, etc.).
 */
export function jsonDoneParse(data: string): unknown {
  if (data.trim().toLowerCase() === "[done]") {
    return undefined;
  }

  return JSON.parse(data);
}

/**
 * Auto parser: intelligently detects and parses data type.
 * Order: JSON → number → boolean → string
 */
export function autoParse(data: string): unknown {
  const trimmed = data.trim();

  if (trimmed === "") return data;

  try {
    return JSON.parse(trimmed);
  } catch {
    /* Ignore */
  }

  if (/^-?\d+(\.\d+)?$/.test(trimmed)) {
    return Number(trimmed);
  }

  if (trimmed === "true") return true;
  if (trimmed === "false") return false;

  return data;
}

/**
 * JSON parser with error handling.
 */
export function jsonParse(data: string): unknown {
  try {
    return JSON.parse(data);
  } catch (error) {
    throw new Error(
      `Failed to parse JSON: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Number parser.
 */
export function numberParse(data: string): number {
  const num = parseFloat(data.trim());

  if (isNaN(num)) {
    throw new Error(`Failed to parse number: "${data}" is not a valid number`);
  }

  return num;
}

/**
 * Boolean parser.
 */
export function booleanParse(data: string): boolean {
  const trimmed = data.trim().toLowerCase();

  if (trimmed === "true") return true;
  if (trimmed === "false") return false;

  throw new Error(
    `Failed to parse boolean: "${data}" is not 'true' or 'false'`
  );
}

/**
 * Text parser (identity function).
 */
export function textParse(data: string): string {
  return data;
}

/**
 * Get parser function for a given strategy.
 */
export function getParser(strategy: ParseStrategy): ParseFunction {
  switch (strategy) {
    case "auto":
      return autoParse;
    case "json-done":
      return jsonDoneParse;
    case "json":
      return jsonParse;
    case "number":
      return numberParse;
    case "boolean":
      return booleanParse;
    case "text":
      return textParse;
    default:
      return autoParse;
  }
}

/**
 * Resolve parse config to a parser function for a specific event.
 */
export function resolveParser(
  config: ParseConfig | undefined,
  eventType: string
): ParseFunction {
  if (!config) {
    return autoParse;
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
      return getParser(eventConfig);
    }

    return autoParse;
  }

  return getParser(config as ParseStrategy);
}
