import type { OptimisticCallbackFn } from "./builder/types.js";

export type {
  CacheBuilder,
  CacheHelper,
  OptimisticCallbackFn,
} from "./builder/types.js";

/**
 * Internal optimistic target data.
 * @internal
 */
export type OptimisticTarget = {
  path: string;
  filter?: (options: unknown) => boolean;
  immediateUpdater?: (data: unknown) => unknown;
  confirmedUpdater?: (data: unknown, response: unknown) => unknown;
  rollbackOnError: boolean;
  onError?: (error: unknown) => void;
};

export type OptimisticPluginConfig = object;

export type OptimisticWriteOptions = object;

export interface OptimisticWriteTriggerOptions<
  TSchema = unknown,
  TResponse = unknown,
  TError = unknown,
> {
  /**
   * Configure optimistic updates for this mutation.
   *
   * @example
   * ```ts
   * // Optimistic update
   * trigger({
   *   optimistic: (cache) => cache("posts")
   *     .set(posts => posts.filter(p => p.id !== deletedId)),
   * });
   * ```
   *
   * @example
   * ```ts
   * // With filter and confirmed update
   * trigger({
   *   optimistic: (cache) => cache("posts/:id")
   *     .filter(e => e.params.id === "1")
   *     .set(post => ({ ...post, pending: true }))
   *     .confirmed()
   *     .set((post, response) => response),
   * });
   * ```
   */
  optimistic?: OptimisticCallbackFn<TSchema, TResponse, TError>;
}

export type OptimisticReadOptions = object;

export type OptimisticPagesOptions = object;

export interface OptimisticReadResult {
  isOptimistic: boolean;
}

export type OptimisticWriteResult = object;

declare module "@spoosh/core" {
  interface PluginResolvers<TContext> {
    optimistic:
      | OptimisticCallbackFn<
          TContext["schema"],
          TContext["data"],
          TContext["error"]
        >
      | undefined;
  }
}
