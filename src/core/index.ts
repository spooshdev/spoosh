import { createProxyHandler } from './proxy';
import type { EnlaceClient, EnlaceOptions, WildcardClient } from './types';

/**
 * Creates an API client.
 *
 * @example
 * // Typed mode - with schema
 * const api = createEnlace<MyApi>('https://api.example.com');
 *
 * // Untyped mode - no schema
 * const api = createEnlace('https://api.example.com');
 */
export function createEnlace<TSchema = unknown>(
  baseUrl: string,
  defaultOptions: EnlaceOptions = {},
): unknown extends TSchema ? WildcardClient : EnlaceClient<TSchema> {
  return createProxyHandler(baseUrl, defaultOptions) as unknown extends TSchema
    ? WildcardClient
    : EnlaceClient<TSchema>;
}

export type {
  EnlaceClient,
  EnlaceOptions,
  EnlaceResponse,
  Endpoint,
  FetchExecutor,
  HttpMethod,
  MethodDefinition,
  RequestOptions,
  SchemaMethod,
  WildcardClient,
} from './types';

export { createProxyHandler } from './proxy';
export { executeFetch } from './fetch';
