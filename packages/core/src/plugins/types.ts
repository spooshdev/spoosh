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

  requestOptions: AnyRequestOptions;
  state: OperationState<TData, TError>;
  response?: EnlaceResponse<TData, TError>;
  metadata: Map<string, unknown>;

  abort: () => void;
  stateManager: StateManager;
  eventEmitter: EventEmitter;

  skipFetch?: boolean;
  skipRemainingPlugins?: boolean;
};

export type PluginHandler<TData = unknown, TError = unknown> = (
  context: PluginContext<TData, TError>
) => PluginContext<TData, TError> | Promise<PluginContext<TData, TError>>;

export type PluginHandlers<TData = unknown, TError = unknown> = Partial<
  Record<PluginPhase, PluginHandler<TData, TError>>
>;

export interface EnlacePlugin<
  TReadOptions extends object = object,
  TWriteOptions extends object = object,
  TInfiniteReadOptions extends object = object,
  TReadResult extends object = object,
  TWriteResult extends object = object,
> {
  name: string;
  operations: OperationType[];
  handlers: PluginHandlers;
  cleanup?: () => void;

  __readOptions?: TReadOptions;
  __writeOptions?: TWriteOptions;
  __infiniteReadOptions?: TInfiniteReadOptions;
  __readResult?: TReadResult;
  __writeResult?: TWriteResult;
}

export type PluginFactory<
  TConfig = void,
  TReadOptions extends object = object,
  TWriteOptions extends object = object,
  TInfiniteReadOptions extends object = object,
  TReadResult extends object = object,
  TWriteResult extends object = object,
> = TConfig extends void
  ? () => EnlacePlugin<
      TReadOptions,
      TWriteOptions,
      TInfiniteReadOptions,
      TReadResult,
      TWriteResult
    >
  : (
      config?: TConfig
    ) => EnlacePlugin<
      TReadOptions,
      TWriteOptions,
      TInfiniteReadOptions,
      TReadResult,
      TWriteResult
    >;

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
