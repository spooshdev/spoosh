import type {
  Endpoint,
  EndpointWithQuery,
  EndpointWithFormData,
  EndpointFull,
} from "enlace-core";
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

type HonoEndpointToEnlace<T> =
  IsNever<ExtractHonoFormData<T>> extends false
    ? EndpointWithFormData<ExtractHonoOutput<T>, ExtractHonoFormData<T>>
    : IsNever<ExtractHonoQuery<T>> extends false
      ? IsNever<ExtractHonoBody<T>> extends false
        ? EndpointFull<{
            data: ExtractHonoOutput<T>;
            body: ExtractHonoBody<T>;
            query: ExtractHonoQuery<T>;
          }>
        : EndpointWithQuery<ExtractHonoOutput<T>, ExtractHonoQuery<T>>
      : IsNever<ExtractHonoBody<T>> extends false
        ? Endpoint<ExtractHonoOutput<T>, ExtractHonoBody<T>>
        : ExtractHonoOutput<T>;

type TransformMethods<T> = {
  [K in keyof T as K extends HonoSchemaMethod
    ? K
    : never]: HonoEndpointToEnlace<T[K]>;
};

type TransformSegment<S extends string> = S extends `:${string}` ? "_" : S;

type PathToEnlace<
  Path extends string,
  S,
  Original extends string = Path,
> = Path extends `/${infer P}`
  ? PathToEnlace<P, S, Original>
  : Path extends `${infer Head}/${infer Rest}`
    ? {
        [K in TransformSegment<Head>]: PathToEnlace<Rest, S, Original>;
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

type SchemaToEnlace<S> =
  S extends Record<infer K, unknown>
    ? K extends string
      ? PathToEnlace<K, S>
      : never
    : never;

/**
 * Transforms Hono's AppType (from `typeof app`) into Enlace's ApiSchema format.
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
 * // Client (Enlace)
 * import type { HonoToEnlace } from 'enlace-hono';
 * type ApiSchema = HonoToEnlace<AppType>;
 *
 * const client = enlace<ApiSchema['api']>('http://localhost:3000/api');
 * const posts = await client.posts.get();       // typed as { id, title }[]
 * const post = await client.posts['123'].get(); // typed as { id }
 * ```
 */
export type HonoToEnlace<T> = UnionToIntersection<
  SchemaToEnlace<ExtractSchemaFromHono<T>>
>;
