import type { SpooshResponse, QuerySchemaHelper } from "@spoosh/core";

export type AutoInvalidate = "all" | "self" | "none";

type InvalidateCallbackFn<TSchema> = (
  api: QuerySchemaHelper<TSchema>
) => (
  | ((...args: never[]) => Promise<SpooshResponse<unknown, unknown>>)
  | string
)[];

export type InvalidateOption<TSchema> =
  | string[]
  | InvalidateCallbackFn<TSchema>;

export interface InvalidationPluginConfig {
  /** Default auto-invalidation behavior. Defaults to `"all"`. */
  autoInvalidate?: AutoInvalidate;
}

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

export interface InvalidationPluginExports {
  /** Set the default autoInvalidate behavior for this mutation */
  setAutoInvalidateDefault: (value: AutoInvalidate) => void;
}

declare module "@spoosh/core" {
  interface PluginExportsRegistry {
    "spoosh:invalidation": InvalidationPluginExports;
  }

  interface PluginResolvers<TContext> {
    invalidate: InvalidateOption<TContext["schema"]> | undefined;
  }
}
