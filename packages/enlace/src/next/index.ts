import {
  createProxyHandler,
  type EnlaceClient,
  type EnlaceOptions,
  type WildcardClient,
} from "enlace-core";
import { executeNextFetch } from "./fetch";
import type { NextOptions, NextRequestOptionsBase } from "./types";

export function createEnlace<TSchema = unknown>(
  baseUrl: string,
  defaultOptions: EnlaceOptions | null = {},
  nextOptions: NextOptions = {}
): unknown extends TSchema
  ? WildcardClient<NextRequestOptionsBase>
  : EnlaceClient<TSchema, NextRequestOptionsBase> {
  const combinedOptions = { ...defaultOptions, ...nextOptions };
  return createProxyHandler(
    baseUrl,
    combinedOptions,
    [],
    executeNextFetch
  ) as unknown extends TSchema
    ? WildcardClient<NextRequestOptionsBase>
    : EnlaceClient<TSchema, NextRequestOptionsBase>;
}

export * from "enlace-core";
export * from "./types";
