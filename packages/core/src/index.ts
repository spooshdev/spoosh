import { createProxyHandler } from "./proxy";
import type { EnlaceClient, EnlaceOptions, WildcardClient } from "./types";

export function createEnlace<TSchema = unknown>(
  baseUrl: string,
  defaultOptions: EnlaceOptions = {}
): unknown extends TSchema ? WildcardClient : EnlaceClient<TSchema> {
  return createProxyHandler(baseUrl, defaultOptions) as unknown extends TSchema
    ? WildcardClient
    : EnlaceClient<TSchema>;
}

export * from "./types";
export * from "./utils";
export { createProxyHandler } from "./proxy";
export { executeFetch } from "./fetch";
