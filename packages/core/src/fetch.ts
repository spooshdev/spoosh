import { buildUrl, isJsonBody, mergeHeaders, objectToFormData } from "./utils";
import type {
  AnyRequestOptions,
  EnlaceCallbacks,
  EnlaceOptions,
  EnlaceResponse,
  HttpMethod,
} from "./types";

export async function executeFetch<TData, TError>(
  baseUrl: string,
  path: string[],
  method: HttpMethod,
  defaultOptions: EnlaceOptions & EnlaceCallbacks,
  requestOptions?: AnyRequestOptions
): Promise<EnlaceResponse<TData, TError>> {
  const {
    onSuccess,
    onError,
    headers: defaultHeaders,
    ...fetchDefaults
  } = defaultOptions;

  const url = buildUrl(baseUrl, path, requestOptions?.query);

  let headers = await mergeHeaders(defaultHeaders, requestOptions?.headers);

  const fetchOptions: RequestInit = { ...fetchDefaults, method };

  if (headers) {
    fetchOptions.headers = headers;
  }

  fetchOptions.cache = requestOptions?.cache ?? fetchDefaults?.cache;

  if (requestOptions?.formData !== undefined) {
    fetchOptions.body = objectToFormData(requestOptions.formData as Record<string, unknown>);
  } else if (requestOptions?.body !== undefined) {
    if (isJsonBody(requestOptions.body)) {
      fetchOptions.body = JSON.stringify(requestOptions.body);
      headers = await mergeHeaders(headers, {
        "Content-Type": "application/json",
      });
      if (headers) {
        fetchOptions.headers = headers;
      }
    } else {
      fetchOptions.body = requestOptions.body as BodyInit;
    }
  }

  try {
    const res = await fetch(url, fetchOptions);
    const status = res.status;
    const headers = res.headers;

    const contentType = headers.get("content-type");
    const isJson = contentType?.includes("application/json");

    const body = (isJson ? await res.json() : res) as never;

    if (res.ok) {
      const payload = { status, data: body, headers };
      onSuccess?.(payload);
      return { ...payload, error: undefined };
    }

    const payload = { status, error: body, headers };
    onError?.(payload);
    return { ...payload, data: undefined };
  } catch (err) {
    const error = err as TError;
    onError?.({ status: 0, error });
    return { status: 0, error, data: undefined };
  }
}
