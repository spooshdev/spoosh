import type { EnlaceResponse } from "./response.types";
import type { SchemaMethod } from "./common.types";
import type {
  RequestOptions,
  ExtractMethodOptions,
  ComputeRequestOptions,
} from "./request.types";
import type {
  ExtractData,
  ExtractError,
  ExtractBody,
  ExtractQuery,
  ExtractFormData,
  HasMethod,
  HasRequiredOptions,
} from "./endpoint.types";
import type { WithOptimistic } from "./optimistic.types";

export type MethodFn<
  TSchema,
  TMethod extends SchemaMethod,
  TDefaultError = unknown,
  TOptionsMap = object,
  THasDynamicSegment extends boolean = false,
  TRootSchema = TSchema,
> =
  HasMethod<TSchema, TMethod> extends true
    ? HasRequiredOptions<TSchema, TMethod, TDefaultError> extends true
      ? (
          options: RequestOptions<
            ExtractBody<TSchema, TMethod, TDefaultError>,
            ExtractQuery<TSchema, TMethod, TDefaultError>,
            ExtractFormData<TSchema, TMethod, TDefaultError>
          > &
            ComputeRequestOptions<
              ExtractMethodOptions<TOptionsMap, TMethod>,
              THasDynamicSegment
            > &
            WithOptimistic<TSchema, TMethod, TDefaultError, TRootSchema>
        ) => Promise<
          EnlaceResponse<
            ExtractData<TSchema, TMethod, TDefaultError>,
            ExtractError<TSchema, TMethod, TDefaultError>
          >
        >
      : (
          options?: RequestOptions<
            never,
            ExtractQuery<TSchema, TMethod, TDefaultError>,
            never
          > &
            ComputeRequestOptions<
              ExtractMethodOptions<TOptionsMap, TMethod>,
              THasDynamicSegment
            > &
            WithOptimistic<TSchema, TMethod, TDefaultError, TRootSchema>
        ) => Promise<
          EnlaceResponse<
            ExtractData<TSchema, TMethod, TDefaultError>,
            ExtractError<TSchema, TMethod, TDefaultError>
          >
        >
    : never;

type IsSpecialKey<K> = K extends SchemaMethod | "_" ? true : false;

export type StaticPathKeys<TSchema> = {
  [K in keyof TSchema as IsSpecialKey<K> extends true
    ? never
    : K extends string
      ? K
      : never]: TSchema[K];
};

type ExtractDynamicSchema<TSchema> = TSchema extends { _: infer D } ? D : never;

type HttpMethods<
  TSchema,
  TDefaultError = unknown,
  TOptionsMap = object,
  THasDynamicSegment extends boolean = false,
  TRootSchema = TSchema,
> = {
  [K in SchemaMethod as K extends keyof TSchema ? K : never]: MethodFn<
    TSchema,
    K,
    TDefaultError,
    TOptionsMap,
    THasDynamicSegment,
    TRootSchema
  >;
};

type DynamicAccess<
  TSchema,
  TDefaultError = unknown,
  TOptionsMap = object,
  TRootSchema = TSchema,
> =
  ExtractDynamicSchema<TSchema> extends never
    ? object
    : {
        [key: string]: EnlaceClient<
          ExtractDynamicSchema<TSchema>,
          TDefaultError,
          TOptionsMap,
          true,
          TRootSchema
        >;
        [key: number]: EnlaceClient<
          ExtractDynamicSchema<TSchema>,
          TDefaultError,
          TOptionsMap,
          true,
          TRootSchema
        >;
      };

type MethodNameKeys = SchemaMethod;

type DynamicKey<
  TSchema,
  TDefaultError,
  TOptionsMap,
  TRootSchema = TSchema,
> = TSchema extends {
  _: infer D;
}
  ? { _: EnlaceClient<D, TDefaultError, TOptionsMap, true, TRootSchema> }
  : object;

export type EnlaceClient<
  TSchema,
  TDefaultError = unknown,
  TOptionsMap = object,
  THasDynamicSegment extends boolean = false,
  TRootSchema = TSchema,
> = HttpMethods<
  TSchema,
  TDefaultError,
  TOptionsMap,
  THasDynamicSegment,
  TRootSchema
> &
  DynamicAccess<TSchema, TDefaultError, TOptionsMap, TRootSchema> &
  DynamicKey<TSchema, TDefaultError, TOptionsMap, TRootSchema> & {
    [K in keyof StaticPathKeys<TSchema> as K extends MethodNameKeys
      ? never
      : K]: EnlaceClient<
      TSchema[K],
      TDefaultError,
      TOptionsMap,
      THasDynamicSegment,
      TRootSchema
    >;
  };

export type WildcardClient<TRequestOptionsBase = object> = {
  (
    options?: RequestOptions<unknown> & TRequestOptionsBase
  ): Promise<EnlaceResponse<unknown, unknown>>;
  $get: WildcardClient<TRequestOptionsBase>;
  $post: WildcardClient<TRequestOptionsBase>;
  $put: WildcardClient<TRequestOptionsBase>;
  $patch: WildcardClient<TRequestOptionsBase>;
  $delete: WildcardClient<TRequestOptionsBase>;
  [key: string]: WildcardClient<TRequestOptionsBase>;
  [key: number]: WildcardClient<TRequestOptionsBase>;
};
