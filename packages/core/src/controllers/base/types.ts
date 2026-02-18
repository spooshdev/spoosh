import type { HttpMethod } from "../../types/common.types";
import type { AnyRequestOptions } from "../../types/request.types";
import type { SpooshResponse } from "../../types/response.types";
import type {
  OperationState,
  OperationType,
  PluginContext,
} from "../../plugins/types";
import type { PluginExecutor } from "../../plugins/executor";
import type { StateManager } from "../../state";
import type { EventEmitter } from "../../events/emitter";

export type ExecuteOptions = {
  force?: boolean;
};

export type OperationController<TData = unknown, TError = unknown> = {
  execute: (
    options?: AnyRequestOptions,
    executeOptions?: ExecuteOptions
  ) => Promise<SpooshResponse<TData, TError>>;
  getState: () => OperationState<TData, TError>;
  subscribe: (callback: () => void) => () => void;
  abort: () => void;
  refetch: () => Promise<SpooshResponse<TData, TError>>;

  /** Called once when hook first mounts */
  mount: () => void;

  /** Called once when hook finally unmounts */
  unmount: () => void;

  /** Called when options/query changes. Pass previous context for cleanup. */
  update: (previousContext: PluginContext) => void;

  /** Get current context (for passing to update as previousContext) */
  getContext: () => PluginContext;

  setPluginOptions: (options: unknown) => void;
  setMetadata: (key: string, value: unknown) => void;
};

export type CreateOperationOptions<TData, TError> = {
  operationType: OperationType;
  path: string;
  method: HttpMethod;
  tags: string[];
  requestOptions?: AnyRequestOptions;
  stateManager: StateManager;
  eventEmitter: EventEmitter;
  pluginExecutor: PluginExecutor;
  fetchFn: (
    options: AnyRequestOptions
  ) => Promise<SpooshResponse<TData, TError>>;

  /** Unique identifier for the hook instance. Persists across queryKey changes. */
  instanceId?: string;
};
