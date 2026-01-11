import type { EnlaceMiddleware } from "./middleware.types";

type QueryField<TQuery> = [TQuery] extends [never] ? object : { query: TQuery };

type BodyField<TBody> = [TBody] extends [never] ? object : { body: TBody };

type FormDataField<TFormData> = [TFormData] extends [never]
  ? object
  : { formData: TFormData };

type ParamsField<TParamNames extends string> = [TParamNames] extends [never]
  ? object
  : { params: Record<TParamNames, string | number> };

type InputFields<
  TQuery,
  TBody,
  TFormData,
  TParamNames extends string,
> = QueryField<TQuery> &
  BodyField<TBody> &
  FormDataField<TFormData> &
  ParamsField<TParamNames>;

type InputFieldWrapper<TQuery, TBody, TFormData, TParamNames extends string> = [
  TQuery,
  TBody,
  TFormData,
  TParamNames,
] extends [never, never, never, never]
  ? object
  : { input: InputFields<TQuery, TBody, TFormData, TParamNames> };

export type EnlaceResponse<
  TData,
  TError,
  TRequestOptions = unknown,
  TQuery = never,
  TBody = never,
  TFormData = never,
  TParamNames extends string = never,
> =
  | ({
      status: number;
      data: TData;
      headers?: Headers;
      error?: undefined;
      aborted?: false;
      readonly __requestOptions?: TRequestOptions;
    } & InputFieldWrapper<TQuery, TBody, TFormData, TParamNames>)
  | ({
      status: number;
      data?: undefined;
      headers?: Headers;
      error: TError;
      aborted?: boolean;
      readonly __requestOptions?: TRequestOptions;
    } & InputFieldWrapper<TQuery, TBody, TFormData, TParamNames>);

export type EnlaceOptionsExtra<TData = unknown, TError = unknown> = {
  middlewares?: EnlaceMiddleware<TData, TError>[];
};
