import type { SchemaMethod } from "./common.types";

declare const EndpointBrand: unique symbol;

/**
 * Define an API endpoint with its data, request options, and error types.
 *
 * @example
 * ```typescript
 * // Simple GET endpoint
 * $get: Endpoint<{ data: User[] }>
 *
 * // GET with query parameters
 * $get: Endpoint<{ data: User[]; query: { page: number; limit: number } }>
 *
 * // POST with JSON body
 * $post: Endpoint<{ data: User; body: CreateUserBody }>
 *
 * // POST with form data (file upload)
 * $post: Endpoint<{ data: UploadResult; formData: { file: File; name: string } }>
 *
 * // POST with URL-encoded body (Stripe-style)
 * $post: Endpoint<{ data: Payment; urlEncoded: { amount: number; currency: string } }>
 *
 * // With error type
 * $get: Endpoint<{ data: User; error: ApiError }>
 *
 * // Complex: query + body + error
 * $post: Endpoint<{ data: User; body: CreateUserBody; query: { notify?: boolean }; error: ApiError }>
 * ```
 */
export type Endpoint<
  T extends {
    data: unknown;
    body?: unknown;
    query?: unknown;
    formData?: unknown;
    urlEncoded?: unknown;
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
      urlEncoded: T extends { urlEncoded: infer U } ? U : never;
    }
  : {
      data: T;
      error: TDefaultError;
      body: never;
      query: never;
      formData: never;
      urlEncoded: never;
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

export type ExtractUrlEncoded<
  TSchema,
  TMethod extends SchemaMethod,
  TDefaultError = unknown,
> =
  ExtractMethodDef<TSchema, TMethod, TDefaultError> extends {
    urlEncoded: infer U;
  }
    ? U
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
    ? [ExtractUrlEncoded<TSchema, TMethod, TDefaultError>] extends [never]
      ? false
      : true
    : true
  : true;
