import type { SubscriptionClient } from "@spoosh/core";
import type { SpooshBody } from "@spoosh/core";

export interface BaseSubscriptionOptions {
  enabled?: boolean;

  /** @internal Transport-specific metadata for devtool integration */
  _devtoolMeta?: Record<string, unknown>;
}

type ExtractTriggerQuery<TQuery> = [TQuery] extends [never]
  ? unknown
  : undefined extends TQuery
    ? { query?: Exclude<TQuery, undefined> }
    : { query: TQuery };

type ExtractTriggerBody<TBody> = [TBody] extends [never]
  ? unknown
  : undefined extends TBody
    ? {
        body?:
          | Exclude<TBody, undefined>
          | SpooshBody<Exclude<TBody, undefined>>;
      }
    : { body: TBody | SpooshBody<TBody> };

type ExtractTriggerParams<TParams> = [TParams] extends [never]
  ? unknown
  : { params: TParams };

export type SubscriptionTriggerInput<TQuery, TBody, TParams> = [
  TQuery,
  TBody,
  TParams,
] extends [never, never, never]
  ? object
  : ExtractTriggerQuery<TQuery> &
      ExtractTriggerBody<TBody> &
      ExtractTriggerParams<TParams>;

export interface BaseSubscriptionResult<
  TData,
  TError,
  TPluginResult,
  TTriggerOptions,
> {
  data: TData | undefined;
  error: TError | undefined;
  isConnected: boolean;
  loading: boolean;
  meta: TPluginResult;

  /** @internal Query key for devtool integration */
  _queryKey: string;

  trigger: (options?: TTriggerOptions) => Promise<void>;
  disconnect: () => void;
}

export type SubscriptionApiClient<
  TSchema,
  TDefaultError = unknown,
> = SubscriptionClient<TSchema, TDefaultError>;
