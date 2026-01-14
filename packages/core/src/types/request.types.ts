import type { SpooshResponse } from "./response.types";
import type { HttpMethod, SchemaMethod } from "./common.types";

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

type BodyOption<TBody> = [TBody] extends [never] ? object : { body: TBody };

type QueryOption<TQuery> = [TQuery] extends [never]
  ? object
  : { query: TQuery };

type FormDataOption<TFormData> = [TFormData] extends [never]
  ? object
  : { formData: TFormData };

type UrlEncodedOption<TUrlEncoded> = [TUrlEncoded] extends [never]
  ? object
  : { urlEncoded: TUrlEncoded };

export type RequestOptions<
  TBody = never,
  TQuery = never,
  TFormData = never,
  TUrlEncoded = never,
> = BaseRequestOptions &
  BodyOption<TBody> &
  QueryOption<TQuery> &
  FormDataOption<TFormData> &
  UrlEncodedOption<TUrlEncoded>;

export type AnyRequestOptions = BaseRequestOptions & {
  body?: unknown;
  query?: Record<string, string | number | boolean | undefined>;
  formData?: Record<string, unknown>;
  urlEncoded?: Record<string, unknown>;
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
  $get: TQueryOptions;
  $post: TMutationOptions;
  $put: TMutationOptions;
  $patch: TMutationOptions;
  $delete: TMutationOptions;
};

export type ExtractMethodOptions<TOptionsMap, TMethod extends SchemaMethod> =
  TOptionsMap extends MethodOptionsMap<infer TQuery, infer TMutation>
    ? TMethod extends "$get"
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
