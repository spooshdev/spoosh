type PrevQueryField<TQuery> = [TQuery] extends [never]
  ? object
  : { prevQuery?: TQuery };

type PrevParamsField<TParams> = [TParams] extends [never]
  ? object
  : { prevParams?: TParams };

export type DebounceContext<
  TQuery = never,
  TParams = never,
> = PrevQueryField<TQuery> & PrevParamsField<TParams>;

export type DebounceFn<TQuery = never, TParams = never> = (
  context: DebounceContext<TQuery, TParams>
) => number;

export type DebounceValue<TQuery = never, TParams = never> =
  | number
  | DebounceFn<TQuery, TParams>;

export type RequestAwareDebounceFn = DebounceValue<never, never>;

export interface DebounceReadOptions {
  /**
   * Debounce requests by X milliseconds. Waits for inactivity before fetching.
   * Can be a number or a function that returns a number based on previous request.
   */
  debounce?: RequestAwareDebounceFn;
}

export type DebounceWriteOptions = object;

export type DebounceReadResult = object;

export type DebounceWriteResult = object;

declare module "@spoosh/core" {
  interface PluginResolvers<TContext> {
    debounce:
      | DebounceValue<TContext["input"]["query"], TContext["input"]["params"]>
      | undefined;
  }
}
