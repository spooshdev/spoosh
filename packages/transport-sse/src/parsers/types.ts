/**
 * Built-in parse strategies for SSE event data.
 *
 * - "auto": Intelligently detects and parses data type (JSON → number → boolean → string)
 * - "json-done": Parses JSON, returns undefined for [DONE] signal (case-insensitive). Ideal for AI streaming APIs.
 * - "json": Strict JSON parsing
 * - "text": Returns raw string
 * - "number": Parses as number
 * - "boolean": Parses as boolean
 */
export type ParseStrategy =
  | "auto"
  | "json-done"
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
