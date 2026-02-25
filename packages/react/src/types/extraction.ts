type SuccessResponse<T> = Extract<T, { data: unknown; error?: undefined }>;

type ErrorResponse<T> = Extract<T, { error: unknown; data?: undefined }>;

export type ExtractMethodData<T> = T extends (...args: never[]) => infer R
  ? SuccessResponse<Awaited<R>> extends { data: infer D }
    ? D
    : unknown
  : unknown;

export type ExtractMethodError<T> = T extends (...args: never[]) => infer R
  ? ErrorResponse<Awaited<R>> extends { error: infer E }
    ? E
    : unknown
  : unknown;

export type ExtractMethodOptions<T> = T extends (...args: infer A) => unknown
  ? A[0]
  : never;

export type ExtractCoreMethodOptions<T> = T extends (
  ...args: infer A
) => unknown
  ? A[0] extends object
    ? Pick<A[0], Extract<keyof A[0], "query" | "params" | "body">>
    : object
  : object;

type AwaitedReturnType<T> = T extends (...args: never[]) => infer R
  ? Awaited<R>
  : never;

type SuccessReturnType<T> = SuccessResponse<AwaitedReturnType<T>>;

type ExtractSuccessInput<T> =
  SuccessResponse<AwaitedReturnType<T>> extends {
    input?: infer I;
  }
    ? I
    : object;

export type ExtractResponseRequestOptions<T> = ExtractSuccessInput<T>;

export type ExtractMethodQuery<T> =
  ExtractMethodOptions<T> extends {
    query: infer Q;
  }
    ? Q
    : never;

export type ExtractMethodBody<T> =
  ExtractMethodOptions<T> extends {
    body: infer B;
  }
    ? B
    : never;

export type ExtractResponseQuery<T> =
  SuccessReturnType<T> extends {
    input: { query: infer Q };
  }
    ? Q
    : never;

export type ExtractResponseBody<T> =
  SuccessReturnType<T> extends {
    input: { body: infer B };
  }
    ? B
    : never;

export type ExtractResponseParamNames<T> =
  SuccessReturnType<T> extends { input: { params: Record<infer K, unknown> } }
    ? K extends string
      ? K
      : never
    : never;

type SubscriptionReturnType<T> = T extends (...args: never[]) => infer R
  ? R
  : never;

export type ExtractSubscriptionEvents<T> =
  SubscriptionReturnType<T> extends {
    events: infer E;
    requestedEvents: infer RequestedEvents;
  }
    ? RequestedEvents extends readonly (keyof E)[]
      ? E extends Record<string, unknown>
        ? {
            [K in RequestedEvents[number]]: E[K] extends {
              data: infer EventData;
            }
              ? EventData
              : unknown;
          }
        : unknown
      : unknown
    : unknown;

export type ExtractSubscriptionQuery<T> =
  SubscriptionReturnType<T> extends {
    query: infer Q;
  }
    ? Q
    : never;

export type ExtractSubscriptionBody<T> =
  SubscriptionReturnType<T> extends {
    body: infer B;
  }
    ? B
    : never;

export type ExtractAllSubscriptionEventKeys<T> =
  SubscriptionReturnType<T> extends {
    events: infer E;
  }
    ? E extends Record<string, unknown>
      ? keyof E
      : never
    : never;

export type ExtractAllSubscriptionEvents<T> =
  SubscriptionReturnType<T> extends {
    events: infer E;
  }
    ? E extends Record<string, unknown>
      ? {
          [K in keyof E]: E[K] extends { data: infer EventData }
            ? EventData
            : unknown;
        }
      : unknown
    : unknown;

export type ExtractSubscriptionError<T> =
  SubscriptionReturnType<T> extends {
    error: infer E;
  }
    ? E
    : unknown;
