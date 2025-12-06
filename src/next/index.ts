import { createProxyHandler } from '../core/proxy';
import type { EnlaceClient, WildcardClient } from '../core/types';
import { executeNextFetch } from './fetch';
import type { NextEnlaceOptions, NextRequestOptionsBase } from './types';

export function createEnlace<TSchema = unknown>(
  baseUrl: string,
  defaultOptions: NextEnlaceOptions = {},
): unknown extends TSchema ? WildcardClient<NextRequestOptionsBase> : EnlaceClient<TSchema, NextRequestOptionsBase> {
  return createProxyHandler(baseUrl, defaultOptions, [], executeNextFetch) as unknown extends TSchema
    ? WildcardClient<NextRequestOptionsBase>
    : EnlaceClient<TSchema, NextRequestOptionsBase>;
}

export * from '../core/types';
export * from './types';
