import type { SpooshResponse } from "./response.types";
import type { HttpMethod } from "./common.types";

export type RetryConfig = {
  retries?: number | false;
  retryDelay?: number;
};

export type HeadersInitOrGetter =
  | HeadersInit
  | (() => HeadersInit | Promise<HeadersInit>);

export type SpooshOptions = Omit<RequestInit, "method" | "body" | "headers"> & {
  headers?: HeadersInitOrGetter;
};

type BaseRequestOptions = {
  headers?: HeadersInitOrGetter;
  cache?: RequestCache;
  signal?: AbortSignal;
};

type BodyOption<TBody> = [TBody] extends [never]
  ? object
  : undefined extends TBody
    ? { body?: Exclude<TBody, undefined> }
    : { body: TBody };

type QueryOption<TQuery> = [TQuery] extends [never]
  ? object
  : undefined extends TQuery
    ? { query?: Exclude<TQuery, undefined> }
    : { query: TQuery };

export type RequestOptions<TBody = never, TQuery = never> = BaseRequestOptions &
  BodyOption<TBody> &
  QueryOption<TQuery>;

export type AnyRequestOptions = BaseRequestOptions & {
  body?: unknown;
  query?: Record<string, string | number | boolean | undefined>;
  params?: Record<string, string | number>;
  signal?: AbortSignal;
} & Partial<RetryConfig>;

type DynamicParamsOption = {
  params?: Record<string, string | number>;
};

export type CoreRequestOptionsBase = {
  __hasDynamicParams?: DynamicParamsOption;
};

export type MethodOptionsMap<
  TQueryOptions = object,
  TMutationOptions = object,
> = {
  GET: TQueryOptions;
  POST: TMutationOptions;
  PUT: TMutationOptions;
  PATCH: TMutationOptions;
  DELETE: TMutationOptions;
};

export type ExtractMethodOptions<TOptionsMap, TMethod extends HttpMethod> =
  TOptionsMap extends MethodOptionsMap<infer TQuery, infer TMutation>
    ? TMethod extends "GET"
      ? TQuery
      : TMutation
    : TOptionsMap;

export type FetchExecutor<
  TOptions = SpooshOptions,
  TRequestOptions = AnyRequestOptions,
> = <TData, TError>(
  baseUrl: string,
  path: string[],
  method: HttpMethod,
  defaultOptions: TOptions,
  requestOptions?: TRequestOptions,
  nextTags?: boolean
) => Promise<SpooshResponse<TData, TError>>;

type TypedParamsOption<TParamNames extends string> = [TParamNames] extends [
  never,
]
  ? object
  : { params?: Record<TParamNames, string | number> };

export type ComputeRequestOptions<
  TRequestOptionsBase,
  TParamNames extends string,
> = "__hasDynamicParams" extends keyof TRequestOptionsBase
  ? [TParamNames] extends [never]
    ? Omit<TRequestOptionsBase, "__hasDynamicParams">
    : Omit<TRequestOptionsBase, "__hasDynamicParams"> &
        TypedParamsOption<TParamNames>
  : TRequestOptionsBase & TypedParamsOption<TParamNames>;
