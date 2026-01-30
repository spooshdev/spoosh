import type { Simplify } from "@spoosh/core";

type UnionToIntersection<U> = (
  U extends unknown ? (k: U) => void : never
) extends (k: infer I) => void
  ? I
  : never;

type ElysiaMethod =
  | "get"
  | "post"
  | "put"
  | "patch"
  | "delete"
  | "head"
  | "options";

type ExtractSuccessResponse<T> = T extends { 200: infer R } ? R : never;

type MapMethod<M> = M extends "get" | "head"
  ? "GET"
  : M extends "post"
    ? "POST"
    : M extends "put"
      ? "PUT"
      : M extends "patch"
        ? "PATCH"
        : M extends "delete"
          ? "DELETE"
          : M extends "options"
            ? "OPTIONS"
            : never;

type BodyField<T> = unknown extends T
  ? object
  : [T] extends [never]
    ? object
    : { body: T };

type QueryField<T> = unknown extends T
  ? object
  : [T] extends [never]
    ? object
    : { query: T };

type TransformEndpoint<Route> = Route extends {
  body: infer Body;
  query: infer Query;
  response: infer Res;
}
  ? Simplify<
      { data: ExtractSuccessResponse<Res> } & BodyField<Body> &
        QueryField<Query>
    >
  : never;

type TransformMethods<T> = {
  [M in keyof T as M extends ElysiaMethod
    ? MapMethod<M>
    : never]: M extends string ? TransformEndpoint<T[M]> : never;
};

type NonMethodKeys<T> = {
  [K in keyof T]: K extends ElysiaMethod ? never : K;
}[keyof T];

type HasMethods<T> = {
  [K in keyof T]: K extends ElysiaMethod ? true : never;
}[keyof T] extends never
  ? false
  : true;

type TransformRoutes<T, Path extends string = ""> = (HasMethods<T> extends true
  ? { [P in Path]: TransformMethods<T> }
  : object) &
  (NonMethodKeys<T> extends never
    ? object
    : UnionToIntersection<
        {
          [K in NonMethodKeys<T>]: TransformRoutes<
            T[K],
            Path extends "" ? K & string : `${Path}/${K & string}`
          >;
        }[NonMethodKeys<T>]
      >);

/**
 * Transforms Elysia app type directly into Spoosh flat schema format.
 * Extracts types directly from Elysia's internal ~Routes.
 *
 * @example
 * ```typescript
 * import type { ElysiaToSpoosh } from '@spoosh/elysia';
 * import { app } from './server';
 *
 * type ApiSchema = ElysiaToSpoosh<typeof app>;
 *
 * const api = createClient<ApiSchema>({ baseUrl: "/api" });
 * await api("users").GET();
 * await api("users/:id").GET({ params: { id: 123 } });
 * ```
 */
export type ElysiaToSpoosh<App extends { "~Routes": unknown }> = Simplify<
  TransformRoutes<App["~Routes"]>
>;
