import type { EnlaceResponse } from "./response.types";
import type { HttpMethod, SchemaMethod } from "./common.types";

export type RetryConfig = {
  retry?: number | false;
  retryDelay?: number;
};

export type HeadersInitOrGetter =
  | HeadersInit
  | (() => HeadersInit | Promise<HeadersInit>);

export type EnlaceOptions = Omit<RequestInit, "method" | "body" | "headers"> & {
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

export type RequestOptions<
  TBody = never,
  TQuery = never,
  TFormData = never,
> = BaseRequestOptions &
  BodyOption<TBody> &
  QueryOption<TQuery> &
  FormDataOption<TFormData>;

export type AnyRequestOptions = BaseRequestOptions & {
  body?: unknown;
  query?: Record<string, string | number | boolean | undefined>;
  formData?: Record<string, unknown>;
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
  TOptions = EnlaceOptions,
  TRequestOptions = AnyRequestOptions,
> = <TData, TError>(
  baseUrl: string,
  path: string[],
  method: HttpMethod,
  defaultOptions: TOptions,
  requestOptions?: TRequestOptions
) => Promise<EnlaceResponse<TData, TError>>;

export type ComputeRequestOptions<
  TRequestOptionsBase,
  THasDynamicSegment extends boolean,
> = "__hasDynamicParams" extends keyof TRequestOptionsBase
  ? THasDynamicSegment extends true
    ? Omit<TRequestOptionsBase, "__hasDynamicParams"> &
        NonNullable<TRequestOptionsBase["__hasDynamicParams"]>
    : Omit<TRequestOptionsBase, "__hasDynamicParams">
  : TRequestOptionsBase;
