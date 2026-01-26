import type { HttpMethod } from "../types/common.types";
import type { AnyRequestOptions } from "../types/request.types";
import type { SpooshResponse } from "../types/response.types";
import type { EventEmitter } from "../events/emitter";
import type { StateManager } from "../state/manager";

export type OperationType = "read" | "write" | "infiniteRead";

export type LifecyclePhase = "onMount" | "onUnmount" | "onUpdate";

export type OperationState<TData = unknown, TError = unknown> = {
  data: TData | undefined;
  error: TError | undefined;
  timestamp: number;
};

export type CacheEntry<TData = unknown, TError = unknown> = {
  state: OperationState<TData, TError>;
  tags: string[];

  /** Plugin-contributed result data (e.g., isOptimistic, isStale). Merged into hook result. */
  meta: Map<string, unknown>;

  /** The original path-derived tag (e.g., "posts/1/comments"). Used for exact matching in cache */
  selfTag?: string;
  previousData?: TData;

  /** Cache was invalidated while no subscriber was listening. Triggers refetch on next mount. */
  stale?: boolean;
};

export type PluginContext<TData = unknown, TError = unknown> = {
  readonly operationType: OperationType;
  readonly path: string[];
  readonly method: HttpMethod;
  readonly queryKey: string;
  readonly tags: string[];

  /** Timestamp when this request was initiated. Useful for tracing and debugging. */
  readonly requestTimestamp: number;

  /** Unique identifier for the hook instance. Persists across queryKey changes within the same hook. */
  readonly hookId?: string;

  requestOptions: AnyRequestOptions;
  state: OperationState<TData, TError>;
  response?: SpooshResponse<TData, TError>;
  metadata: Map<string, unknown>;

  abort: () => void;
  stateManager: StateManager;
  eventEmitter: EventEmitter;

  /** Resolved headers as a plain object. Modify via setHeaders(). */
  headers: Record<string, string>;

  /** Add/update headers. Merges with existing headers. */
  setHeaders: (headers: Record<string, string>) => void;

  /** Access other plugins' exported APIs */
  plugins: PluginAccessor;

  /** Plugin-specific options passed from hooks (useRead/useWrite/useInfiniteRead) */
  pluginOptions?: unknown;

  /** Force a network request even if cached data exists. Used by plugins to communicate intent. */
  forceRefetch?: boolean;
};

/** Input type for creating PluginContext (without injected properties) */
export type PluginContextInput<TData = unknown, TError = unknown> = Omit<
  PluginContext<TData, TError>,
  "plugins" | "setHeaders" | "headers"
>;

/**
 * Middleware function that wraps the fetch flow.
 * Plugins use this for full control over request/response handling.
 *
 * @param context - The plugin context with request info and utilities
 * @param next - Call this to continue to the next middleware or actual fetch
 * @returns The response (either from next() or early return)
 *
 * @example
 * ```ts
 * // Cache middleware - return cached data or continue
 * middleware: async (context, next) => {
 *   const cached = context.stateManager.getCache(context.queryKey);
 *   if (cached?.state?.data && !isStale(cached)) {
 *     return { data: cached.state.data, status: 200 };
 *   }
 *   return next();
 * }
 *
 * // Retry middleware - wrap and retry on error
 * middleware: async (context, next) => {
 *   for (let i = 0; i < 3; i++) {
 *     const result = await next();
 *     if (!result.error) return result;
 *   }
 *   return next();
 * }
 * ```
 */
export type PluginMiddleware<TData = unknown, TError = unknown> = (
  context: PluginContext<TData, TError>,
  next: () => Promise<SpooshResponse<TData, TError>>
) => Promise<SpooshResponse<TData, TError>>;

export type PluginHandler<TData = unknown, TError = unknown> = (
  context: PluginContext<TData, TError>
) => void | Promise<void>;

export type PluginUpdateHandler<TData = unknown, TError = unknown> = (
  context: PluginContext<TData, TError>,
  previousContext: PluginContext<TData, TError>
) => void | Promise<void>;

/**
 * Handler called after every response, regardless of early returns from middleware.
 * Can return a new response to transform it, or void for side effects only.
 * Returned responses are chained through plugins in order.
 */
export type PluginResponseHandler<TData = unknown, TError = unknown> = (
  context: PluginContext<TData, TError>,
  response: SpooshResponse<TData, TError>
) =>
  | SpooshResponse<TData, TError>
  | void
  | Promise<SpooshResponse<TData, TError> | void>;

export type PluginLifecycle<TData = unknown, TError = unknown> = {
  /** Called on component mount */
  onMount?: PluginHandler<TData, TError>;

  /** Called when options/query changes. Receives both new and previous context. */
  onUpdate?: PluginUpdateHandler<TData, TError>;

  /** Called on component unmount */
  onUnmount?: PluginHandler<TData, TError>;
};

