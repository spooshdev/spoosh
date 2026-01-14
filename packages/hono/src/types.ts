import type { Endpoint } from "@spoosh/core";
import type { Hono } from "hono";
import type { HonoBase } from "hono/hono-base";

type IsNever<T> = [T] extends [never] ? true : false;

type HonoSchemaMethod = "$get" | "$post" | "$put" | "$patch" | "$delete";

type ExtractHonoOutput<T> = T extends { output: infer O } ? O : never;

type ExtractHonoBody<T> = T extends { input: { json: infer B } }
  ? IsNever<B> extends true
    ? never
    : B
  : never;

type ExtractHonoQuery<T> = T extends { input: { query: infer Q } }
  ? IsNever<Q> extends true
    ? never
    : Q
  : never;

type ExtractHonoFormData<T> = T extends { input: { form: infer F } }
  ? IsNever<F> extends true
    ? never
    : F
  : never;

type BodyField<T> =
  IsNever<ExtractHonoBody<T>> extends true
    ? object
    : { body: ExtractHonoBody<T> };

type QueryField<T> =
  IsNever<ExtractHonoQuery<T>> extends true
    ? object
    : { query: ExtractHonoQuery<T> };

type FormDataField<T> =
  IsNever<ExtractHonoFormData<T>> extends true
    ? object
    : { formData: ExtractHonoFormData<T> };

type HonoEndpointToSpoosh<T> = Endpoint<
  { data: ExtractHonoOutput<T> } & BodyField<T> &
    QueryField<T> &
    FormDataField<T>
>;

type TransformMethods<T> = {
  [K in keyof T as K extends HonoSchemaMethod
    ? K
    : never]: HonoEndpointToSpoosh<T[K]>;
};

type TransformSegment<S extends string> = S extends `:${string}` ? "_" : S;

type PathToSpoosh<
  Path extends string,
  S,
  Original extends string = Path,
> = Path extends `/${infer P}`
  ? PathToSpoosh<P, S, Original>
  : Path extends `${infer Head}/${infer Rest}`
    ? {
        [K in TransformSegment<Head>]: PathToSpoosh<Rest, S, Original>;
      }
    : {
        [K in TransformSegment<
          Path extends "" ? "index" : Path
        >]: TransformMethods<S extends Record<Original, infer V> ? V : never>;
      };

type UnionToIntersection<U> = (
  U extends unknown ? (k: U) => void : never
) extends (k: infer I) => void
  ? I
  : unknown;

// Extract schema from HonoBase (4 type params) or Hono (3 type params)

type ExtractSchemaFromHono<T> =
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  T extends HonoBase<any, infer S, any, any>
    ? S
    : // eslint-disable-next-line @typescript-eslint/no-explicit-any
      T extends Hono<any, infer S, any>
      ? S
      : never;

type SchemaToSpoosh<S> =
  S extends Record<infer K, unknown>
    ? K extends string
      ? PathToSpoosh<K, S>
      : never
    : never;

/**
 * Transforms Hono's AppType (from `typeof app`) into Spoosh's ApiSchema format.
 *
 * @example
 * ```typescript
 * // Server (Hono)
 * const app = new Hono()
 *   .basePath('/api')
 *   .get('/posts', (c) => c.json([{ id: 1, title: 'Hello' }]))
 *   .post('/posts', zValidator('json', schema), (c) => c.json({ id: 1 }))
 *   .get('/posts/:id', (c) => c.json({ id: c.req.param('id') }));
 *
 * export type AppType = typeof app;
 *
 * // Client (Spoosh)
 * import type { HonoToSpoosh } from '@spoosh/hono';
 * type ApiSchema = HonoToSpoosh<AppType>;
 *
 * const client = spoosh<ApiSchema['api']>('http://localhost:3000/api');
 * const posts = await client.posts.get();       // typed as { id, title }[]
 * const post = await client.posts['123'].get(); // typed as { id }
 * ```
 */
export type HonoToSpoosh<T> = UnionToIntersection<
  SchemaToSpoosh<ExtractSchemaFromHono<T>>
>;
