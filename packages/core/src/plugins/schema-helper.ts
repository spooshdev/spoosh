import type { EnlaceResponse } from "../types/response.types";
import type { SchemaMethod } from "../types/common.types";
import type { HasQueryMethods } from "../types/filtered-client.types";

type ExtractEndpointData<T> = T extends { data: infer D }
  ? D
  : T extends void
    ? void
    : T;

type ExtractEndpointRequestOptions<T> = {
  [K in Extract<keyof T, "query" | "body" | "params">]?: T[K];
};

type EndpointToMethod<T> = (
  options?: ExtractEndpointRequestOptions<T>
) => Promise<
  EnlaceResponse<
    ExtractEndpointData<T>,
    unknown,
    ExtractEndpointRequestOptions<T>
  >
>;

/**
 * Schema navigation helper for plugins that need type-safe API schema access.
 *
 * This type transforms the API schema into a navigable structure where:
 * - Static path segments become nested properties
 * - Dynamic segments (`_`) become index signatures
 * - `$get` endpoints become callable method types
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
 * declare module 'enlace' {
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
 *     api.posts.$get,           // ✓ Valid
 *     api.users[1].$get,        // ✓ Dynamic segment
 *     api.nonexistent.$get,     // ✗ Type error
 *   ],
 * });
 * ```
 */
export type QuerySchemaHelper<TSchema> = {
  [K in keyof TSchema as K extends SchemaMethod | "_"
    ? never
    : HasQueryMethods<TSchema[K]> extends true
      ? K
      : never]: K extends keyof TSchema ? QuerySchemaHelper<TSchema[K]> : never;
} & {
  [K in "$get" as K extends keyof TSchema ? K : never]: K extends keyof TSchema
    ? EndpointToMethod<TSchema[K]>
    : never;
} & (TSchema extends { _: infer D }
    ? HasQueryMethods<D> extends true
      ? {
          /**
           * Dynamic path segment placeholder for routes like `/posts/:id`.
           *
           * @example
           * ```ts
           * // In plugin callback - reference the endpoint
           * myCallback: (api) => api.posts._.$get
           * ```
           */
          _: QuerySchemaHelper<D>;
          [key: string]: QuerySchemaHelper<D>;
          [key: number]: QuerySchemaHelper<D>;
        }
      : object
    : object);
