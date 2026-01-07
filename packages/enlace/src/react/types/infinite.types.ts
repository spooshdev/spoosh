import type { EnlaceResponse } from "enlace-core";
import type { QueryApiClient } from "./common.types";

export type FetchDirection = "next" | "prev";

export type ExtractRequestOptions<T> =
  T extends Promise<EnlaceResponse<unknown, unknown, infer TOptions>>
    ? TOptions
    : never;

type QueryOption<TQuery> = [TQuery] extends [never]
  ? object
  : { query?: TQuery };

type ParamsOption<TParams> = [TParams] extends [never]
  ? object
  : { params?: TParams };

type BodyOption<TBody> = [TBody] extends [never] ? object : { body?: TBody };

export type InfiniteRequestOptions<
  TQuery = never,
  TParams = never,
  TBody = never,
> = QueryOption<TQuery> & ParamsOption<TParams> & BodyOption<TBody>;

export type QueryRequest<TQuery = Record<string, unknown>> =
  InfiniteRequestOptions<TQuery, never, never>;

export type ParamsRequest<TParams = Record<string, string | number>> =
  InfiniteRequestOptions<never, TParams, never>;

export type BodyRequest<TBody = unknown> = InfiniteRequestOptions<
  never,
  never,
  TBody
>;

export type AnyInfiniteRequestOptions = InfiniteRequestOptions<
  Record<string, unknown>,
  Record<string, string | number>,
  unknown
>;

export type NextContext<TData, TRequest> = {
  response: TData | undefined;
  allResponses: TData[];
  request: TRequest;
};

export type PrevContext<TData, TRequest> = {
  response: TData | undefined;
  allResponses: TData[];
  request: TRequest;
};

export type CanFetchNextFn<TData, TRequest> = (
  ctx: NextContext<TData, TRequest>
) => boolean;

export type CanFetchPrevFn<TData, TRequest> = (
  ctx: PrevContext<TData, TRequest>
) => boolean;

export type NextPageRequestFn<TData, TRequest, TPartialRequest = TRequest> = (
  ctx: NextContext<TData, TRequest>
) => TPartialRequest;

export type PrevPageRequestFn<TData, TRequest, TPartialRequest = TRequest> = (
  ctx: PrevContext<TData, TRequest>
) => TPartialRequest;

export type MergerFn<TData, TItem> = (allResponses: TData[]) => TItem[];

export type UseEnlaceInfiniteQueryOptions<
  TData,
  TItem,
  TRequest = AnyInfiniteRequestOptions,
  TPartialRequest = TRequest,
> = {
  canFetchNext: CanFetchNextFn<TData, TRequest>;
  nextPageRequest: NextPageRequestFn<TData, TRequest, TPartialRequest>;
  merger: MergerFn<TData, TItem>;
  canFetchPrev?: CanFetchPrevFn<TData, TRequest>;
  prevPageRequest?: PrevPageRequestFn<TData, TRequest, TPartialRequest>;
  enabled?: boolean;
  retry?: number | false;
  retryDelay?: number;
};

export type InfiniteResponseEntry<TData> = {
  data: TData;
  request: AnyInfiniteRequestOptions;
};

export type InfiniteData<TData> = {
  responses: InfiniteResponseEntry<TData>[];
};

export type UseEnlaceInfiniteQueryResult<TData, TError, TItem> = {
  data: TItem[] | undefined;
  allResponses: TData[] | undefined;
  loading: boolean;
  fetching: boolean;
  fetchingNext: boolean;
  fetchingPrev: boolean;
  canFetchNext: boolean;
  canFetchPrev: boolean;
  fetchNext: () => Promise<void>;
  fetchPrev: () => Promise<void>;
  refetch: () => Promise<void>;
  abort: () => void;
  error: TError | undefined;
  isOptimistic: boolean;
};

export type InfiniteQueryFn<TSchema, TDefaultError = unknown> = (
  api: QueryApiClient<TSchema, TDefaultError>
) => Promise<EnlaceResponse<unknown, unknown, unknown>>;

type InferData<T> =
  T extends Promise<EnlaceResponse<infer D, unknown, unknown>> ? D : unknown;

type InferError<T> =
  T extends Promise<EnlaceResponse<unknown, infer E, unknown>> ? E : unknown;

type PickOnlyRequestOptions<T> = Pick<
  T,
  Extract<keyof T, "query" | "params" | "body">
>;

type MakePartialRequest<T> = {
  [K in keyof T]?: T[K] extends Record<string, unknown> ? Partial<T[K]> : T[K];
};

type InferRequest<T> =
  T extends Promise<EnlaceResponse<unknown, unknown, infer R>>
    ? PickOnlyRequestOptions<R>
    : AnyInfiniteRequestOptions;

type InferPartialRequest<T> =
  T extends Promise<EnlaceResponse<unknown, unknown, infer R>>
    ? MakePartialRequest<PickOnlyRequestOptions<R>>
    : AnyInfiniteRequestOptions;

export type UseAPIInfiniteQuery<TSchema, TDefaultError = unknown> = <
  TReturn extends Promise<EnlaceResponse<unknown, unknown, unknown>>,
  TData = InferData<TReturn>,
  TError = InferError<TReturn>,
  TRequest = InferRequest<TReturn>,
  TPartialRequest = InferPartialRequest<TReturn>,
  TItem = TData extends Array<infer U> ? U : TData,
>(
  queryFn: (api: QueryApiClient<TSchema, TDefaultError>) => TReturn,
  options: UseEnlaceInfiniteQueryOptions<
    TData,
    TItem,
    TRequest,
    TPartialRequest
  >
) => UseEnlaceInfiniteQueryResult<TData, TError, TItem>;
