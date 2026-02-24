import type { EventEmitter } from "../events/emitter";
import type { OperationType, PluginContext } from "../plugins/types";

export interface SpooshTransport<TOptions = unknown, TMessage = unknown> {
  name: string;
  operationType: OperationType;
  connect(url: string, options?: TOptions): Promise<void>;
  disconnect(): Promise<void>;
  subscribe(channel: string, callback: (message: TMessage) => void): () => void;
  send(channel: string, message: TMessage): Promise<void>;
  isConnected(): boolean;
}

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface SpooshTransportRegistry {}

export type TransportName = keyof SpooshTransportRegistry;

export interface SubscriptionContext<
  TData = unknown,
  TError = unknown,
> extends PluginContext {
  channel: string;
  message?: unknown;
  onData?: (data: TData) => void;
  onError?: (error: TError) => void;
  onDisconnect?: () => void;
  registerUnsubscribers?: (unsubscribers: Array<() => void>) => void;
}

export interface SubscriptionAdapter<TData = unknown, TError = unknown> {
  subscribe(
    context: SubscriptionContext<TData, TError>
  ): Promise<SubscriptionHandle<TData, TError>>;

  emit(
    context: SubscriptionContext<TData, TError>
  ): Promise<{ success: boolean; error?: TError }>;
}

export interface SubscriptionHandle<TData = unknown, TError = unknown> {
  unsubscribe(): void;
  getData(): TData | undefined;
  getError(): TError | undefined;
  onData(callback: (data: TData) => void): () => void;
  onError(callback: (error: TError) => void): () => void;
}

export interface SubscriptionAdapterOptions {
  channel: string;
  method: string;
  baseUrl: string;
  globalHeaders?: HeadersInit | (() => HeadersInit | Promise<HeadersInit>);
  getRequestOptions: () => Record<string, unknown> | undefined;
  eventEmitter?: EventEmitter;

  /** Transport-specific metadata for devtool integration */
  devtoolMeta?: Record<string, unknown>;
}

export interface SubscriptionAdapterFactory<TData = unknown, TError = unknown> {
  createSubscriptionAdapter(
    options: SubscriptionAdapterOptions
  ): SubscriptionAdapter<TData, TError>;
}
