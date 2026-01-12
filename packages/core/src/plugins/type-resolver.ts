import type {
  ResolverContext,
  PluginResolvers,
  InstanceApiResolvers,
  DataAwareCallback,
  DataAwareTransform,
} from "./types";

/**
 * Resolves plugin option types based on the full context.
 *
 * This is the single entry point for all type resolution. It receives
 * the full ResolverContext containing schema, data, error, and input types,
 * and resolves each option key accordingly.
 *
 * Plugins extend PluginResolvers via declaration merging to add their own
 * resolved option types.
 *
 * @example
 * ```ts
 * // In your plugin's types.ts:
 * declare module "@spoosh/core" {
 *   interface PluginResolvers<TContext> {
 *     myOption: MyResolvedType<TContext["data"]> | undefined;
 *   }
 * }
 *
 * // Type resolution:
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
  [K in keyof TOptions]: K extends keyof PluginResolvers<TContext>
    ? PluginResolvers<TContext>[K]
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

/**
 * Resolves instance API types with schema awareness.
 * Maps each key in TInstanceApi to its resolved type from resolvers.
 *
 * Plugins extend InstanceApiResolvers via declaration merging to add their own
 * resolved instance API types.
 *
 * @example
 * ```ts
 * // In your plugin's types.ts:
 * declare module "@spoosh/core" {
 *   interface InstanceApiResolvers<TSchema> {
 *     prefetch: PrefetchFn<TSchema>;
 *   }
 * }
 * ```
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export type ResolveInstanceApi<TInstanceApi, TSchema, TReadOptions = object> = {
  [K in keyof TInstanceApi]: K extends keyof InstanceApiResolvers<TSchema>
    ? InstanceApiResolvers<TSchema>[K]
    : TInstanceApi[K];
};