/**
 * Configuration object for plugin type definitions.
 * Use this to specify which options and results your plugin provides.
 *
 * @example
 * ```ts
 * // Plugin with read options only
 * SpooshPlugin<{ readOptions: MyReadOptions }>
 *
 * // Plugin with read/write options and results
 * SpooshPlugin<{
 *   readOptions: MyReadOptions;
 *   writeOptions: MyWriteOptions;
 *   readResult: MyReadResult;
 * }>
 *
 * // Plugin with instance-level API
 * SpooshPlugin<{
 *   instanceApi: { prefetch: (selector: Selector) => Promise<void> };
 * }>
 * ```
 */
export type PluginTypeConfig = {
  readOptions?: object;
  writeOptions?: object;
  infiniteReadOptions?: object;
  readResult?: object;
  writeResult?: object;
  instanceApi?: object;
};

/**
 * Base interface for Spoosh plugins.
 *
 * Plugins can implement:
 * - `middleware`: Wraps the fetch flow for full control (intercept, retry, transform)
 * - `afterResponse`: Called after every response, regardless of early returns
 * - `lifecycle`: Component lifecycle hooks (onMount, onUpdate, onUnmount)
 * - `exports`: Functions/variables accessible to other plugins
 *
 * @typeParam T - Plugin type configuration object. Specify only the types your plugin needs.
 *
 * @example
 * ```ts
 * function myPlugin(): SpooshPlugin<{
 *   readOptions: { cacheTime: number };
 *   readResult: { isFromCache: boolean };
 * }> {
 *   return {
 *     name: "my-plugin",
 *     operations: ["read"],
 *     middleware: async (context, next) => {
 *       // Full control over fetch flow
 *       const result = await next();
 *       return result;
 *     },
 *     afterResponse(context, response) {
 *       // Always runs after response
 *     },
 *     lifecycle: {
 *       onMount(context) { },
 *       onUpdate(context, previousContext) { },
 *       onUnmount(context) { },
 *     },
 *   };
 * }
 * ```
 */
export interface SpooshPlugin<T extends PluginTypeConfig = PluginTypeConfig> {
  name: string;
  operations: OperationType[];

  /** Middleware for controlling the fetch flow. Called in plugin order, composing a chain. */
  middleware?: PluginMiddleware;

  /**
   * Called after middleware chain completes, regardless of early returns.
   * Return a new response to transform it, or void for side effects only.
   */
  afterResponse?: PluginResponseHandler;

  /** Component lifecycle hooks (setup, cleanup, option changes) */
  lifecycle?: PluginLifecycle;

  /** Expose functions/variables for other plugins to access via `context.plugins.get(name)` */
  exports?: (context: PluginContext) => object;

  /**
   * Expose functions/properties on the framework adapter return value (e.g., createReactSpoosh).
   * Unlike `exports`, these are accessible directly from the instance, not just within plugin context.
   *
   * @example
   * ```ts
   * instanceApi: ({ api, stateManager }) => ({
   *   prefetch: async (selector) => { ... },
   *   invalidateAll: () => { ... },
   * })
   * ```
   */
  instanceApi?: (
    context: InstanceApiContext
  ) => T extends { instanceApi: infer A } ? A : object;

  /** Declare plugin dependencies. These plugins must be registered before this one. */
  dependencies?: string[];

  /** @internal Type carrier for inference - do not use directly */
  readonly _types?: T;
}

/**
 * Helper type for creating plugin factory functions.
 *
 * @typeParam TConfig - Configuration object type (use `void` for no config)
 * @typeParam TTypes - Plugin type configuration object
 *
 * @example
 * ```ts
 * // Factory with no config
 * const myPlugin: PluginFactory<void, { readOptions: MyOpts }> = () => ({ ... });
 *
 * // Factory with config
 * const myPlugin: PluginFactory<MyConfig, { readOptions: MyOpts }> = (config) => ({ ... });
 * ```
 */
export type PluginFactory<
  TConfig = void,
  TTypes extends PluginTypeConfig = PluginTypeConfig,
> = TConfig extends void
  ? () => SpooshPlugin<TTypes>
  : (config?: TConfig) => SpooshPlugin<TTypes>;

/**
 * Marker type for callbacks that need TData/TError from useRead/useWrite.
 * Third-party plugins should use this for data-aware callback options.
 *
 * @example
 * ```ts
 * interface MyPluginReadOptions {
 *   onDataChange?: DataAwareCallback<boolean>;  // (data, error) => boolean
 *   transform?: DataAwareTransform;             // (data, error) => data
 * }
 * ```
 */
export type DataAwareCallback<
  TReturn = void,
  TData = unknown,
  TError = unknown,
> = (data: TData | undefined, error: TError | undefined) => TReturn;

/**
 * Marker type for transform functions that receive and return TData.
 */
