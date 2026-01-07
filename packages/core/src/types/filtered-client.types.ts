import type { EnlaceResponse } from "./response.types";
import type { SchemaMethod } from "./common.types";
import type { RequestOptions } from "./request.types";
import type { MethodFn, StaticPathKeys } from "./client.types";

type QueryMethod = "$get";
type MutationMethod = "$post" | "$put" | "$patch" | "$delete";

type HasQueryMethods<TSchema> = TSchema extends object
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
  THasDynamicSegment extends boolean = false,
  TRootSchema = TSchema,
> = {
  [K in QueryMethod as K extends keyof TSchema ? K : never]: MethodFn<
    TSchema,
    K,
    TDefaultError,
    TOptionsMap,
    THasDynamicSegment,
    TRootSchema
  >;
};

type MutationHttpMethods<
  TSchema,
  TDefaultError = unknown,
  TOptionsMap = object,
  THasDynamicSegment extends boolean = false,
  TRootSchema = TSchema,
> = {
  [K in MutationMethod as K extends keyof TSchema ? K : never]: MethodFn<
    TSchema,
    K,
    TDefaultError,
    TOptionsMap,
    THasDynamicSegment,
    TRootSchema
  >;
};

type QueryDynamicAccess<
  TSchema,
  TDefaultError = unknown,
  TOptionsMap = object,
  TRootSchema = TSchema,
> = TSchema extends { _: infer D }
  ? HasQueryMethods<D> extends true
    ? {
        [key: string]: QueryOnlyClient<
          D,
          TDefaultError,
          TOptionsMap,
          true,
          TRootSchema
        >;
        [key: number]: QueryOnlyClient<
          D,
          TDefaultError,
          TOptionsMap,
          true,
          TRootSchema
        >;
      }
    : object
  : object;

type MutationDynamicAccess<
  TSchema,
  TDefaultError = unknown,
  TOptionsMap = object,
  TRootSchema = TSchema,
> = TSchema extends { _: infer D }
  ? HasMutationMethods<D> extends true
    ? {
        [key: string]: MutationOnlyClient<
          D,
          TDefaultError,
          TOptionsMap,
          true,
          TRootSchema
        >;
        [key: number]: MutationOnlyClient<
          D,
          TDefaultError,
          TOptionsMap,
          true,
          TRootSchema
        >;
      }
    : object
  : object;

type QueryDynamicKey<
  TSchema,
  TDefaultError,
  TOptionsMap,
  TRootSchema = TSchema,
> = TSchema extends { _: infer D }
  ? HasQueryMethods<D> extends true
    ? { _: QueryOnlyClient<D, TDefaultError, TOptionsMap, true, TRootSchema> }
    : object
  : object;

type MutationDynamicKey<
  TSchema,
  TDefaultError,
  TOptionsMap,
  TRootSchema = TSchema,
> = TSchema extends { _: infer D }
  ? HasMutationMethods<D> extends true
    ? {
        _: MutationOnlyClient<D, TDefaultError, TOptionsMap, true, TRootSchema>;
      }
    : object
  : object;

type MethodNameKeys = SchemaMethod;

export type QueryOnlyClient<
  TSchema,
  TDefaultError = unknown,
  TOptionsMap = object,
  THasDynamicSegment extends boolean = false,
  TRootSchema = TSchema,
> = QueryHttpMethods<
  TSchema,
  TDefaultError,
  TOptionsMap,
  THasDynamicSegment,
  TRootSchema
> &
  QueryDynamicAccess<TSchema, TDefaultError, TOptionsMap, TRootSchema> &
  QueryDynamicKey<TSchema, TDefaultError, TOptionsMap, TRootSchema> & {
    [K in keyof StaticPathKeys<TSchema> as K extends MethodNameKeys
      ? never
      : HasQueryMethods<TSchema[K]> extends true
        ? K
        : never]: QueryOnlyClient<
      TSchema[K],
      TDefaultError,
      TOptionsMap,
      THasDynamicSegment,
      TRootSchema
    >;
  };

export type MutationOnlyClient<
  TSchema,
  TDefaultError = unknown,
  TOptionsMap = object,
  THasDynamicSegment extends boolean = false,
  TRootSchema = TSchema,
> = MutationHttpMethods<
  TSchema,
  TDefaultError,
  TOptionsMap,
  THasDynamicSegment,
  TRootSchema
> &
  MutationDynamicAccess<TSchema, TDefaultError, TOptionsMap, TRootSchema> &
  MutationDynamicKey<TSchema, TDefaultError, TOptionsMap, TRootSchema> & {
    [K in keyof StaticPathKeys<TSchema> as K extends MethodNameKeys
      ? never
      : HasMutationMethods<TSchema[K]> extends true
        ? K
        : never]: MutationOnlyClient<
      TSchema[K],
      TDefaultError,
      TOptionsMap,
      THasDynamicSegment,
      TRootSchema
    >;
  };

export type WildcardQueryClient<TRequestOptionsBase = object> = {
  (
    options?: RequestOptions<unknown> & TRequestOptionsBase
  ): Promise<EnlaceResponse<unknown, unknown>>;
  $get: WildcardQueryClient<TRequestOptionsBase>;
  [key: string]: WildcardQueryClient<TRequestOptionsBase>;
  [key: number]: WildcardQueryClient<TRequestOptionsBase>;
};

export type WildcardMutationClient<TRequestOptionsBase = object> = {
  (
    options?: RequestOptions<unknown> & TRequestOptionsBase
  ): Promise<EnlaceResponse<unknown, unknown>>;
  $post: WildcardMutationClient<TRequestOptionsBase>;
  $put: WildcardMutationClient<TRequestOptionsBase>;
  $patch: WildcardMutationClient<TRequestOptionsBase>;
  $delete: WildcardMutationClient<TRequestOptionsBase>;
  [key: string]: WildcardMutationClient<TRequestOptionsBase>;
  [key: number]: WildcardMutationClient<TRequestOptionsBase>;
};
