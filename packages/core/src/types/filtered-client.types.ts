import type { SchemaMethod } from "./common.types";
import type { MethodFn, StaticPathKeys } from "./client.types";

type QueryMethod = "$get";
type MutationMethod = "$post" | "$put" | "$patch" | "$delete";

export type HasQueryMethods<TSchema> = TSchema extends object
  ? "$get" extends keyof TSchema
    ? true
    : TSchema extends { _: infer D }
      ? HasQueryMethods<D>
      : {
            [K in keyof TSchema]: K extends SchemaMethod | "_"
              ? never
              : HasQueryMethods<TSchema[K]>;
          }[keyof TSchema] extends never
        ? false
        : true extends {
              [K in keyof TSchema]: K extends SchemaMethod | "_"
                ? never
                : HasQueryMethods<TSchema[K]>;
            }[keyof TSchema]
          ? true
          : false
  : false;

type HasMutationMethods<TSchema> = TSchema extends object
  ? MutationMethod extends never
    ? false
    : Extract<keyof TSchema, MutationMethod> extends never
      ? TSchema extends { _: infer D }
        ? HasMutationMethods<D>
        : {
              [K in keyof TSchema]: K extends SchemaMethod | "_"
                ? never
                : HasMutationMethods<TSchema[K]>;
            }[keyof TSchema] extends never
          ? false
          : true extends {
                [K in keyof TSchema]: K extends SchemaMethod | "_"
                  ? never
                  : HasMutationMethods<TSchema[K]>;
              }[keyof TSchema]
            ? true
            : false
      : true
  : false;

type QueryHttpMethods<
  TSchema,
  TDefaultError = unknown,
  TOptionsMap = object,
  TParamNames extends string = never,
> = {
  [K in QueryMethod as K extends keyof TSchema ? K : never]: MethodFn<
    TSchema,
    K,
    TDefaultError,
    TOptionsMap,
    TParamNames
  >;
};

type ExtractParamName<S extends string> = S extends `:${infer P}` ? P : never;

type QueryDynamicAccess<
  TSchema,
  TDefaultError = unknown,
  TOptionsMap = object,
  TParamNames extends string = never,
  TRootSchema = TSchema,
> = TSchema extends { _: infer D }
  ? HasQueryMethods<D> extends true
    ? {
        [key: string]: QueryOnlyClient<
          D,
          TDefaultError,
          TOptionsMap,
          TParamNames | string,
          TRootSchema
        >;
        [key: number]: QueryOnlyClient<
          D,
          TDefaultError,
          TOptionsMap,
          TParamNames | string,
          TRootSchema
        >;
        <TKey extends string>(
          key: TKey
        ): QueryOnlyClient<
          D,
          TDefaultError,
          TOptionsMap,
          TParamNames | ExtractParamName<TKey>,
          TRootSchema
        >;
      }
    : object
  : object;

type QueryDynamicKey<
  TSchema,
  TDefaultError,
  TOptionsMap,
  TParamNames extends string = never,
  TRootSchema = TSchema,
> = TSchema extends { _: infer D }
  ? HasQueryMethods<D> extends true
    ? {
        /**
         * Dynamic path segment placeholder for routes like `/posts/:id`.
         *
         * @example
         * ```ts
         * useRead((api) => api.posts[123].$get())
         * useRead((api) => api.posts(':id').$get({ params: { id: 123 } }))
         * ```
         */
        _: QueryOnlyClient<
          D,
          TDefaultError,
          TOptionsMap,
          TParamNames | string,
          TRootSchema
        >;
      }
    : object
  : object;

export type QueryOnlyClient<
  TSchema,
  TDefaultError = unknown,
  TOptionsMap = object,
  TParamNames extends string = never,
  TRootSchema = TSchema,
> = QueryHttpMethods<TSchema, TDefaultError, TOptionsMap, TParamNames> &
  QueryDynamicAccess<
    TSchema,
    TDefaultError,
    TOptionsMap,
    TParamNames,
    TRootSchema
  > &
  QueryDynamicKey<
    TSchema,
    TDefaultError,
    TOptionsMap,
    TParamNames,
    TRootSchema
  > & {
    [K in keyof StaticPathKeys<TSchema> as K extends SchemaMethod
      ? never
      : HasQueryMethods<TSchema[K]> extends true
        ? K
        : never]: QueryOnlyClient<
      TSchema[K],
      TDefaultError,
      TOptionsMap,
      TParamNames,
      TRootSchema
    >;
  };

type MutationHttpMethods<
  TSchema,
  TDefaultError = unknown,
  TOptionsMap = object,
  TParamNames extends string = never,
> = {
  [K in MutationMethod as K extends keyof TSchema ? K : never]: MethodFn<
    TSchema,
    K,
    TDefaultError,
    TOptionsMap,
    TParamNames
  >;
};

type MutationDynamicAccess<
  TSchema,
  TDefaultError = unknown,
  TOptionsMap = object,
  TParamNames extends string = never,
> = TSchema extends { _: infer D }
  ? HasMutationMethods<D> extends true
    ? {
        [key: string]: MutationOnlyClient<
          D,
          TDefaultError,
          TOptionsMap,
          TParamNames | string
        >;
        [key: number]: MutationOnlyClient<
          D,
          TDefaultError,
          TOptionsMap,
          TParamNames | string
        >;
        <TKey extends string>(
          key: TKey
        ): MutationOnlyClient<
          D,
          TDefaultError,
          TOptionsMap,
          TParamNames | ExtractParamName<TKey>
        >;
      }
    : object
  : object;

type MutationDynamicKey<
  TSchema,
  TDefaultError,
  TOptionsMap,
  TParamNames extends string = never,
> = TSchema extends {
  _: infer D;
}
  ? HasMutationMethods<D> extends true
    ? {
        /**
         * Dynamic path segment placeholder for routes like `/posts/:id`.
         *
         * @example
         * ```ts
         * const { trigger } = useWrite((api) => api.posts(':id').$delete)
         * trigger({ params: { id: 123 } })
         * ```
         */
        _: MutationOnlyClient<
          D,
          TDefaultError,
          TOptionsMap,
          TParamNames | string
        >;
      }
    : object
  : object;

export type MutationOnlyClient<
  TSchema,
  TDefaultError = unknown,
  TOptionsMap = object,
  TParamNames extends string = never,
> = MutationHttpMethods<TSchema, TDefaultError, TOptionsMap, TParamNames> &
  MutationDynamicAccess<TSchema, TDefaultError, TOptionsMap, TParamNames> &
  MutationDynamicKey<TSchema, TDefaultError, TOptionsMap, TParamNames> & {
    [K in keyof StaticPathKeys<TSchema> as K extends SchemaMethod
      ? never
      : HasMutationMethods<TSchema[K]> extends true
        ? K
        : never]: MutationOnlyClient<
      TSchema[K],
      TDefaultError,
      TOptionsMap,
      TParamNames
    >;
  };
