import type { HttpMethod } from "./common.types";
import type { AnyRequestOptions, EnlaceOptions } from "./request.types";
import type { EnlaceCallbacks, EnlaceResponse } from "./response.types";

export type MiddlewarePhase = "before" | "after";

export type MiddlewareContext<TData = unknown, TError = unknown> = {
  baseUrl: string;
  path: string[];
  method: HttpMethod;
  defaultOptions: EnlaceOptions & EnlaceCallbacks;
  requestOptions?: AnyRequestOptions;
  fetchInit?: RequestInit;
  response?: EnlaceResponse<TData, TError>;
  metadata: Record<string, unknown>;
};

export type MiddlewareHandler<TData = unknown, TError = unknown> = (
  context: MiddlewareContext<TData, TError>
) =>
  | MiddlewareContext<TData, TError>
  | Promise<MiddlewareContext<TData, TError>>;

export type EnlaceMiddleware<TData = unknown, TError = unknown> = {
  name: string;
  phase: MiddlewarePhase;
  handler: MiddlewareHandler<TData, TError>;
};
