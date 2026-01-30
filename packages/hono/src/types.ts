import type { ClientRequest } from "hono/client";
import type { Simplify } from "@spoosh/core";

type IsNever<T> = [T] extends [never] ? true : false;

type HonoSchemaMethod = "$get" | "$post" | "$put" | "$patch" | "$delete";

type HonoToHttpMethod<T extends string> = T extends "$get"
  ? "GET"
  : T extends "$post"
    ? "POST"
    : T extends "$put"
      ? "PUT"
      : T extends "$patch"
        ? "PATCH"
        : T extends "$delete"
          ? "DELETE"
          : never;

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

type ClientEndpointToSpoosh<T> = Simplify<
  { data: ExtractClientOutput<T> } & BodyField<T> &
    QueryField<T> &
    FormDataField<T>
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

// Extract schema from ClientRequest (handles intersection of ClientRequest & nested routes)
type ExtractClientSchema<T> =
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  T extends ClientRequest<any, any, infer S> ? S : never;

// Check if T has any HTTP method keys
type HasAnyMethod<T> = keyof T & HonoSchemaMethod extends never ? false : true;

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

// Transform methods to Spoosh format
type TransformMethods<T> = {
  [K in keyof T as K extends HonoSchemaMethod
    ? HonoToHttpMethod<K>
    : never]: ClientEndpointToSpoosh<ExtractEndpointFromClientMethod<T[K]>>;
};

// Join path segments
type JoinPath<A extends string, B extends string> = A extends ""
  ? B
  : `${A}/${B}`;

// Transform param key `:id` to `:id` (keep as is for path-based schema)
type TransformParamKey<K extends string> = K extends `:${infer P}`
  ? `:${P}`
  : K;

// Union to intersection helper
type UnionToIntersection<U> = (
  U extends unknown ? (k: U) => void : never
) extends (k: infer I) => void
  ? I
  : never;

// Recursively flatten Hono client to path-based schema
type FlattenHonoClient<T, Path extends string = ""> =
  // Add current path's methods if it has any
  (HasClientMethods<T> extends true
    ? { [P in Path]: TransformMethods<GetMethodSchema<T>> }
    : object) &
    // Recursively process nested routes
    (NonMethodKeys<T> extends never
      ? object
      : UnionToIntersection<
          {
            [K in NonMethodKeys<T>]: K extends "index"
              ? FlattenHonoClient<T[K], Path>
              : K extends string
                ? FlattenHonoClient<T[K], JoinPath<Path, TransformParamKey<K>>>
                : never;
          }[NonMethodKeys<T>]
        >);

// Clean up empty string key to use "/" or remove it
type CleanupRootPath<T> = {
  [K in keyof T as K extends "" ? "/" : K]: T[K];
};

/**
 * Transforms `hc` client type into Spoosh flat schema format.
 *
 * @example
 * ```typescript
 * import { hc } from 'hono/client';
 * import type { HonoToSpoosh } from '@spoosh/hono';
 * import type { AppType } from './server';
 *
 * type Client = ReturnType<typeof hc<AppType>>;
 * type ApiSchema = HonoToSpoosh<Client>;
 *
 * const api = createClient<ApiSchema>({ baseUrl: "/api" });
 * await api("posts").GET();
 * await api("posts/:id").GET({ params: { id: "123" } });
 * ```
 */
export type HonoToSpoosh<T> = Simplify<CleanupRootPath<FlattenHonoClient<T>>>;
