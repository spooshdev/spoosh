import type { SpooshResponse } from "../types/response.types";
import type {
  FindMatchingKey,
  ExtractData,
  ExtractQuery,
  ExtractBody,
  ExtractParamNames,
  HasParams,
} from "../types/schema.types";

type Simplify<T> = { [K in keyof T]: T[K] } & {};

type IsNever<T> = [T] extends [never] ? true : false;

type EndpointRequestOptions<TEndpoint, TPath extends string> = (IsNever<
  ExtractBody<TEndpoint>
> extends true
  ? object
  : { body: ExtractBody<TEndpoint> }) &
  (IsNever<ExtractQuery<TEndpoint>> extends true
    ? object
    : { query: ExtractQuery<TEndpoint> }) &
  (HasParams<TPath> extends true
    ? { params: Record<ExtractParamNames<TPath>, string | number> }
    : object);

type EndpointMethodFn<TEndpoint, TPath extends string> = (
  options?: Simplify<EndpointRequestOptions<TEndpoint, TPath>>
) => Promise<
  SpooshResponse<
    ExtractData<TEndpoint>,
    unknown,
    EndpointRequestOptions<TEndpoint, TPath>
  >
>;

type QueryPathMethods<TSchema, TPath extends string> =
  FindMatchingKey<TSchema, TPath> extends infer TKey
    ? TKey extends keyof TSchema
      ? "GET" extends keyof TSchema[TKey]
        ? Simplify<{ GET: EndpointMethodFn<TSchema[TKey]["GET"], TPath> }>
        : never
      : never
    : never;

type ReadPaths<TSchema> = {
  [K in keyof TSchema & string]: "GET" extends keyof TSchema[K] ? K : never;
}[keyof TSchema & string];

type HasGetMethod<TSchema, TPath extends string> =
  FindMatchingKey<TSchema, TPath> extends infer TKey
    ? TKey extends keyof TSchema
      ? "GET" extends keyof TSchema[TKey]
        ? true
        : false
      : false
    : false;

/**
 * Schema navigation helper for plugins that need type-safe API schema access.
 *
 * This type transforms the API schema into a callable function where:
 * - Path strings are used to select endpoints
 * - Only GET methods are exposed (for query operations)
 *
 * Use this in plugin option types that need to reference API endpoints:
 *
 * @example
 * ```ts
 * // Define your plugin's callback type
 * type MyCallbackFn<TSchema = unknown> = (
 *   api: QuerySchemaHelper<TSchema>
 * ) => unknown;
 *
 * // Usage in plugin options
 * interface MyPluginWriteOptions {
 *   myCallback?: MyCallbackFn<unknown>;
 * }
 *
 * // Register for schema resolution
 * declare module '@spoosh/core' {
 *   interface SchemaResolvers<TSchema> {
 *     myCallback: MyCallbackFn<TSchema> | undefined;
 *   }
 * }
 * ```
 *
 * @example
 * ```ts
 * // User's code - paths are type-checked!
 * trigger({
 *   myCallback: (api) => [
 *     api("posts").GET,           // ✓ Valid
 *     api("posts/:id").GET,       // ✓ Dynamic segment
 *     api("nonexistent").GET,     // ✗ Type error
 *   ],
 * });
 * ```
 */
export type QuerySchemaHelper<TSchema> = <
  TPath extends ReadPaths<TSchema> | (string & {}),
>(
  path: TPath
) => HasGetMethod<TSchema, TPath> extends true
  ? QueryPathMethods<TSchema, TPath>
  : never;

type MutationMethod = "POST" | "PUT" | "PATCH" | "DELETE";

type MutationPathMethods<TSchema, TPath extends string> =
  FindMatchingKey<TSchema, TPath> extends infer TKey
    ? TKey extends keyof TSchema
      ? Simplify<{
          [M in MutationMethod as M extends keyof TSchema[TKey]
            ? M
            : never]: M extends keyof TSchema[TKey]
            ? EndpointMethodFn<TSchema[TKey][M], TPath>
            : never;
        }>
      : never
    : never;

type WritePaths<TSchema> = {
  [K in keyof TSchema & string]: Extract<
    keyof TSchema[K],
    MutationMethod
  > extends never
    ? never
    : K;
}[keyof TSchema & string];

type HasMutationMethod<TSchema, TPath extends string> =
  FindMatchingKey<TSchema, TPath> extends infer TKey
    ? TKey extends keyof TSchema
      ? MutationMethod extends never
        ? false
        : Extract<keyof TSchema[TKey], MutationMethod> extends never
          ? false
          : true
      : false
    : false;

/**
 * Schema navigation helper for plugins that need type-safe API schema access for mutations.
 *
 * Similar to QuerySchemaHelper but exposes mutation methods (POST, PUT, PATCH, DELETE).
 */
export type MutationSchemaHelper<TSchema> = <
  TPath extends WritePaths<TSchema> | (string & {}),
>(
  path: TPath
) => HasMutationMethod<TSchema, TPath> extends true
  ? MutationPathMethods<TSchema, TPath>
  : never;
