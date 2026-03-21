/**
 * Extract paths that have GET methods (eligible for invalidation)
 * Excludes "/" root path to avoid "//*" pattern in autocomplete
 */
type ReadPaths<TSchema> = {
  [K in keyof TSchema & string]: "GET" extends keyof TSchema[K]
    ? K extends "/" | ""
      ? never
      : K
    : never;
}[keyof TSchema & string];

/**
 * Support both exact paths and wildcard patterns in autocomplete
 */
type InvalidatePattern<TSchema> =
  | ReadPaths<TSchema>
  | `${ReadPaths<TSchema>}/*`;

/**
 * Unified invalidate option with wildcard pattern support
 * - `"posts"` - Exact match only
 * - `"posts/*"` - Children only (posts/1, posts/1/comments) - NOT posts itself
 * - `["posts", "posts/*"]` - posts AND all children
 * - `"*"` - Global refetch
 * - `false` - Disable invalidation
 * - Any custom string is also allowed for custom tags
 */
export type InvalidateOption<TSchema = unknown> =
  | "*"
  | false
  | InvalidatePattern<TSchema>
  | (string & {})
  | (InvalidatePattern<TSchema> | (string & {}))[];

export interface InvalidationPluginConfig {
  /**
   * Enable automatic invalidation for mutations.
   * When true, mutations automatically invalidate `[firstSegment, firstSegment/*]`.
   * @default true
   */
  autoInvalidate?: boolean;

  /**
   * Path groups that should use deeper segment matching for invalidation.
   * Useful for grouped endpoints like `admin/posts`, `api/v1/users`.
   *
   * @example
   * ```ts
   * invalidationPlugin({
   *   groups: ["admin", "api/v1"]
   * })
   *
   * // Without groups:
   * // POST admin/posts → invalidates ["admin", "admin/*"]
   *
   * // With groups: ["admin"]:
   * // POST admin/posts → invalidates ["admin/posts", "admin/posts/*"]
   * // POST admin/users → invalidates ["admin/users", "admin/users/*"]
   * // POST admin → invalidates ["admin", "admin/*"]
   * ```
   */
  groups?: string[];
}

export type InvalidationWriteOptions = object;

export interface InvalidationWriteTriggerOptions<TSchema = unknown> {
  /** Unified invalidation configuration with wildcard pattern support */
  invalidate?: InvalidateOption<TSchema>;
}

export type InvalidationReadOptions = object;

export type InvalidationPagesOptions = object;

export type InvalidationReadResult = object;

export type InvalidationWriteResult = object;

export interface InvalidationQueueTriggerOptions<TSchema = unknown> {
  /** Unified invalidation configuration with wildcard pattern support */
  invalidate?: InvalidateOption<TSchema>;
}

export type InvalidationQueueResult = object;

/**
 * Manual invalidation with pattern support
 */
export type InvalidateFn<TSchema> = {
  (tag: "*"): void;
  (pattern: InvalidatePattern<TSchema> | (string & {})): void;
  (patterns: (InvalidatePattern<TSchema> | (string & {}))[]): void;
};

export interface InvalidationInstanceApi {
  /** Manually invalidate cache entries by patterns. Useful for external events like WebSocket messages. */
  invalidate: InvalidateFn<unknown>;
}

export interface InvalidationPluginInternal {
  /** Disable auto-invalidation for this request. Used by optimistic plugin. */
  disableAutoInvalidate: () => void;
}

declare module "@spoosh/core" {
  interface PluginResolvers<TContext> {
    invalidate: InvalidateOption<TContext["schema"]> | undefined;
  }

  interface ApiResolvers<TSchema> {
    invalidate: InvalidateFn<TSchema>;
  }

  interface PluginInternalRegistry {
    "spoosh:invalidation": InvalidationPluginInternal;
  }
}
