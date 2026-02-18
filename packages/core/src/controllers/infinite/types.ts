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

export type PageContext<TData, TRequest = InfiniteRequestOptions> = {
  response: TData | undefined;
  allResponses: TData[];
  request: TRequest;
};

export type FetchDirection = "next" | "prev";

export type InfiniteTriggerOptions = Partial<InfiniteRequestOptions> & {
  /** Bypass cache and force refetch. Default: true */
  force?: boolean;
};

export type InfiniteReadState<TData, TItem, TError> = {
  data: TItem[] | undefined;
  allResponses: TData[] | undefined;
  allRequests: InfiniteRequestOptions[] | undefined;
  canFetchNext: boolean;
  canFetchPrev: boolean;
  error: TError | undefined;
};

export type InfiniteReadController<TData, TItem, TError> = {
  getState: () => InfiniteReadState<TData, TItem, TError>;
  getFetchingDirection: () => FetchDirection | null;
  subscribe: (callback: () => void) => () => void;

  fetchNext: () => Promise<void>;
  fetchPrev: () => Promise<void>;
  trigger: (options?: InfiniteTriggerOptions) => Promise<void>;
  abort: () => void;

  mount: () => void;
  unmount: () => void;
  update: (previousContext: PluginContext) => void;
  getContext: () => PluginContext;
  setPluginOptions: (options: unknown) => void;
};

export type CreateInfiniteReadOptions<TData, TItem, TError, TRequest> = {
  path: string;
  method: HttpMethod;
  tags: string[];
  initialRequest: InfiniteRequestOptions;
  canFetchNext?: (ctx: PageContext<TData, TRequest>) => boolean;
  canFetchPrev?: (ctx: PageContext<TData, TRequest>) => boolean;
  nextPageRequest?: (ctx: PageContext<TData, TRequest>) => Partial<TRequest>;
  prevPageRequest?: (ctx: PageContext<TData, TRequest>) => Partial<TRequest>;
  merger: (responses: TData[]) => TItem[];

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
