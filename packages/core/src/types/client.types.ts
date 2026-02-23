/* eslint-disable @typescript-eslint/no-empty-object-type */
import type { SpooshResponse } from "./response.types";
import type {
  ExtractData,
  ExtractError,
  FindMatchingKey,
  ExtractParamNames,
  HasParams,
  ReadPaths,
  WritePaths,
  HasReadMethod,
  HasWriteMethod,
  SubscriptionPaths,
  HasSubscriptionMethod,
} from "./schema.types";
import type { HttpMethod, WriteMethod } from "./common.types";
import type { Simplify } from "./common.types";
import type { HeadersInitOrGetter } from "./request.types";
import type { SpooshBody } from "../utils/body";
import type { SpooshTransportRegistry } from "../transport/subscription";

/**
 * Base request options available on all methods.
 */
type BaseRequestOptions = {
  headers?: HeadersInitOrGetter;
  signal?: AbortSignal;
};

/**
 * Extract body type from method config.
 */
type ExtractBody<T> = T extends { body?: infer B } ? B : never;

/**
 * Extract query type from method config.
 */
type ExtractQuery<T> = T extends { query?: infer Q } ? Q : never;

/**
 * Check if body is required (not optional).
 */
type IsBodyRequired<T> = T extends { body: infer B }
  ? undefined extends B
    ? false
    : true
  : false;

/**
 * Check if query is required (not optional).
 */
type IsQueryRequired<T> = T extends { query: infer Q }
  ? undefined extends Q
    ? false
    : true
  : false;

/**
 * Build the options type for a method.
 */
type BodyOption<T> = [ExtractBody<T>] extends [never]
  ? {}
  : IsBodyRequired<T> extends true
    ? { body: ExtractBody<T> | SpooshBody<ExtractBody<T>> }
    : { body?: ExtractBody<T> | SpooshBody<ExtractBody<T>> };

type QueryOption<T> = [ExtractQuery<T>] extends [never]
  ? {}
  : IsQueryRequired<T> extends true
    ? { query: ExtractQuery<T> }
    : { query?: ExtractQuery<T> };

type ParamsOption<TUserPath extends string> =
  HasParams<TUserPath> extends true
    ? { params: Record<ExtractParamNames<TUserPath>, string | number> }
    : {};

type RequestOptions<TMethodConfig, TUserPath extends string> = Simplify<
  BaseRequestOptions &
    BodyOption<TMethodConfig> &
    QueryOption<TMethodConfig> &
    ParamsOption<TUserPath>
>;

/**
 * Check if options argument is required.
 */
type IsOptionsRequired<TMethodConfig, TUserPath extends string> =
  IsBodyRequired<TMethodConfig> extends true
    ? true
    : IsQueryRequired<TMethodConfig> extends true
      ? true
      : HasParams<TUserPath> extends true
        ? true
        : false;

/**
 * Build response type for a method call.
 */
type MethodResponse<
  TMethodConfig,
  TDefaultError,
  TUserPath extends string,
> = SpooshResponse<
  ExtractData<TMethodConfig>,
  ExtractError<TMethodConfig, TDefaultError>,
  RequestOptions<TMethodConfig, TUserPath>,
  ExtractQuery<TMethodConfig>,
  ExtractBody<TMethodConfig>,
  ExtractParamNames<TUserPath>
>;

/**
 * Create a method function type.
 * Direct lookup: Schema[Path][Method] → method config → build function type
 */
type MethodFn<TMethodConfig, TDefaultError, TUserPath extends string> =
  IsOptionsRequired<TMethodConfig, TUserPath> extends true
    ? (
        options: RequestOptions<TMethodConfig, TUserPath>
      ) => Promise<MethodResponse<TMethodConfig, TDefaultError, TUserPath>>
    : (
        options?: RequestOptions<TMethodConfig, TUserPath>
      ) => Promise<MethodResponse<TMethodConfig, TDefaultError, TUserPath>>;

/**
 * HTTP methods available on a path.
 * Direct lookup: Schema[Path] → route config → map methods
 */
type HttpMethods<TRoute, TDefaultError, TUserPath extends string> = {
  [M in HttpMethod as M extends keyof TRoute
    ? M
    : never]: M extends keyof TRoute
    ? MethodFn<TRoute[M], TDefaultError, TUserPath>
    : never;
};

/**
 * Build the return type when calling a client with a path.
 * Uses FindMatchingKey for pattern matching (e.g., "posts/123" → "posts/:id")
 */
