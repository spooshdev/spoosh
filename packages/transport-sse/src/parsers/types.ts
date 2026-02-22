/**
 * Built-in parse strategies for SSE event data.
 */
export type ParseStrategy =
  | "auto"
  | "json"
  | "text"
  | "number"
  | "boolean";

/**
 * Custom parser function.
 */
export type ParseFunction = (data: string) => unknown;

/**
 * Parse configuration: global strategy, function, or per-event mapping.
 */
export type ParseConfig =
  | ParseStrategy
  | ParseFunction
  | Record<string, ParseStrategy | ParseFunction>;
