import type { SubscriptionController } from "./types";
import type {
  SubscriptionAdapter,
  SubscriptionContext,
  SubscriptionHandle,
} from "../../transport/subscription";
import type { StateManager } from "../../state";
import type { EventEmitter } from "../../events/emitter";
import type { PluginExecutor } from "../../plugins/executor";
import type { OperationType } from "../../plugins/types";
import { composeAdapter } from "../../transport/compose";

export interface CreateSubscriptionControllerOptions<TData, TError> {
  channel: string;
  baseAdapter: SubscriptionAdapter<TData, TError>;
  stateManager: StateManager;
  eventEmitter: EventEmitter;
  pluginExecutor: PluginExecutor;
  queryKey: string;
  operationType: OperationType;
  path: string;
  method: string;
  instanceId?: string;
}

export function createSubscriptionController<TData, TError>(
  options: CreateSubscriptionControllerOptions<TData, TError>
): SubscriptionController<TData, TError> {
  const {
    channel,
    baseAdapter,
    pluginExecutor,
    operationType,
    stateManager,
    eventEmitter,
    queryKey,
    path,
    method,
    instanceId,
  } = options;

  const plugins = pluginExecutor.getPluginsForOperation(operationType);
  const adapter = composeAdapter(
    baseAdapter as SubscriptionAdapter,
    plugins
  ) as SubscriptionAdapter<TData, TError>;

  let handle: SubscriptionHandle<TData, TError> | null = null;
  const subscribers = new Set<() => void>();
  let subscriptionVersion = 0;

  const messageQueue: TData[] = [];
  let queueIndex = 0;

  let cachedState = {
    data: undefined as TData | undefined,
    error: undefined as TError | undefined,
    isConnected: false,
    _messageQueue: messageQueue,
    _queueIndex: queueIndex,
  };

  const updateStateFromHandle = () => {
    if (!handle) return;

    const newData = handle.getData();
    const newError = handle.getError();

    if (newData !== cachedState.data || newError !== cachedState.error) {
      cachedState = {
        ...cachedState,
        data: newData,
        error: newError,
        isConnected: true,
      };
    }
  };

  const notify = () => {
    subscribers.forEach((callback) => callback());
  };

  const createContext = (): SubscriptionContext<TData, TError> => {
    const baseCtx = pluginExecutor.createContext({
      operationType,
      path,
      method: method as never,
      queryKey,
      tags: [],
      requestTimestamp: Date.now(),
      instanceId,
      request: { headers: {} } as never,
      temp: new Map(),
      stateManager,
      eventEmitter,
    });

    return {
      ...baseCtx,
      channel,
    } as SubscriptionContext<TData, TError>;
  };

  return {
    subscribe: ((callbackOrVoid?: () => void) => {
      if (callbackOrVoid === undefined) {
        subscriptionVersion++;
        const thisVersion = subscriptionVersion;

        if (handle) {
          handle.unsubscribe();
          handle = null;
        }

        messageQueue.length = 0;
        queueIndex = 0;
        cachedState = {
          data: undefined,
          error: undefined,
          isConnected: false,
          _messageQueue: messageQueue,
          _queueIndex: queueIndex,
        };
        notify();

        const ctx = createContext();

        ctx.onData = (data: TData) => {
          if (thisVersion !== subscriptionVersion) {
            return;
          }

          messageQueue.push(data);
          queueIndex++;

          cachedState = {
            data,
            error: cachedState.error,
            isConnected: true,
            _messageQueue: messageQueue,
            _queueIndex: queueIndex,
          };

          notify();
        };

        ctx.onError = (error: TError) => {
          if (thisVersion !== subscriptionVersion) {
            return;
          }

          cachedState = {
            ...cachedState,
            error,
          };

          notify();
        };

        ctx.onDisconnect = () => {
          if (thisVersion !== subscriptionVersion) {
            return;
          }

          cachedState = {
            ...cachedState,
            isConnected: false,
          };

          notify();
        };

        return adapter
          .subscribe(ctx)
          .then((newHandle) => {
            if (thisVersion !== subscriptionVersion) {
              newHandle.unsubscribe();
              return newHandle;
            }

            handle = newHandle;

            const handleError = newHandle.getError();

            if (handleError) {
              cachedState = {
                ...cachedState,
                error: handleError as TError,
                isConnected: false,
              };
            } else {
              updateStateFromHandle();

              cachedState = {
                ...cachedState,
                isConnected: true,
              };
            }

            notify();
            return handle;
          })
          .catch((err) => {
            if (thisVersion !== subscriptionVersion) {
              return null;
            }

            cachedState = {
              ...cachedState,
              error: err as TError,
              isConnected: false,
            };

            notify();
            return null;
          });
      }

      subscribers.add(callbackOrVoid);

      return () => {
        subscribers.delete(callbackOrVoid);
      };
    }) as SubscriptionController<TData, TError>["subscribe"],

    emit: async (message) => {
      const ctx = createContext();
      ctx.message = message;
      return adapter.emit(ctx);
    },

    unsubscribe: () => {
      subscriptionVersion++;

      if (handle) {
        handle.unsubscribe();
        handle = null;
      }

      cachedState = {
        ...cachedState,
        isConnected: false,
      };

      notify();
    },

    getState: () => cachedState,

    mount: () => {},

    unmount: () => {
      subscriptionVersion++;

      if (handle) {
        handle.unsubscribe();
        handle = null;
      }

      cachedState = {
        ...cachedState,
        isConnected: false,
      };

      notify();
    },

    setDisconnected: () => {
      cachedState = {
        ...cachedState,
        isConnected: false,
      };

      notify();
    },
  };
}
