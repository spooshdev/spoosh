export type EnlaceResponse<TData, TError> =
  | {
      status: number;
      data: TData;
      headers?: Headers;
      error?: undefined;
      aborted?: false;
    }
  | {
      status: number;
      data?: undefined;
      headers?: Headers;
      error: TError;
      aborted?: boolean;
    };

export type EnlaceCallbackPayload<T> = {
  status: number;
  data: T;
  headers?: Headers;
};

export type EnlaceErrorCallbackPayload<T> = {
  status: number;
  error: T;
  headers?: Headers;
};

export type EnlaceCallbacks = {
  onSuccess?: ((payload: EnlaceCallbackPayload<unknown>) => void) | undefined;
  onError?:
    | ((payload: EnlaceErrorCallbackPayload<unknown>) => void)
    | undefined;
};
