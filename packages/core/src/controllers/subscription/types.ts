import type { SubscriptionHandle } from "../../transport/subscription";

export interface SubscriptionController<TData = unknown, TError = unknown> {
  subscribe(): Promise<SubscriptionHandle<TData, TError>>;
  subscribe(callback: () => void): () => void;
  emit(message: unknown): Promise<{ success: boolean; error?: TError }>;
  unsubscribe(): void;
  getState(): {
    data: TData | undefined;
    error: TError | undefined;
    isConnected: boolean;
  };
  mount(): void;
  unmount(): void;
  setDisconnected(): void;
}
