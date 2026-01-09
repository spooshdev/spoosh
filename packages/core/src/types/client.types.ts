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

type MethodRequestOptions<
  TSchema,
  TMethod extends SchemaMethod,
  TDefaultError,
  TOptionsMap,
  THasDynamicSegment extends boolean,
  TRequired extends boolean,
> = TRequired extends true
  ? RequestOptions<
      ExtractBody<TSchema, TMethod, TDefaultError>,
      ExtractQuery<TSchema, TMethod, TDefaultError>,
      ExtractFormData<TSchema, TMethod, TDefaultError>
    > &
      ComputeRequestOptions<
        ExtractMethodOptions<TOptionsMap, TMethod>,
        THasDynamicSegment
      >
  : RequestOptions<
      never,
      ExtractQuery<TSchema, TMethod, TDefaultError>,
      never
    > &
      ComputeRequestOptions<
        ExtractMethodOptions<TOptionsMap, TMethod>,
        THasDynamicSegment
      >;

export type MethodFn<
  TSchema,
  TMethod extends SchemaMethod,
  TDefaultError = unknown,
  TOptionsMap = object,
  THasDynamicSegment extends boolean = false,
> =
  HasMethod<TSchema, TMethod> extends true
    ? HasRequiredOptions<TSchema, TMethod, TDefaultError> extends true
      ? (
          options: MethodRequestOptions<
            TSchema,
            TMethod,
            TDefaultError,
            TOptionsMap,
            THasDynamicSegment,
            true
          >
        ) => Promise<
          EnlaceResponse<
            ExtractData<TSchema, TMethod, TDefaultError>,
            ExtractError<TSchema, TMethod, TDefaultError>,
            MethodRequestOptions<
              TSchema,
              TMethod,
              TDefaultError,
              TOptionsMap,
              THasDynamicSegment,
              true
            >
          >
        >
      : (
          options?: MethodRequestOptions<
            TSchema,
            TMethod,
            TDefaultError,
            TOptionsMap,
            THasDynamicSegment,
            false
          >
        ) => Promise<
          EnlaceResponse<
            ExtractData<TSchema, TMethod, TDefaultError>,
            ExtractError<TSchema, TMethod, TDefaultError>,
            MethodRequestOptions<
              TSchema,
              TMethod,
              TDefaultError,
              TOptionsMap,
              THasDynamicSegment,
              false
            >
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
> = {
  [K in SchemaMethod as K extends keyof TSchema ? K : never]: MethodFn<
    TSchema,
    K,
    TDefaultError,
    TOptionsMap,
    THasDynamicSegment
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

type DynamicKey<
  TSchema,
  TDefaultError,
  TOptionsMap,
  TRootSchema = TSchema,
> = TSchema extends {
  _: infer D;
}
  ? {
      /**
       * Dynamic path segment placeholder for routes like `/posts/:id`.
       *
       * @example
       * ```ts
       * // Direct client usage
       * const { data } = await api.posts._.$get({ params: { id: 123 } })
       * ```
       */
      _: EnlaceClient<D, TDefaultError, TOptionsMap, true, TRootSchema>;
    }
  : object;

export type EnlaceClient<
  TSchema,
  TDefaultError = unknown,
  TOptionsMap = object,
  THasDynamicSegment extends boolean = false,
  TRootSchema = TSchema,
> = HttpMethods<TSchema, TDefaultError, TOptionsMap, THasDynamicSegment> &
  DynamicAccess<TSchema, TDefaultError, TOptionsMap, TRootSchema> &
  DynamicKey<TSchema, TDefaultError, TOptionsMap, TRootSchema> & {
    [K in keyof StaticPathKeys<TSchema> as K extends SchemaMethod
      ? never
      : K]: EnlaceClient<
      TSchema[K],
      TDefaultError,
      TOptionsMap,
      THasDynamicSegment,
      TRootSchema
    >;
  };
