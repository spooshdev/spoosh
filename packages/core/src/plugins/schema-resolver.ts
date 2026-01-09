import type { OptimisticCallbackFn } from "./built-in/optimistic/types";
import type { InvalidateOption } from "./built-in/invalidation/types";
import type { PollingInterval } from "./built-in/polling/types";
import type {
  SchemaResolvers,
  DataResolvers,
  DataAwareCallback,
  DataAwareTransform,
} from "./types";

/**
 * Built-in schema resolvers for core plugins.
 * These are merged with any 3rd party extensions via SchemaResolvers.
 */
type BuiltInSchemaResolvers<TSchema> = {
  optimistic: OptimisticCallbackFn<TSchema> | undefined;
  invalidate: InvalidateOption<TSchema> | undefined;
};

/**
 * Built-in data resolvers for core plugins.
 * These are merged with any 3rd party extensions via DataResolvers.
 */
type BuiltInDataResolvers<TData, TError> = {
  pollingInterval: PollingInterval<TData, TError> | undefined;
};

/**
 * Combined schema resolvers: built-in + 3rd party extensions.
 */
type AllSchemaResolvers<TSchema> = BuiltInSchemaResolvers<TSchema> &
  SchemaResolvers<TSchema>;

/**
 * Combined data resolvers: built-in + 3rd party extensions.
 */
type AllDataResolvers<TData, TError> = BuiltInDataResolvers<TData, TError> &
  DataResolvers<TData, TError>;

/**
 * Resolves schema-aware types in plugin options.
 *
 * Built-in plugins (optimistic, invalidation) are resolved automatically.
 * 3rd party plugins can extend via declaration merging:
 *
 * @example
 * ```ts
 * declare module 'enlace' {
 *   interface SchemaResolvers<TSchema> {
 *     myCallback: MyCallbackFn<TSchema> | undefined;
 *   }
 * }
 * ```
 */
export type ResolveSchemaTypes<TOptions, TSchema> = {
  [K in keyof TOptions]: K extends keyof AllSchemaResolvers<TSchema>
    ? AllSchemaResolvers<TSchema>[K]
    : TOptions[K];
};

/**
 * Resolves data-aware types in plugin options.
 *
 * Built-in plugins (polling) are resolved automatically.
 * Also detects DataAwareCallback/DataAwareTransform patterns.
 * 3rd party plugins can extend via declaration merging:
 *
 * @example
 * ```ts
 * declare module 'enlace' {
 *   interface DataResolvers<TData, TError> {
 *     myInterval: MyIntervalFn<TData, TError> | undefined;
 *   }
 * }
 * ```
 */
export type ResolveDataTypes<TOptions, TData, TError> = {
  [K in keyof TOptions]: K extends keyof AllDataResolvers<TData, TError>
    ? AllDataResolvers<TData, TError>[K]
    : TOptions[K] extends
          | DataAwareCallback<infer R, unknown, unknown>
          | undefined
      ? DataAwareCallback<R, TData, TError> | undefined
      : TOptions[K] extends DataAwareTransform<unknown, unknown> | undefined
        ? DataAwareTransform<TData, TError> | undefined
        : TOptions[K];
};
