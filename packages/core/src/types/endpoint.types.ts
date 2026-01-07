import type { SchemaMethod } from "./common.types";

declare const EndpointBrand: unique symbol;

export type Endpoint<TData, TBody = never, TError = never> = {
  [EndpointBrand]: true;
} & ([TBody] extends [never]
  ? [TError] extends [never]
    ? { data: TData }
    : { data: TData; error: TError }
  : [TError] extends [never]
    ? { data: TData; body: TBody }
    : { data: TData; error: TError; body: TBody });

export type EndpointWithQuery<TData, TQuery, TError = never> = {
  [EndpointBrand]: true;
} & ([TError] extends [never]
  ? { data: TData; query: TQuery }
  : { data: TData; query: TQuery; error: TError });

export type EndpointWithFormData<TData, TFormData, TError = never> = {
  [EndpointBrand]: true;
} & ([TError] extends [never]
  ? { data: TData; formData: TFormData }
  : { data: TData; formData: TFormData; error: TError });

export type EndpointFull<
  T extends {
    data: unknown;
    body?: unknown;
    query?: unknown;
    formData?: unknown;
    error?: unknown;
  },
> = { [EndpointBrand]: true } & T;

export type NormalizeEndpoint<T, TDefaultError> = T extends {
  [EndpointBrand]: true;
}
  ? {
      data: T extends { data: infer D } ? D : never;
      error: T extends { error: infer E } ? E : TDefaultError;
      body: T extends { body: infer B } ? B : never;
      query: T extends { query: infer Q } ? Q : never;
      formData: T extends { formData: infer F } ? F : never;
    }
  : {
      data: T;
      error: TDefaultError;
      body: never;
      query: never;
      formData: never;
    };

export type ExtractMethodDef<
  TSchema,
  TMethod extends SchemaMethod,
  TDefaultError = unknown,
> = TSchema extends { [K in TMethod]: infer M }
  ? NormalizeEndpoint<M, TDefaultError>
  : never;

export type ExtractData<
  TSchema,
  TMethod extends SchemaMethod,
  TDefaultError = unknown,
> =
  ExtractMethodDef<TSchema, TMethod, TDefaultError> extends { data: infer D }
    ? D
    : never;

export type ExtractError<
  TSchema,
  TMethod extends SchemaMethod,
  TDefaultError = unknown,
> =
  ExtractMethodDef<TSchema, TMethod, TDefaultError> extends { error: infer E }
    ? E
    : TDefaultError;

export type ExtractBody<
  TSchema,
  TMethod extends SchemaMethod,
  TDefaultError = unknown,
> =
  ExtractMethodDef<TSchema, TMethod, TDefaultError> extends { body: infer B }
    ? B
    : never;

export type ExtractQuery<
  TSchema,
  TMethod extends SchemaMethod,
  TDefaultError = unknown,
> =
  ExtractMethodDef<TSchema, TMethod, TDefaultError> extends { query: infer Q }
    ? Q
    : never;

export type ExtractFormData<
  TSchema,
  TMethod extends SchemaMethod,
  TDefaultError = unknown,
> =
  ExtractMethodDef<TSchema, TMethod, TDefaultError> extends {
    formData: infer F;
  }
    ? F
    : never;

export type HasMethod<TSchema, TMethod extends SchemaMethod> = TSchema extends {
  [K in TMethod]: unknown;
}
  ? true
  : false;

export type HasRequiredOptions<
  TSchema,
  TMethod extends SchemaMethod,
  TDefaultError = unknown,
> = [ExtractBody<TSchema, TMethod, TDefaultError>] extends [never]
  ? [ExtractFormData<TSchema, TMethod, TDefaultError>] extends [never]
    ? false
    : true
  : true;
