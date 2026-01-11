import { applyMiddlewares } from "./middleware";
import { buildUrl, isJsonBody, mergeHeaders, objectToFormData } from "./utils";
import type {
  AnyRequestOptions,
  EnlaceOptionsExtra,
  EnlaceMiddleware,
  EnlaceOptions,
  EnlaceResponse,
  HttpMethod,
  MiddlewareContext,
} from "./types";

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const isNetworkError = (err: unknown): boolean => err instanceof TypeError;

const isAbortError = (err: unknown): boolean =>
  err instanceof DOMException && err.name === "AbortError";

export async function executeFetch<TData, TError>(
  baseUrl: string,
  path: string[],
  method: HttpMethod,
  defaultOptions: EnlaceOptions & EnlaceOptionsExtra,
  requestOptions?: AnyRequestOptions
): Promise<EnlaceResponse<TData, TError>> {
  const middlewares = (defaultOptions.middlewares ?? []) as EnlaceMiddleware<
    TData,
    TError
  >[];

  let context: MiddlewareContext<TData, TError> = {
    baseUrl,
    path,
    method,
    defaultOptions,
    requestOptions,
    metadata: {},
  };

  if (middlewares.length > 0) {
    context = await applyMiddlewares(context, middlewares, "before");
  }

  const response = await executeCoreFetch<TData, TError>(
    context.baseUrl,
    context.path,
    context.method,
    context.defaultOptions,
    context.requestOptions,
    context.fetchInit
  );

  context.response = response;

  if (middlewares.length > 0) {
    context = await applyMiddlewares(context, middlewares, "after");
  }

  return context.response!;
}

function buildInputFields(
  requestOptions?: AnyRequestOptions
): { input: Record<string, unknown> } | object {
  const fields: Record<string, unknown> = {};

  if (requestOptions?.query !== undefined) {
    fields.query = requestOptions.query;
  }

  if (requestOptions?.body !== undefined) {
    fields.body = requestOptions.body;
  }

  if (requestOptions?.formData !== undefined) {
    fields.formData = requestOptions.formData;
  }

  if (requestOptions?.params !== undefined) {
    fields.params = requestOptions.params;
  }

  if (Object.keys(fields).length === 0) {
    return {};
  }

  return { input: fields };
}

async function executeCoreFetch<TData, TError>(
  baseUrl: string,
  path: string[],
  method: HttpMethod,
  defaultOptions: EnlaceOptions & EnlaceOptionsExtra,
  requestOptions?: AnyRequestOptions,
  middlewareFetchInit?: RequestInit
): Promise<EnlaceResponse<TData, TError>> {
  const {
    middlewares: _,
    headers: defaultHeaders,
    ...fetchDefaults
  } = defaultOptions;
  void _;

  const inputFields = buildInputFields(requestOptions);

  const maxRetries = requestOptions?.retries ?? 3;
  const baseDelay = requestOptions?.retryDelay ?? 1000;
  const retryCount = maxRetries === false ? 0 : maxRetries;

  const url = buildUrl(baseUrl, path, requestOptions?.query);

  let headers = await mergeHeaders(defaultHeaders, requestOptions?.headers);

  const fetchInit: RequestInit = {
    ...fetchDefaults,
    ...middlewareFetchInit,
    method,
  };

  if (headers) {
    fetchInit.headers = headers;
  }

  fetchInit.cache = requestOptions?.cache ?? fetchDefaults?.cache;

  if (requestOptions?.signal) {
    fetchInit.signal = requestOptions.signal;
  }

  if (requestOptions?.formData !== undefined) {
    fetchInit.body = objectToFormData(
      requestOptions.formData as Record<string, unknown>
    );
  } else if (requestOptions?.body !== undefined) {
    if (isJsonBody(requestOptions.body)) {
      fetchInit.body = JSON.stringify(requestOptions.body);
      headers = await mergeHeaders(headers, {
        "Content-Type": "application/json",
      });

      if (headers) {
        fetchInit.headers = headers;
      }
    } else {
      fetchInit.body = requestOptions.body as BodyInit;
    }
  }

  let lastError: TError | undefined;

  for (let attempt = 0; attempt <= retryCount; attempt++) {
    try {
      const res = await fetch(url, fetchInit);
      const status = res.status;
      const resHeaders = res.headers;

      const contentType = resHeaders.get("content-type");
      const isJson = contentType?.includes("application/json");

      const body = (isJson ? await res.json() : res) as never;

      if (res.ok) {
        return {
          status,
          data: body,
          headers: resHeaders,
          error: undefined,
          ...inputFields,
        };
      }

      return {
        status,
        error: body,
        headers: resHeaders,
        data: undefined,
        ...inputFields,
      };
    } catch (err) {
      if (isAbortError(err)) {
        return {
          status: 0,
          error: err as TError,
          data: undefined,
          aborted: true,
          ...inputFields,
        };
      }

      lastError = err as TError;

      if (isNetworkError(err) && attempt < retryCount) {
        const delayMs = baseDelay * Math.pow(2, attempt);
        await delay(delayMs);
        continue;
      }

      return { status: 0, error: lastError, data: undefined, ...inputFields };
    }
  }

  return { status: 0, error: lastError!, data: undefined, ...inputFields };
}
