export type InvalidationMode = "all" | "self" | "none";

/**
 * Extract paths that have GET methods (eligible for invalidation)
 */
type ReadPaths<TSchema> = {
  [K in keyof TSchema & string]: "GET" extends keyof TSchema[K] ? K : never;
}[keyof TSchema & string];

/**
 * Unified invalidate option
 * - String: mode only ('all' | 'self' | 'none')
 * - Array: tags only OR [mode keyword mixed with tags]
 *   - If array contains 'all' or 'self' at ANY position, it's treated as mode + tags
 *   - Otherwise, it's tags only with mode defaulting to 'none'
 *   - 'none' keyword should NOT be used in arrays (use string 'none' instead)
 */
export type InvalidateOption<TSchema = unknown> =
  | InvalidationMode
  | "*"
  | ReadPaths<TSchema>
  | (ReadPaths<TSchema> | "all" | "self" | (string & {}))[];

export interface InvalidationPluginConfig {
  /**
   * Default invalidation mode when invalidate option is not specified
   * @default "all"
   */
  defaultMode?: InvalidationMode;
}

export type InvalidationWriteOptions = object;

export interface InvalidationWriteTriggerOptions<TSchema = unknown> {
  /** Unified invalidation configuration */
  invalidate?: InvalidateOption<TSchema>;
}

export type InvalidationReadOptions = object;

export type InvalidationInfiniteReadOptions = object;

export type InvalidationReadResult = object;

export type InvalidationWriteResult = object;

export interface InvalidationQueueTriggerOptions<TSchema = unknown> {
  /** Unified invalidation configuration */
  invalidate?: InvalidateOption<TSchema>;
}

export type InvalidationQueueResult = object;

/**
 * Manual invalidation - tags only, or "*" for global refetch
 */
export type InvalidateFn<TSchema> = {
  (tag: "*"): void;
  (tag: ReadPaths<TSchema> | (string & {})): void;
  (tags: (ReadPaths<TSchema> | (string & {}))[]): void;
};

export interface InvalidationInstanceApi {
  /** Manually invalidate cache entries by tags. Useful for external events like WebSocket messages. */
  invalidate: InvalidateFn<unknown>;
}

export interface InvalidationPluginExports {
  /** Set the default invalidation mode for this mutation */
  setDefaultMode: (value: InvalidationMode) => void;
}

declare module "@spoosh/core" {
  interface PluginExportsRegistry {
    "spoosh:invalidation": InvalidationPluginExports;
  }

  interface PluginResolvers<TContext> {
    invalidate: InvalidateOption<TContext["schema"]> | undefined;
  }

  interface InstanceApiResolvers<TSchema> {
    invalidate: InvalidateFn<TSchema>;
  }
}
