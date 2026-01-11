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

/**
 * Marker type for debounce function that will be resolved with request types.
 * Uses `never` for all generics so the resolved type can be any specific type.
 */
export type RequestAwareDebounceFn = DebounceValue<never, never, never, never>;

export interface DebounceReadOptions {
  /**
   * Debounce requests by X milliseconds. Waits for inactivity before fetching.
   * Can be a number or a function that returns a number based on previous request.
   *
   * The function receives only `prev*` fields (prevQuery, prevBody, prevParams, prevFormData)
   * based on what's defined in your endpoint. Current values come from your React state.
   *
   * @example
   * // Fixed debounce
   * { debounce: 300 }
   *
   * // Conditional debounce - compare with previous query
   * { debounce: ({ prevQuery }) => prevQuery?.q !== searchTerm ? 300 : 0 }
   */
  debounce?: RequestAwareDebounceFn;
}

export type DebounceInfiniteReadOptions = DebounceReadOptions;
export type DebounceWriteOptions = object;
export type DebounceReadResult = object;
export type DebounceWriteResult = object;
