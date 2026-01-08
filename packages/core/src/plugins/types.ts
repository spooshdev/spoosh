import type { HttpMethod } from "../types/common.types";
import type { AnyRequestOptions } from "../types/request.types";
import type { EnlaceResponse } from "../types/response.types";

export type OperationType = "read" | "write" | "infiniteRead";

export type PluginPhase =
  | "beforeFetch"
  | "afterFetch"
  | "onSuccess"
  | "onError"
  | "onMount"
  | "onUnmount"
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
  getCache: () => CacheEntry<TData, TError> | undefined;
  setCache: (entry: Partial<CacheEntry<TData, TError>>) => void;
  invalidateTags: (tags: string[]) => void;
  subscribe: (callback: () => void) => () => void;
  onInvalidate: (callback: (tags: string[]) => void) => () => void;

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
> {
  name: string;
  operations: OperationType[];
  handlers: PluginHandlers;
  cleanup?: () => void;

  __readOptions?: TReadOptions;
  __writeOptions?: TWriteOptions;
  __infiniteReadOptions?: TInfiniteReadOptions;
}

export type PluginFactory<
  TConfig = void,
  TReadOptions extends object = object,
  TWriteOptions extends object = object,
  TInfiniteReadOptions extends object = object,
> = TConfig extends void
  ? () => EnlacePlugin<TReadOptions, TWriteOptions, TInfiniteReadOptions>
  : (
      config?: TConfig
    ) => EnlacePlugin<TReadOptions, TWriteOptions, TInfiniteReadOptions>;