type PathMethods<TSchema, TPath extends string, TDefaultError> =
  FindMatchingKey<TSchema, TPath> extends infer TKey
    ? TKey extends keyof TSchema
      ? Simplify<HttpMethods<TSchema[TKey], TDefaultError, TPath>>
      : never
    : never;

/**
 * Extract all valid paths from a schema (for autocomplete).
 */
export type SchemaPaths<TSchema> = keyof TSchema & string;

/**
 * An API interface that uses path strings instead of chained property access.
 * Methods use HTTP names directly: GET, POST, PUT, PATCH, DELETE.
 *
 * @example
 * ```ts
 * type ApiSchema = {
 *   "posts": { GET: { data: Post[] } };
 *   "posts/:id": { GET: { data: Post } };
 * };
 *
 * const api = createClient<ApiSchema>({ baseUrl: "/api" });
 *
 * // Call with exact path (autocomplete available)
 * await api("posts").GET();
 *
 * // Call with embedded params (matches "posts/:id")
 * await api("posts/123").GET();
 *
 * // Call with explicit params
 * await api("posts/:id").GET({ params: { id: 123 } });
 * ```
 */
export type SpooshClient<TSchema, TDefaultError = unknown> = <
  TPath extends SchemaPaths<TSchema> | (string & {}),
>(
  path: TPath
) => PathMethods<TSchema, TPath, TDefaultError>;

/**
 * Read-only client type that only exposes GET methods.
 * Used by useRead/injectRead hooks to ensure only query operations are selected.
 */
type ReadPathMethods<TSchema, TPath extends string, TDefaultError> =
  FindMatchingKey<TSchema, TPath> extends infer TKey
    ? TKey extends keyof TSchema
      ? "GET" extends keyof TSchema[TKey]
        ? Simplify<{
            GET: MethodFn<TSchema[TKey]["GET"], TDefaultError, TPath>;
          }>
        : never
      : never
    : never;

/**
 * A read-only API interface that only exposes GET methods.
 * Used by useRead and injectRead hooks.
 */
export type ReadClient<TSchema, TDefaultError = unknown> = <
  TPath extends ReadPaths<TSchema> | (string & {}),
>(
  path: TPath
) => HasReadMethod<TSchema, TPath> extends true
  ? ReadPathMethods<TSchema, TPath, TDefaultError>
  : never;

/**
 * Write-only client type that only exposes mutation methods (POST, PUT, PATCH, DELETE).
 * Used by useWrite/injectWrite hooks to ensure only mutation operations are selected.
 */
type WritePathMethods<TSchema, TPath extends string, TDefaultError> =
  FindMatchingKey<TSchema, TPath> extends infer TKey
    ? TKey extends keyof TSchema
      ? Simplify<{
          [M in WriteMethod as M extends keyof TSchema[TKey]
            ? M
            : never]: M extends keyof TSchema[TKey]
            ? MethodFn<TSchema[TKey][M], TDefaultError, TPath>
            : never;
        }>
      : never
    : never;

/**
 * A write-only API interface that only exposes mutation methods (POST, PUT, PATCH, DELETE).
 * Used by useWrite and injectWrite hooks.
 */
export type WriteClient<TSchema, TDefaultError = unknown> = <
  TPath extends WritePaths<TSchema> | (string & {}),
>(
  path: TPath
) => HasWriteMethod<TSchema, TPath> extends true
  ? WritePathMethods<TSchema, TPath, TDefaultError>
  : never;

/**
 * Method function type for write selectors - accepts no arguments.
 * All input (body, query, params) is passed to trigger() instead.
 */
type WriteSelectorMethodFn<
  TMethodConfig,
  TDefaultError,
  TUserPath extends string,
> = () => Promise<MethodResponse<TMethodConfig, TDefaultError, TUserPath>>;

/**
 * Write selector path methods - methods accept no arguments.
 */
type WriteSelectorPathMethods<TSchema, TPath extends string, TDefaultError> =
  FindMatchingKey<TSchema, TPath> extends infer TKey
    ? TKey extends keyof TSchema
      ? Simplify<{
          [M in WriteMethod as M extends keyof TSchema[TKey]
            ? M
            : never]: M extends keyof TSchema[TKey]
            ? WriteSelectorMethodFn<TSchema[TKey][M], TDefaultError, TPath>
            : never;
        }>
      : never
    : never;

/**
 * Write selector client - methods accept no arguments.
 * Used by useWrite for selecting endpoints. All input goes to trigger().
 */
