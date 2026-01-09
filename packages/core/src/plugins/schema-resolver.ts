import type { OptimisticCallbackFn } from "./built-in/optimistic/types";
import type { InvalidateOption } from "./built-in/invalidation/types";
import type { PollingInterval } from "./built-in/polling/types";
import type { DataAwareCallback, DataAwareTransform } from "./types";

/**
 * Resolves schema-aware types in plugin options.
 *
 * This type maps over plugin options and replaces schema-aware types
 * with their properly typed versions using the provided TSchema.
 *
 * Built-in plugins that require schema resolution:
 * - optimistic: OptimisticCallbackFn<TSchema>
 * - invalidate: InvalidateOption<TSchema>
 *
 * For 3rd party plugins that need schema-aware options, they should
 * provide their own type utilities or extend this pattern.
 */
export type ResolveSchemaTypes<TOptions, TSchema> = {
  [K in keyof TOptions]: K extends "optimistic"
    ? OptimisticCallbackFn<TSchema> | undefined
    : K extends "invalidate"
      ? InvalidateOption<TSchema> | undefined
      : TOptions[K];
};

/**
 * Resolves data-aware types in plugin options.
 *
 * This type maps over plugin options and replaces data-aware callback types
 * with their properly typed versions using the provided TData and TError.
 *
 * Built-in plugins that use data-aware callbacks:
 * - polling: PollingInterval<TData, TError>
 * - refetch: DataAwareCallback and DataAwareTransform patterns
 *
 * For 3rd party plugins that need data-aware options, they should
 * use DataAwareCallback or DataAwareTransform marker types.
 */
export type ResolveDataTypes<TOptions, TData, TError> = {
  [K in keyof TOptions]: Extract<
    TOptions[K],
    (...args: never[]) => unknown
  > extends never
    ? TOptions[K]
    : TOptions[K] extends PollingInterval<unknown, unknown> | undefined
      ? PollingInterval<TData, TError> | undefined
      : TOptions[K] extends
            | DataAwareCallback<infer R, unknown, unknown>
            | undefined
        ? DataAwareCallback<R, TData, TError> | undefined
        : TOptions[K] extends DataAwareTransform<unknown, unknown> | undefined
          ? DataAwareTransform<TData, TError> | undefined
          : TOptions[K];
};
