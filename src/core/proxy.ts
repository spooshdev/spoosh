import { executeFetch } from './fetch';
import type { EnlaceOptions, FetchExecutor, HttpMethod, RequestOptions } from './types';

const HTTP_METHODS: Record<string, HttpMethod> = {
  get: 'GET',
  post: 'POST',
  put: 'PUT',
  patch: 'PATCH',
  delete: 'DELETE',
};

export function createProxyHandler<TSchema extends object, TOptions = EnlaceOptions>(
  baseUrl: string,
  defaultOptions: TOptions,
  path: string[] = [],
  fetchExecutor: FetchExecutor<TOptions, RequestOptions<unknown>> = executeFetch as FetchExecutor<TOptions, RequestOptions<unknown>>,
): TSchema {
  const handler: ProxyHandler<TSchema> = {
    get(_target, prop: string | symbol) {
      if (typeof prop === 'symbol') return undefined;

      const method = HTTP_METHODS[prop];
      if (method) {
        return (options?: RequestOptions<unknown>) =>
          fetchExecutor(baseUrl, path, method, defaultOptions, options);
      }

      return createProxyHandler(baseUrl, defaultOptions, [...path, prop], fetchExecutor);
    },
  };

  return new Proxy({} as TSchema, handler);
}