export type WriteSelectorClient<TSchema, TDefaultError = unknown> = <
  TPath extends WritePaths<TSchema> | (string & {}),
>(
  path: TPath
) => HasWriteMethod<TSchema, TPath> extends true
  ? WriteSelectorPathMethods<TSchema, TPath, TDefaultError>
  : never;

/**
 * Method function type for queue selectors - accepts no arguments.
 * All input (body, query, params) is passed to trigger() instead.
 */
type QueueSelectorMethodFn<
  TMethodConfig,
  TDefaultError,
  TUserPath extends string,
> = () => Promise<MethodResponse<TMethodConfig, TDefaultError, TUserPath>>;

/**
 * Queue selector path methods - all HTTP methods, accepting no arguments.
 */
type QueueSelectorPathMethods<TSchema, TPath extends string, TDefaultError> =
  FindMatchingKey<TSchema, TPath> extends infer TKey
    ? TKey extends keyof TSchema
      ? Simplify<{
          [M in HttpMethod as M extends keyof TSchema[TKey]
            ? M
            : never]: M extends keyof TSchema[TKey]
            ? QueueSelectorMethodFn<TSchema[TKey][M], TDefaultError, TPath>
            : never;
        }>
      : never
    : never;

/**
 * Queue selector client - all HTTP methods, accepting no arguments.
 * Used by useQueue for selecting endpoints. All input goes to trigger().
 */
export type QueueSelectorClient<TSchema, TDefaultError = unknown> = <
  TPath extends SchemaPaths<TSchema> | (string & {}),
>(
  path: TPath
) => QueueSelectorPathMethods<TSchema, TPath, TDefaultError>;

/**
 * Extract events type from a method config.
 */
type ExtractEvents<T> = T extends { events: infer E } ? E : never;

/**
 * Extract event data type from an event config.
 * Generic utility for transports that stream events.
 */
type ExtractEventData<T> = T extends { data: infer D } ? D : unknown;

/**
 * Extract transport name from path (e.g., "@sse/channel" → "sse")
 */
type ExtractTransportName<TPath extends string> =
  TPath extends `@${infer Transport}/${string}` ? Transport : never;

/**
 * Typed parse config for streaming transports.
 * Generic utility - opt-in for transports that support event parsing.
 */
export type TypedParseConfig<TEvents> =
  TEvents extends Record<string, unknown>
    ?
        | {
            [K in keyof TEvents]?:
              | "auto"
              | "json-done"
              | "json"
              | "text"
              | "number"
              | "boolean"
              | ((data: string) => ExtractEventData<TEvents[K]>);
          }
        | "auto"
        | "json-done"
        | "json"
        | "text"
        | "number"
        | "boolean"
        | ((data: string) => unknown)
    : never;

/**
 * Typed accumulate config for streaming transports.
 * Generic utility - opt-in for transports that support event accumulation.
 */
export type TypedAccumulateConfig<TEvents> =
  TEvents extends Record<string, unknown>
    ?
        | {
            [K in keyof TEvents]?:
              | "replace"
              | "concat"
              | "merge"
              | ((
                  prev: ExtractEventData<TEvents[K]> | undefined,
                  current: ExtractEventData<TEvents[K]>
                ) => ExtractEventData<TEvents[K]>);
          }
        | "replace"
        | "concat"
        | "merge"
        | ((prev: unknown, current: unknown) => unknown)
    : never;

/**
 * Get transport options from registry with event-specific types.
 * Base options from registry + event-typed utilities (parse/accumulate).
 */
type TransportOptions<
  TTransport extends string,
  TEvents = never,
> = TTransport extends keyof SpooshTransportRegistry
  ? Omit<
      SpooshTransportRegistry[TTransport] extends { options: infer O } ? O : {},
      "parse" | "accumulate"
    > & {
      parse?: TypedParseConfig<TEvents>;
      accumulate?: TypedAccumulateConfig<TEvents>;
    }
  : {};

/**
 * Strict subscription request options (for GET method).
 * Body/query are required if schema requires them.
 */
type StrictSubscriptionRequestOptions<
  TMethodConfig,
  TUserPath extends string,
  TRequestedEvents extends readonly (keyof ExtractEvents<TMethodConfig>)[] =
    readonly (keyof ExtractEvents<TMethodConfig>)[],
> = Simplify<
  BaseRequestOptions &
    QueryOption<TMethodConfig> &
    BodyOption<TMethodConfig> &
    ParamsOption<TUserPath> &
    TransportOptions<
      ExtractTransportName<TUserPath>,
      ExtractEvents<TMethodConfig>
    > & {
      events?: TRequestedEvents;
    }
