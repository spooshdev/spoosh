import { buildUrl, isJsonBody, mergeHeaders } from "./utils";
import type {
  EnlaceCallbacks,
  EnlaceOptions,
  EnlaceResponse,
  HttpMethod,
  RequestOptions,
} from "./types";

export async function executeFetch<TData, TError>(
  baseUrl: string,
  path: string[],
  method: HttpMethod,
  defaultOptions: EnlaceOptions & EnlaceCallbacks,
  requestOptions?: RequestOptions<unknown>
): Promise<EnlaceResponse<TData, TError>> {
  const { onSuccess, onError, ...fetchDefaults } = defaultOptions;

  const url = buildUrl(baseUrl, path, requestOptions?.query);

  let headers = mergeHeaders(fetchDefaults.headers, requestOptions?.headers);

  const fetchOptions: RequestInit = { ...fetchDefaults, method };

  if (headers) {
    fetchOptions.headers = headers;
  }

  fetchOptions.cache = requestOptions?.cache ?? fetchDefaults?.cache;

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
      return { ok: true, ...payload };
    }

    const payload = { status, error: body, headers };
    onError?.(payload);
    return { ok: false, ...payload };
  } catch (err) {
    const errorPayload = {
      status: 0 as const,
      error: err as Error,
      headers: null,
    };
    onError?.(errorPayload);
    return { ok: false, ...errorPayload };
  }
}
