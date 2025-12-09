import { createProxyHandler } from "./proxy";
import type {
  EnlaceCallbacks,
  EnlaceClient,
  EnlaceOptions,
  WildcardClient,
} from "./types";

export function createEnlace<TSchema = unknown>(
  baseUrl: string,
  defaultOptions: EnlaceOptions | null = {},
  enlaceOptions: EnlaceCallbacks = {}
): unknown extends TSchema ? WildcardClient : EnlaceClient<TSchema> {
  const combinedOptions = { ...defaultOptions, ...enlaceOptions };
  return createProxyHandler(baseUrl, combinedOptions) as unknown extends TSchema
    ? WildcardClient
    : EnlaceClient<TSchema>;
}

export * from "./types";
export * from "./utils";
export { createProxyHandler } from "./proxy";
export { executeFetch } from "./fetch";
