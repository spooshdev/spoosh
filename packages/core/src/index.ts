import { createProxyHandler } from "./proxy";
import type {
  CoreRequestOptionsBase,
  EnlaceCallbacks,
  EnlaceClient,
  EnlaceOptions,
  WildcardClient,
} from "./types";

export function enlace<TSchema = unknown, TDefaultError = unknown>(
  baseUrl: string,
  defaultOptions: EnlaceOptions | null = {},
  enlaceOptions: EnlaceCallbacks = {}
): unknown extends TSchema
  ? WildcardClient<CoreRequestOptionsBase>
  : EnlaceClient<TSchema, TDefaultError, CoreRequestOptionsBase> {
  const combinedOptions = { ...defaultOptions, ...enlaceOptions };
  return createProxyHandler(baseUrl, combinedOptions) as unknown extends TSchema
    ? WildcardClient<CoreRequestOptionsBase>
    : EnlaceClient<TSchema, TDefaultError, CoreRequestOptionsBase>;
}

export * from "./types";
export * from "./utils";
export { createProxyHandler } from "./proxy";
export { executeFetch, type ExecuteFetchOptions } from "./fetch";
export {
  createMiddleware,
  applyMiddlewares,
  composeMiddlewares,
} from "./middleware";

export * from "./plugins";
export * from "./state";
export * from "./operations";
