import type { OptimisticCallbackFn } from "./built-in/optimistic/types";
import type { InvalidateOption } from "./built-in/invalidation/types";
import type { PollingInterval } from "./built-in/polling/types";
import type { DebounceValue } from "./built-in/debounce/types";
import type {
  ResolverContext,
  PluginResolvers,
  DataAwareCallback,
  DataAwareTransform,
} from "./types";

/**
 * Built-in resolvers for core plugins.
 * These are merged with any 3rd party extensions via PluginResolvers.
 */
type BuiltInResolvers<TContext extends ResolverContext> = {
  optimistic: OptimisticCallbackFn<TContext["schema"]> | undefined;
  invalidate: InvalidateOption<TContext["schema"]> | undefined;
  pollingInterval:
    | PollingInterval<TContext["data"], TContext["error"]>
    | undefined;
  initialData: TContext["data"] | undefined;
  debounce:
    | DebounceValue<
        TContext["input"]["query"],
        TContext["input"]["body"],
        TContext["input"]["params"],
        TContext["input"]["formData"]
      >
    | undefined;
};

/**
 * Combined resolvers: built-in + 3rd party extensions.
 */
type AllResolvers<TContext extends ResolverContext> =
  BuiltInResolvers<TContext> & PluginResolvers<TContext>;

/**
 * Resolves plugin option types based on the full context.
 *
 * This is the single entry point for all type resolution. It receives
 * the full ResolverContext containing schema, data, error, and input types,
 * and resolves each option key accordingly.
 *
 * @example
 * ```ts
 * type ResolvedOptions = ResolveTypes<
 *   MergePluginOptions<TPlugins>["read"],
 *   {
 *     schema: ApiSchema;
 *     data: Post[];
 *     error: Error;
 *     input: { query: { page: number }; body: never; params: never; formData: never };
 *   }
 * >;
 * ```
 */
export type ResolveTypes<TOptions, TContext extends ResolverContext> = {
  [K in keyof TOptions]: K extends keyof AllResolvers<TContext>
    ? AllResolvers<TContext>[K]
    : TOptions[K] extends
          | DataAwareCallback<infer R, unknown, unknown>
          | undefined
      ? DataAwareCallback<R, TContext["data"], TContext["error"]> | undefined
      : TOptions[K] extends DataAwareTransform<unknown, unknown> | undefined
        ? DataAwareTransform<TContext["data"], TContext["error"]> | undefined
        : TOptions[K];
};

/**
 * Resolves schema-aware types in plugin options.
 * This is a simplified resolver for write operations that only need schema context.
 */
export type ResolveSchemaTypes<TOptions, TSchema> = ResolveTypes<
  TOptions,
  ResolverContext<TSchema>
>;