export type DataAwareTransform<TData = unknown, TError = unknown> = (
  data: TData | undefined,
  error: TError | undefined
) => TData | undefined;

/**
 * Context object containing all type information available for resolution.
 * 3rd party plugins can access any combination of these types.
 */
export type ResolverContext<
  TSchema = unknown,
  TData = unknown,
  TError = unknown,
  TQuery = unknown,
  TBody = unknown,
  TParams = unknown,
> = {
  schema: TSchema;
  data: TData;
  error: TError;
  input: {
    query: TQuery;
    body: TBody;
    params: TParams;
  };
};

/**
 * Unified resolver registry for plugin type resolution.
 *
 * 3rd party plugins can extend this interface via TypeScript declaration
 * merging to register their own type-aware options:
 *
 * @example
 * ```ts
 * // In your plugin's types file:
 * declare module '@spoosh/core' {
 *   interface PluginResolvers<TContext> {
 *     // Access schema
 *     mySchemaCallback: MyFn<TContext['schema']> | undefined;
 *
 *     // Access data/error
 *     myDataTransform: (data: TContext['data']) => TContext['data'];
 *
 *     // Access request input
 *     myDebounce: (prev: { prevQuery: TContext['input']['query'] }) => number;
 *
 *     // Access multiple contexts at once
 *     myComplexOption: ComplexFn<TContext['schema'], TContext['data']>;
 *   }
 * }
 * ```
 */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type, @typescript-eslint/no-unused-vars
export interface PluginResolvers<TContext extends ResolverContext> {
  // Built-in plugin types are registered in type-resolver.ts
}

/**
 * Registry for plugin result type resolution based on options.
 * Extend via declaration merging to provide type inference for hook results.
 *
 * Unlike PluginResolvers which receives the full context, this receives
 * the OPTIONS type so plugins can infer result types from what the user passes.
 *
 * @example
 * ```ts
 * // In your plugin's types file:
 * declare module '@spoosh/core' {
 *   interface PluginResultResolvers<TOptions> {
 *     transformedData: TOptions extends { transform: { response: (...args: never[]) => infer R } }
 *       ? Awaited<R> | undefined
 *       : never;
 *   }
 * }
 * ```
 */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type, @typescript-eslint/no-unused-vars
export interface PluginResultResolvers<TOptions> {}

/**
 * Registry for plugin exports. Extend via declaration merging for type-safe access.
 *
 * Plugins can expose functions and variables that other plugins can access
 * via `context.plugins.get("plugin-name")`.
 *
 * @example
 * ```ts
 * // In your plugin's types file:
 * declare module '@spoosh/core' {
 *   interface PluginExportsRegistry {
 *     "my-plugin": { myMethod: () => void }
 *   }
 * }
 * ```
 */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface PluginExportsRegistry {}

/**
 * Registry for instance API type resolution. Extend via declaration merging.
 *
 * Plugins that expose schema-aware instance APIs should extend this interface
 * to get proper type inference when the API is used.
 *
 * @example
 * ```ts
 * // In your plugin's types file:
 * declare module '@spoosh/core' {
 *   interface InstanceApiResolvers<TSchema> {
 *     myFunction: MyFn<TSchema>;
 *   }
 * }
 * ```
 */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type, @typescript-eslint/no-unused-vars
export interface InstanceApiResolvers<TSchema> {}

/**
 * Accessor for plugin exports with type-safe lookup.
 */
export type PluginAccessor = {
  /** Get a plugin's exported API by name. Returns undefined if plugin not found. */
  get<K extends keyof PluginExportsRegistry>(
    name: K
  ): PluginExportsRegistry[K] | undefined;

  get(name: string): unknown;
};

/**
 * Event emitted by plugins to request a refetch.
 * Hooks subscribe to this event and trigger controller.execute().
 */
export type RefetchEvent = {
  queryKey: string;
  reason: "focus" | "reconnect" | "polling" | "invalidate";
};

/**
 * Minimal PluginExecutor interface for InstanceApiContext.
 * Avoids circular dependency with executor.ts.
 */
export type InstancePluginExecutor = {
  executeMiddleware: <TData, TError>(
    operationType: OperationType,
    context: PluginContext<TData, TError>,
    coreFetch: () => Promise<SpooshResponse<TData, TError>>
  ) => Promise<SpooshResponse<TData, TError>>;

  createContext: <TData, TError>(
    input: PluginContextInput<TData, TError>
  ) => PluginContext<TData, TError>;
};

/**
 * Context provided to plugin's instanceApi function.
 * Used for creating framework-agnostic APIs exposed on the Spoosh instance.
 */
export type InstanceApiContext<TApi = unknown> = {
  api: TApi;
  stateManager: StateManager;
  eventEmitter: EventEmitter;
  pluginExecutor: InstancePluginExecutor;
};
