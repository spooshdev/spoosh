import { buildUrl, isJsonBody, mergeHeaders } from "./utils";
import type { EnlaceOptions, EnlaceResponse, HttpMethod, RequestOptions } from "./types";

export async function executeFetch<TData, TError>(
  baseUrl: string,
  path: string[],
  method: HttpMethod,
  defaultOptions: EnlaceOptions,
  requestOptions?: RequestOptions<unknown>
): Promise<EnlaceResponse<TData, TError>> {
  const url = buildUrl(baseUrl, path, requestOptions?.query);

  let headers = mergeHeaders(defaultOptions.headers, requestOptions?.headers);

  const fetchOptions: RequestInit = {
    ...defaultOptions,
    method,
  };

  if (headers) {
    fetchOptions.headers = headers;
  }

  if (requestOptions?.body !== undefined) {
    if (isJsonBody(requestOptions.body)) {
      fetchOptions.body = JSON.stringify(requestOptions.body);
      headers = mergeHeaders(headers, { "Content-Type": "application/json" });
      if (headers) {
        fetchOptions.headers = headers;
      }
    } else {
      fetchOptions.body = requestOptions.body as BodyInit;
    }
  }

  const response = await fetch(url, fetchOptions);

  const contentType = response.headers.get("content-type");
  const isJson = contentType?.includes("application/json");

  if (response.ok) {
    return {
      ok: true,
      status: response.status,
      data: (isJson ? await response.json() : response) as TData,
    };
  }

  return {
    ok: false,
    status: response.status,
    error: (isJson ? await response.json() : response) as TError,
  };
}
