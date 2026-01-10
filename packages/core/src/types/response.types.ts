import type { EnlaceMiddleware } from "./middleware.types";

export type EnlaceResponse<TData, TError, TRequestOptions = unknown> =
  | {
      status: number;
      data: TData;
      headers?: Headers;
      error?: undefined;
      aborted?: false;
      readonly __requestOptions?: TRequestOptions;
    }
  | {
      status: number;
      data?: undefined;
      headers?: Headers;
      error: TError;
      aborted?: boolean;
      readonly __requestOptions?: TRequestOptions;
    };

export type EnlaceOptionsExtra<TData = unknown, TError = unknown> = {
  middlewares?: EnlaceMiddleware<TData, TError>[];
};
