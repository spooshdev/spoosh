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

type ExtractParamName<S extends string> = S extends `:${infer P}` ? P : never;

type MethodRequestOptions<
  TSchema,
  TMethod extends SchemaMethod,
  TDefaultError,
  TOptionsMap,
  TParamNames extends string,
  TRequired extends boolean,
> = TRequired extends true
  ? RequestOptions<
      ExtractBody<TSchema, TMethod, TDefaultError>,
      ExtractQuery<TSchema, TMethod, TDefaultError>,
      ExtractFormData<TSchema, TMethod, TDefaultError>
    > &
      ComputeRequestOptions<
        ExtractMethodOptions<TOptionsMap, TMethod>,
        TParamNames
      >
  : RequestOptions<
      never,
      ExtractQuery<TSchema, TMethod, TDefaultError>,
      never
    > &
      ComputeRequestOptions<
        ExtractMethodOptions<TOptionsMap, TMethod>,
        TParamNames
      >;

export type MethodFn<
  TSchema,
  TMethod extends SchemaMethod,
  TDefaultError = unknown,
  TOptionsMap = object,
  TParamNames extends string = never,
> =
  HasMethod<TSchema, TMethod> extends true
    ? HasRequiredOptions<TSchema, TMethod, TDefaultError> extends true
      ? (
          options: MethodRequestOptions<
            TSchema,
            TMethod,
            TDefaultError,
            TOptionsMap,
            TParamNames,
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
              TParamNames,
              true
            >,
            ExtractQuery<TSchema, TMethod, TDefaultError>,
            ExtractBody<TSchema, TMethod, TDefaultError>,
            ExtractFormData<TSchema, TMethod, TDefaultError>,
            TParamNames
          >
        >
      : (
          options?: MethodRequestOptions<
            TSchema,
            TMethod,
            TDefaultError,
            TOptionsMap,
            TParamNames,
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
              TParamNames,
              false
            >,
            ExtractQuery<TSchema, TMethod, TDefaultError>,
            ExtractBody<TSchema, TMethod, TDefaultError>,
            ExtractFormData<TSchema, TMethod, TDefaultError>,
            TParamNames
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
  TParamNames extends string = never,
> = {
  [K in SchemaMethod as K extends keyof TSchema ? K : never]: MethodFn<
    TSchema,
    K,
    TDefaultError,
    TOptionsMap,
    TParamNames
  >;
};

type DynamicAccess<
  TSchema,
  TDefaultError = unknown,
  TOptionsMap = object,
  TParamNames extends string = never,
  TRootSchema = TSchema,
> =
  ExtractDynamicSchema<TSchema> extends never
    ? object
    : {
        [key: string]: EnlaceClient<
          ExtractDynamicSchema<TSchema>,
          TDefaultError,
          TOptionsMap,
          TParamNames | string,
          TRootSchema
        >;
        [key: number]: EnlaceClient<
          ExtractDynamicSchema<TSchema>,
          TDefaultError,
          TOptionsMap,
          TParamNames | string,
          TRootSchema
        >;
        /**
         * Dynamic path segment with typed param name.
         * Use `:paramName` format to get typed params in the response.
         *
         * @example
         * ```ts
         * // Typed params: { userId: string | number }
         * const { data, params } = await api.users(':userId').$get({ params: { userId: 123 } })
         * ```
         */
        <TKey extends string>(
          key: TKey
        ): EnlaceClient<
          ExtractDynamicSchema<TSchema>,
          TDefaultError,
          TOptionsMap,
          TParamNames | ExtractParamName<TKey>,
          TRootSchema
        >;
      };

type DynamicKey<
  TSchema,
  TDefaultError,
  TOptionsMap,
  TParamNames extends string = never,
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
      _: EnlaceClient<
        D,
        TDefaultError,
        TOptionsMap,
        TParamNames | string,
        TRootSchema
      >;
    }
  : object;

export type EnlaceClient<
  TSchema,
  TDefaultError = unknown,
  TOptionsMap = object,
  TParamNames extends string = never,
  TRootSchema = TSchema,
> = HttpMethods<TSchema, TDefaultError, TOptionsMap, TParamNames> &
  DynamicAccess<TSchema, TDefaultError, TOptionsMap, TParamNames, TRootSchema> &
  DynamicKey<TSchema, TDefaultError, TOptionsMap, TParamNames, TRootSchema> & {
    [K in keyof StaticPathKeys<TSchema> as K extends SchemaMethod
      ? never
      : K]: EnlaceClient<
      TSchema[K],
      TDefaultError,
      TOptionsMap,
      TParamNames,
      TRootSchema
    >;
  };
