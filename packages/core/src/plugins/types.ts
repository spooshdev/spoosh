import type { HttpMethod } from "../types/common.types";
import type { AnyRequestOptions } from "../types/request.types";
import type { EnlaceResponse } from "../types/response.types";
import type { EventEmitter } from "../events/emitter";
import type { StateManager } from "../state/manager";

export type OperationType = "read" | "write" | "infiniteRead";

export type PluginPhase =
  | "beforeFetch"
  | "afterFetch"
  | "onSuccess"
  | "onError"
  | "onMount"
  | "onUnmount"
  | "onOptionsUpdate"
  | "onCacheHit"
  | "onCacheMiss"
  | "onCacheInvalidate";

export type OperationState<TData = unknown, TError = unknown> = {
  loading: boolean;
  fetching: boolean;
  data: TData | undefined;
  error: TError | undefined;
  isOptimistic: boolean;
  isStale: boolean;
  timestamp: number;
};

export type CacheEntry<TData = unknown, TError = unknown> = {
  state: OperationState<TData, TError>;
  tags: string[];

  /** The original path-derived tag (e.g., "posts/1/comments"). Used for exact matching in cache */
  selfTag?: string;
  subscribers: Set<() => void>;
  promise?: Promise<unknown>;
  previousData?: TData;
};

export type PluginContext<TData = unknown, TError = unknown> = {
  readonly operationType: OperationType;
  readonly path: string[];
  readonly method: HttpMethod;
  readonly queryKey: string;
  readonly tags: string[];

  /** Timestamp when this request was initiated. Useful for tracing and debugging. */
  readonly requestTimestamp: number;

  requestOptions: AnyRequestOptions;
  state: OperationState<TData, TError>;
  response?: EnlaceResponse<TData, TError>;
  metadata: Map<string, unknown>;

  abort: () => void;
  stateManager: StateManager;
  eventEmitter: EventEmitter;

  /** Access other plugins' exported APIs */
  plugins: PluginAccessor;

  /** Plugin-specific options passed from hooks (useRead/useWrite/useInfiniteRead) */
  pluginOptions?: unknown;

  skipFetch?: boolean;
};

/** Input type for creating PluginContext (without plugins, which is injected) */
export type PluginContextInput<TData = unknown, TError = unknown> = Omit<
  PluginContext<TData, TError>,
  "plugins"
>;

export type PluginHandler<TData = unknown, TError = unknown> = (
  context: PluginContext<TData, TError>
) => PluginContext<TData, TError> | Promise<PluginContext<TData, TError>>;

export type PluginHandlers<TData = unknown, TError = unknown> = Partial<
  Record<PluginPhase, PluginHandler<TData, TError>>
>;

/**
 * Configuration object for plugin type definitions.
 * Use this to specify which options and results your plugin provides.
 *
 * @example
 * ```ts
 * // Plugin with read options only
 * EnlacePlugin<{ readOptions: MyReadOptions }>
 *
 * // Plugin with read/write options and results
 * EnlacePlugin<{
 *   readOptions: MyReadOptions;
 *   writeOptions: MyWriteOptions;
 *   readResult: MyReadResult;
 * }>
 * ```
 */
export type PluginTypeConfig = {
  readOptions?: object;
  writeOptions?: object;
  infiniteReadOptions?: object;
  readResult?: object;
  writeResult?: object;
};

/**
 * Base interface for Enlace plugins.
 *
 * @typeParam T - Plugin type configuration object. Specify only the types your plugin needs.
 *
 * @example
 * ```ts
 * // Plugin with read options and result
 * function myPlugin(): EnlacePlugin<{
 *   readOptions: { myOption: boolean };
 *   readResult: { myResult: string };
 * }> {
 *   return {
 *     name: "my-plugin",
 *     operations: ["read"],
 *     handlers: { ... },
 *   };
 * }
 * ```
 */
export interface EnlacePlugin<T extends PluginTypeConfig = PluginTypeConfig> {
  name: string;
  operations: OperationType[];
  handlers: PluginHandlers;

  /** Expose functions/variables for other plugins to access via `context.plugins.get(name)` */
  exports?: (context: PluginContext) => object;

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
  ? () => EnlacePlugin<TTypes>
  : (config?: TConfig) => EnlacePlugin<TTypes>;

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
 * Schema resolver registry for plugin schema-aware types.
 *
 * This interface maps option key names to their schema-resolved types.
 * Built-in plugins register their types here directly.
 *
 * 3rd party plugins can extend this interface via TypeScript declaration
 * merging to register their own schema-aware types:
 *
 * @example
 * ```ts
 * // In your plugin's types file:
 * declare module 'enlace' {
 *   interface SchemaResolvers<TSchema> {
 *     myCallback: MyCallbackFn<TSchema>;
 *   }
 * }
 * ```
 */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type, @typescript-eslint/no-unused-vars
export interface SchemaResolvers<TSchema> {
  // Built-in plugin types are registered in schema-resolver.ts
  // to avoid circular dependency issues
}

/**
 * Data resolver registry for plugin data-aware types.
 *
 * This interface maps option key names to their data-resolved types.
 * Built-in plugins register their types here directly.
 *
 * 3rd party plugins can extend this interface via TypeScript declaration
 * merging to register their own data-aware types:
 *
 * @example
 * ```ts
 * // In your plugin's types file:
 * declare module 'enlace' {
 *   interface DataResolvers<TData, TError> {
 *     myTransform: (data: TData, error: TError) => TData;
 *   }
 * }
 * ```
 */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type, @typescript-eslint/no-unused-vars
export interface DataResolvers<TData, TError> {
  // Built-in plugin types are registered in schema-resolver.ts
  // to avoid circular dependency issues
}

/**
 * Registry for plugin exports. Extend via declaration merging for type-safe access.
 *
 * Plugins can expose functions and variables that other plugins can access
 * via `context.plugins.get("plugin-name")`.
 *
 * @example
 * ```ts
 * // In your plugin's types file:
 * declare module 'enlace' {
 *   interface PluginExportsRegistry {
 *     "my-plugin": { myMethod: () => void }
 *   }
 * }
 * ```
 */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface PluginExportsRegistry {}

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
