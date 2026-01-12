type PrevQueryField<TQuery> = [TQuery] extends [never]
  ? object
  : { prevQuery?: TQuery };

type PrevBodyField<TBody> = [TBody] extends [never]
  ? object
  : { prevBody?: TBody };

type PrevParamsField<TParams> = [TParams] extends [never]
  ? object
  : { prevParams?: TParams };

type PrevFormDataField<TFormData> = [TFormData] extends [never]
  ? object
  : { prevFormData?: TFormData };

export type DebounceContext<
  TQuery = never,
  TBody = never,
  TParams = never,
  TFormData = never,
> = PrevQueryField<TQuery> &
  PrevBodyField<TBody> &
  PrevParamsField<TParams> &
  PrevFormDataField<TFormData>;

export type DebounceFn<
  TQuery = never,
  TBody = never,
  TParams = never,
  TFormData = never,
> = (context: DebounceContext<TQuery, TBody, TParams, TFormData>) => number;

export type DebounceValue<
  TQuery = never,
  TBody = never,
  TParams = never,
  TFormData = never,
> = number | DebounceFn<TQuery, TBody, TParams, TFormData>;

export type RequestAwareDebounceFn = DebounceValue<never, never, never, never>;

export interface DebounceReadOptions {
  /**
   * Debounce requests by X milliseconds. Waits for inactivity before fetching.
   * Can be a number or a function that returns a number based on previous request.
   */
  debounce?: RequestAwareDebounceFn;
}

export type DebounceInfiniteReadOptions = DebounceReadOptions;

export type DebounceWriteOptions = object;

export type DebounceReadResult = object;

export type DebounceWriteResult = object;

declare module "@spoosh/core" {
  interface PluginResolvers<TContext> {
    debounce:
      | DebounceValue<
          TContext["input"]["query"],
          TContext["input"]["body"],
          TContext["input"]["params"],
          TContext["input"]["formData"]
        >
      | undefined;
  }
}
