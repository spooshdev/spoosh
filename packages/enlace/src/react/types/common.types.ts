import type {
  EnlaceCallbacks,
  EnlaceClient,
  EnlaceResponse,
  MutationOnlyClient,
  QueryOnlyClient,
  RetryConfig,
  WildcardClient,
  WildcardMutationClient,
  WildcardQueryClient,
} from "enlace-core";
import type { ReactOptionsMap } from "./request.types";

export type ApiClient<
  TSchema,
  TDefaultError = unknown,
  TOptionsMap = ReactOptionsMap,
> = unknown extends TSchema
  ? WildcardClient<TOptionsMap>
  : EnlaceClient<TSchema, TDefaultError, TOptionsMap>;

export type ReadApiClient<
  TSchema,
  TDefaultError = unknown,
  TOptionsMap = ReactOptionsMap,
> = unknown extends TSchema
  ? WildcardQueryClient<TOptionsMap>
  : QueryOnlyClient<TSchema, TDefaultError, TOptionsMap>;

export type WriteApiClient<
  TSchema,
  TDefaultError = unknown,
  TOptionsMap = ReactOptionsMap,
> = unknown extends TSchema
  ? WildcardMutationClient<TOptionsMap>
  : MutationOnlyClient<TSchema, TDefaultError, TOptionsMap>;

export type {
  PollingIntervalValue,
  PollingIntervalFn,
  PollingInterval,
} from "enlace-core";

export type EnlaceHookOptions = EnlaceCallbacks & {
  autoGenerateTags?: boolean;
  autoRevalidateTags?: boolean;
  staleTime?: number;
} & RetryConfig;

export type HookState = {
  loading: boolean;
  fetching: boolean;
  data: unknown;
  error: unknown;
};

export type TrackedCall = {
  path: string[];
  method: string;
  options: unknown;
};

export const HTTP_METHODS = [
  "$get",
  "$post",
  "$put",
  "$patch",
  "$delete",
] as const;

type HookResponseState<TData, TError> =
  | { data: TData; error?: undefined }
  | { data?: undefined; error: TError };

export type UseEnlaceReadResult<TData, TError> = {
  loading: boolean;
  fetching: boolean;
  abort: () => void;
  isOptimistic: boolean;
} & HookResponseState<TData, TError>;

export type ExtractWriteData<T> = T extends (
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ...args: any[]
) => Promise<EnlaceResponse<infer D, unknown>>
  ? D
  : never;

export type ExtractWriteError<T> = T extends (
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ...args: any[]
) => Promise<EnlaceResponse<unknown, infer E>>
  ? E
  : never;

export type UseEnlaceWriteResult<TMethod> = {
  trigger: TMethod;
  loading: boolean;
  fetching: boolean;
  abort: () => void;
} & HookResponseState<ExtractWriteData<TMethod>, ExtractWriteError<TMethod>>;
