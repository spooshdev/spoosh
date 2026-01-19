import type { Endpoint } from "@spoosh/core";
import type { ClientRequest } from "hono/client";

type Simplify<T> = { [K in keyof T]: T[K] } & {};

type IsNever<T> = [T] extends [never] ? true : false;

type HonoSchemaMethod = "$get" | "$post" | "$put" | "$patch" | "$delete";

type ExtractClientOutput<T> = T extends { output: infer O } ? O : never;

type ExtractClientBody<T> = T extends { input: { json: infer B } }
  ? IsNever<B> extends true
    ? never
    : B
  : never;

type ExtractClientQuery<T> = T extends { input: { query: infer Q } }
  ? IsNever<Q> extends true
    ? never
    : Q
  : never;

type ExtractClientFormData<T> = T extends { input: { form: infer F } }
  ? IsNever<F> extends true
    ? never
    : F
  : never;

type BodyField<T> =
  IsNever<ExtractClientBody<T>> extends true
    ? object
    : { body: ExtractClientBody<T> };

type QueryField<T> =
  IsNever<ExtractClientQuery<T>> extends true
    ? object
    : { query: ExtractClientQuery<T> };

type FormDataField<T> =
  IsNever<ExtractClientFormData<T>> extends true
    ? object
    : { formData: ExtractClientFormData<T> };

type ClientEndpointToSpoosh<T> = Endpoint<
  Simplify<
    { data: ExtractClientOutput<T> } & BodyField<T> &
      QueryField<T> &
      FormDataField<T>
  >
>;

// Extract endpoint schema from hc client method function signature
type ExtractEndpointFromClientMethod<T> = T extends (
  args: infer Input,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  options?: any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
) => Promise<any>
  ? {
      input: Input;
      output: Awaited<ReturnType<T>> extends { json(): Promise<infer O> }
        ? O
        : never;
    }
  : T extends { output: unknown }
    ? T
    : never;

type TransformClientMethods<T> = {
  [K in keyof T as K extends HonoSchemaMethod
    ? K
    : never]: ClientEndpointToSpoosh<ExtractEndpointFromClientMethod<T[K]>>;
};

// Transform `:paramName` keys to `_` for Spoosh compatibility
type TransformClientKey<K> = K extends `:${string}` ? "_" : K;

// Extract schema from ClientRequest (handles intersection of ClientRequest & nested routes)
type ExtractClientSchema<T> =
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  T extends ClientRequest<any, any, infer S> ? S : never;

// Check if T has HTTP method keys (either from ClientRequest or direct function methods)
type HasMethodKey<T, K extends HonoSchemaMethod> = K extends keyof T
  ? true
  : false;

type HasAnyMethod<T> =
  | HasMethodKey<T, "$get">
  | HasMethodKey<T, "$post">
  | HasMethodKey<T, "$put">
  | HasMethodKey<T, "$patch">
  | HasMethodKey<T, "$delete"> extends false
  ? false
  : true;

// Check if T has ClientRequest methods OR direct function methods
type HasClientMethods<T> =
  ExtractClientSchema<T> extends never ? HasAnyMethod<T> : true;

// Get methods either from ClientRequest schema or directly from T
type GetMethodSchema<T> =
  ExtractClientSchema<T> extends never ? T : ExtractClientSchema<T>;

// Get only non-method nested properties (not $get, $post, etc. and not $url)
type NonMethodKeys<T> = {
  [K in keyof T]: K extends HonoSchemaMethod | "$url" ? never : K;
}[keyof T];

// Transform: extract methods from ClientRequest AND recursively transform nested routes
type TransformClientRequest<T> = (HasClientMethods<T> extends true
  ? TransformClientMethods<GetMethodSchema<T>>
  : object) &
  (NonMethodKeys<T> extends never
    ? object
    : {
        [K in NonMethodKeys<T> as TransformClientKey<K>]: TransformClientRequest<
          T[K]
        >;
      });

type FlattenIndex<T> = T extends { index: infer I } ? Omit<T, "index"> & I : T;

/**
 * Transforms `hc` client type into Spoosh schema format.
 *
 * @example
 * ```typescript
 * import { hc } from 'hono/client';
 * import type { HonoToSpoosh } from '@spoosh/hono';
 * import type { AppType } from './server';
 *
 * type Client = ReturnType<typeof hc<AppType>>;
 * type ApiSchema = HonoToSpoosh<Client>['api'];
 * ```
 */
export type HonoToSpoosh<T> = Simplify<TransformClientRequest<T>>;

/**
 * Transforms a sub-client (single route group) into Spoosh schema format.
 * Use this for the split-app pattern to avoid TS2589 errors in large apps.
 *
 * @example
 * ```typescript
 * import { hc } from 'hono/client';
 * import type { HonoRouteToSpoosh } from '@spoosh/hono';
 *
 * // Split by route group to avoid TS2589
 * import type { usersRoutes } from './routes/users';
 * import type { postsRoutes } from './routes/posts';
 *
 * export type APISchema = {
 *   users: HonoRouteToSpoosh<ReturnType<typeof hc<typeof usersRoutes>>>;
 *   posts: HonoRouteToSpoosh<ReturnType<typeof hc<typeof postsRoutes>>>;
 * };
 *
 * // Usage: api.users.$get(), api.posts.$post(), etc.
 * ```
 */
export type HonoRouteToSpoosh<T> = FlattenIndex<HonoToSpoosh<T>>;
