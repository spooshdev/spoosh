import type { PluginContext } from "../../plugins/types";
import type { PluginExecutor } from "../../plugins/executor";
import type { StateManager } from "../../state";
import type { EventEmitter } from "../../events/emitter";
import type { SpooshResponse } from "../../types/response.types";
import type { HttpMethod } from "../../types/common.types";

export type InfiniteRequestOptions = {
  query?: Record<string, unknown>;
  params?: Record<string, string | number>;
  body?: unknown;
};

export type InfinitePageStatus =
  | "pending"
  | "loading"
  | "success"
  | "error"
  | "stale";

export interface InfinitePage<TData, TError, TMeta> {
  status: InfinitePageStatus;
  data?: TData;
  error?: TError;
  meta?: TMeta;
  input?: InfiniteRequestOptions;
}

export type InfiniteNextContext<TData, TError, TRequest, TMeta> = {
  lastPage: InfinitePage<TData, TError, TMeta> | undefined;
  pages: InfinitePage<TData, TError, TMeta>[];
  request: TRequest;
};

export type InfinitePrevContext<TData, TError, TRequest, TMeta> = {
  firstPage: InfinitePage<TData, TError, TMeta> | undefined;
  pages: InfinitePage<TData, TError, TMeta>[];
  request: TRequest;
};

export type FetchDirection = "next" | "prev";

export type InfiniteTriggerOptions = Partial<InfiniteRequestOptions> & {
  /** Bypass cache and force refetch. Default: true */
  force?: boolean;
};

export type InfiniteReadState<
  TData,
  TItem,
  TError,
  TMeta = Record<string, unknown>,
> = {
  data: TItem[] | undefined;
  pages: InfinitePage<TData, TError, TMeta>[];
  canFetchNext: boolean;
  canFetchPrev: boolean;
  error: TError | undefined;
};

export type InfiniteReadController<
  TData,
  TItem,
  TError,
  TMeta = Record<string, unknown>,
> = {
  getState: () => InfiniteReadState<TData, TItem, TError, TMeta>;
  getFetchingDirection: () => FetchDirection | null;
  subscribe: (callback: () => void) => () => void;

  fetchNext: () => Promise<void>;
  fetchPrev: () => Promise<void>;
  trigger: (options?: InfiniteTriggerOptions) => Promise<void>;
  refetch: () => Promise<void>;
  abort: () => void;

  mount: () => void;
  unmount: () => void;
  update: (previousContext: PluginContext) => void;
  getContext: () => PluginContext;
  setPluginOptions: (options: unknown) => void;
};

export type CreateInfiniteReadOptions<
  TData,
  TItem,
  TError,
  TRequest,
  TMeta = Record<string, unknown>,
> = {
  path: string;
  method: HttpMethod;
  tags: string[];
  initialRequest: InfiniteRequestOptions;
  canFetchNext?: (
    ctx: InfiniteNextContext<TData, TError, TRequest, TMeta>
  ) => boolean;
  canFetchPrev?: (
    ctx: InfinitePrevContext<TData, TError, TRequest, TMeta>
  ) => boolean;
  nextPageRequest?: (
    ctx: InfiniteNextContext<TData, TError, TRequest, TMeta>
  ) => Partial<TRequest>;
  prevPageRequest?: (
    ctx: InfinitePrevContext<TData, TError, TRequest, TMeta>
  ) => Partial<TRequest>;
  merger: (pages: InfinitePage<TData, TError, TMeta>[]) => TItem[];

  stateManager: StateManager;
  eventEmitter: EventEmitter;
  pluginExecutor: PluginExecutor;
  fetchFn: (
    options: InfiniteRequestOptions,
    signal: AbortSignal
  ) => Promise<SpooshResponse<TData, TError>>;

  /** Unique identifier for the hook instance. Persists across queryKey changes. */
  instanceId?: string;
};
