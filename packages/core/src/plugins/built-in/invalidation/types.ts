import type { EnlaceResponse } from "../../../types/response.types";
import type { SchemaMethod } from "../../../types/common.types";
import type { QuerySchemaHelper } from "../../schema-helper";

/**
 * Auto-invalidation behavior after mutations.
 * - `"all"`: Invalidate all tags derived from the endpoint path
 * - `"self"`: Only invalidate the exact endpoint tag
 * - `"none"`: Disable auto-invalidation
 */
export type AutoInvalidate = "all" | "self" | "none";

type InvalidateCallbackFn<TSchema> = (
  api: QuerySchemaHelper<TSchema>
) => (
  | ((...args: unknown[]) => Promise<EnlaceResponse<unknown, unknown>>)
  | string
)[];

/**
 * Invalidation target configuration.
 * Can be an array of tag strings or a callback function using the API proxy.
 */
export type InvalidateOption<TSchema> =
  | string[]
  | InvalidateCallbackFn<TSchema>;

type InvalidateOptionForMethod<TRootSchema> = {
  autoInvalidate?: AutoInvalidate;
  invalidate?: InvalidateOption<TRootSchema>;
};

export type WithInvalidate<
  TMethod extends SchemaMethod,
  TRootSchema,
> = TMethod extends "$get" ? object : InvalidateOptionForMethod<TRootSchema>;

/**
 * Configuration for the invalidation plugin.
 */
export interface InvalidationPluginConfig {
  /** Default auto-invalidation behavior. Defaults to `"all"`. */
  autoInvalidate?: AutoInvalidate;
}

/**
 * Options available in useWrite when invalidation plugin is enabled.
 */
export interface InvalidationWriteOptions<TSchema = unknown> {
  /** Auto-invalidation behavior. Overrides plugin default. */
  autoInvalidate?: AutoInvalidate;

  /** Specific tags or endpoints to invalidate after mutation. */
  invalidate?: InvalidateOption<TSchema>;
}

export type InvalidationReadOptions = object;

export type InvalidationInfiniteReadOptions = object;

export type InvalidationReadResult = object;

export type InvalidationWriteResult = object;
