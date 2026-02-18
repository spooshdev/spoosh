import type { Signal } from "@angular/core";
import type {
  SpooshResponse,
  ReadClient,
  TagOptions,
  ExtractTriggerQuery,
  ExtractTriggerBody,
  ExtractTriggerParams,
} from "@spoosh/core";
import type { EnabledOption } from "../types/shared";

export interface BaseReadOptions extends TagOptions {
  enabled?: EnabledOption;
}

type QueryField<TQuery> = [TQuery] extends [never]
  ? object
  : undefined extends TQuery
    ? { query?: Exclude<TQuery, undefined> }
    : { query: TQuery };

type BodyField<TBody> = [TBody] extends [never]
  ? object
  : undefined extends TBody
    ? { body?: Exclude<TBody, undefined> }
    : { body: TBody };

type ParamsField<TParamNames extends string> = [TParamNames] extends [never]
  ? object
  : { params: Record<TParamNames, string | number> };

type ReadInputFields<
  TQuery,
  TBody,
  TParamNames extends string,
> = QueryField<TQuery> & BodyField<TBody> & ParamsField<TParamNames>;

export type ResponseInputFields<TQuery, TBody, TParamNames extends string> = [
  TQuery,
  TBody,
  TParamNames,
] extends [never, never, never]
  ? object
  : { input: ReadInputFields<TQuery, TBody, TParamNames> };

type AwaitedReturnTypeTrigger<T> = T extends (...args: never[]) => infer R
  ? Awaited<R>
  : never;

type ExtractInputFromResponse<T> = T extends { input: infer I } ? I : never;

export type TriggerOptions<T> =
  ExtractInputFromResponse<AwaitedReturnTypeTrigger<T>> extends infer I
    ? [I] extends [never]
      ? { force?: boolean }
      : ExtractTriggerQuery<I> &
          ExtractTriggerBody<I> &
          ExtractTriggerParams<I> & {
            /** Force refetch even if data is cached */
            force?: boolean;
          }
    : { force?: boolean };

export interface BaseReadResult<
  TData,
  TError,
  TPluginResult = Record<string, unknown>,
  TTriggerOptions = { force?: boolean },
> {
  data: Signal<TData | undefined>;
  error: Signal<TError | undefined>;
  loading: Signal<boolean>;
  fetching: Signal<boolean>;
  meta: Signal<TPluginResult>;
  abort: () => void;

  /**
   * Manually trigger a fetch.
   *
   * @param options - Optional override options (query, body, params) to use for this specific request
   */
  trigger: (
    options?: TTriggerOptions
  ) => Promise<SpooshResponse<TData, TError>>;
}

export type ReadApiClient<TSchema, TDefaultError> = ReadClient<
  TSchema,
  TDefaultError
>;
