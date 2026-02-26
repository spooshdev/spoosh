import type {
  ResolverContext,
  PluginResolvers,
  PluginResultResolvers,
  ApiResolvers,
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
 * Resolves plugin result types based on the options passed to the hook.
 *
 * This allows plugins to infer result types from the options. For example,
 * the transform plugin can infer `transformedData` type from the response
 * transformer's return type.
 *
 * @example
 * ```ts
 * // Usage in hooks:
 * type ResolvedResults = ResolveResultTypes<PluginResults["read"], TReadOpts>;
 * // If TReadOpts has { transform: { response: (d) => { count: number } } }
 * // Then transformedData will be { count: number } | undefined
 * ```
 */
export type ResolveResultTypes<TResults, TOptions> = TResults &
  PluginResultResolvers<TOptions>;

/**
 * Resolves public API types with schema awareness.
 * Maps each key in TApi to its resolved type from resolvers.
 *
 * Plugins extend ApiResolvers via declaration merging to add their own
 * resolved API types.
 *
 * @example
 * ```ts
 * // In your plugin's types.ts:
 * declare module "@spoosh/core" {
 *   interface ApiResolvers<TSchema> {
 *     prefetch: PrefetchFn<TSchema>;
 *   }
 * }
 * ```
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export type ResolveApi<TApi, TSchema, TReadOptions = object> = {
  [K in keyof TApi]: K extends keyof ApiResolvers<TSchema>
    ? ApiResolvers<TSchema>[K]
    : TApi[K];
};
