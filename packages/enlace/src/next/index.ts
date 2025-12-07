import { createProxyHandler, type EnlaceClient, type WildcardClient } from "enlace-core";
import { executeNextFetch } from "./fetch";
import type { NextEnlaceOptions, NextRequestOptionsBase } from "./types";

export function createEnlace<TSchema = unknown>(
  baseUrl: string,
  defaultOptions: NextEnlaceOptions = {}
): unknown extends TSchema
  ? WildcardClient<NextRequestOptionsBase>
  : EnlaceClient<TSchema, NextRequestOptionsBase> {
  return createProxyHandler(baseUrl, defaultOptions, [], executeNextFetch) as unknown extends TSchema
    ? WildcardClient<NextRequestOptionsBase>
    : EnlaceClient<TSchema, NextRequestOptionsBase>;
}

export * from "enlace-core";
export * from "./types";