>;

/**
 * Loose subscription request options (for POST/PUT/etc methods).
 * Body/query are always optional since they're provided via trigger().
 */
type LooseSubscriptionRequestOptions<
  TMethodConfig,
  TUserPath extends string,
  TRequestedEvents extends readonly (keyof ExtractEvents<TMethodConfig>)[] =
    readonly (keyof ExtractEvents<TMethodConfig>)[],
> = Simplify<
  BaseRequestOptions & { query?: ExtractQuery<TMethodConfig> } & {
    body?: ExtractBody<TMethodConfig> | SpooshBody<ExtractBody<TMethodConfig>>;
  } & ParamsOption<TUserPath> &
    TransportOptions<
      ExtractTransportName<TUserPath>,
      ExtractEvents<TMethodConfig>
    > & {
      events?: TRequestedEvents;
    }
>;

/**
 * Check if strict subscription options are required (for GET method).
 */
type IsStrictSubscriptionOptionsRequired<
  TMethodConfig,
  TUserPath extends string,
> =
  IsBodyRequired<TMethodConfig> extends true
    ? true
    : IsQueryRequired<TMethodConfig> extends true
      ? true
      : HasParams<TUserPath> extends true
        ? true
        : false;

/**
 * Subscription response type that carries event types.
 */
type SubscriptionResponse<
  TMethodConfig,
  TRequestedEvents extends readonly (keyof ExtractEvents<TMethodConfig>)[] =
    readonly (keyof ExtractEvents<TMethodConfig>)[],
> = {
  _subscription: true;
  events: ExtractEvents<TMethodConfig>;
  requestedEvents: TRequestedEvents;
  query: ExtractQuery<TMethodConfig>;
  body: ExtractBody<TMethodConfig>;
};

/**
 * Subscription method function type - methods with events field.
 * GET: Strict typing (body/query required if schema requires)
 * POST/PUT/etc: Loose typing (body/query always optional, passed to trigger)
 */
type SubscriptionMethodFn<
  TMethodConfig,
  TUserPath extends string,
  TMethod extends string,
> = TMethod extends "GET"
  ? // GET method: Strict - require body/query if schema requires
    IsStrictSubscriptionOptionsRequired<TMethodConfig, TUserPath> extends true
    ? <
        TRequestedEvents extends
          readonly (keyof ExtractEvents<TMethodConfig>)[],
      >(
        options: StrictSubscriptionRequestOptions<
          TMethodConfig,
          TUserPath,
          TRequestedEvents
        >
      ) => SubscriptionResponse<TMethodConfig, TRequestedEvents>
    : <
        TRequestedEvents extends
          readonly (keyof ExtractEvents<TMethodConfig>)[],
      >(
        options?: StrictSubscriptionRequestOptions<
          TMethodConfig,
          TUserPath,
          TRequestedEvents
        >
      ) => SubscriptionResponse<TMethodConfig, TRequestedEvents>
  : // POST/PUT/etc methods: Loose - always optional
    <TRequestedEvents extends readonly (keyof ExtractEvents<TMethodConfig>)[]>(
      options?: LooseSubscriptionRequestOptions<
        TMethodConfig,
        TUserPath,
        TRequestedEvents
      >
    ) => SubscriptionResponse<TMethodConfig, TRequestedEvents>;

/**
 * Subscription path methods - only methods with events field.
 */
type SubscriptionPathMethods<TSchema, TPath extends string> =
  FindMatchingKey<TSchema, TPath> extends infer TKey
    ? TKey extends keyof TSchema
      ? Simplify<{
          [M in HttpMethod as M extends keyof TSchema[TKey]
            ? TSchema[TKey][M] extends { events: unknown }
              ? M
              : never
            : never]: M extends keyof TSchema[TKey]
            ? SubscriptionMethodFn<TSchema[TKey][M], TPath, M>
            : never;
        }>
      : never
    : never;

/**
 * A subscription API interface that only exposes methods with events field.
 * Used by useSubscription hook for real-time data streams.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export type SubscriptionClient<TSchema, TDefaultError = unknown> = <
  TPath extends SubscriptionPaths<TSchema> | (string & {}),
>(
  path: TPath
) => HasSubscriptionMethod<TSchema, TPath> extends true
  ? SubscriptionPathMethods<TSchema, TPath>
  : never;
