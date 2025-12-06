import { buildUrl, isJsonBody, mergeHeaders } from "../utils";
import type { EnlaceResponse, HttpMethod, RequestOptions } from "../core/types";
import type {
  NextEnlaceOptions,
  NextFetchOptions,
  NextRequestOptionsBase,
} from "./types";

function generateTags(path: string[]): string[] {
  return path.map((_, i) => path.slice(0, i + 1).join("/"));
}

export async function executeNextFetch<TData, TError>(
  baseUrl: string,
  path: string[],
  method: HttpMethod,
  defaultOptions: NextEnlaceOptions,
  requestOptions?: RequestOptions<unknown> & NextRequestOptionsBase
): Promise<EnlaceResponse<TData, TError>> {
  const url = buildUrl(baseUrl, path, requestOptions?.query);

  let headers = mergeHeaders(defaultOptions.headers, requestOptions?.headers);

  const nextOptions = requestOptions?.next;
  const tags = nextOptions?.tags ?? generateTags(path);

  const fetchOptions: RequestInit & { next?: NextFetchOptions } = {
    ...defaultOptions,
    method,
  };

  if (requestOptions?.cache) {
    fetchOptions.cache = requestOptions.cache;
  }

  const nextFetchOptions: NextFetchOptions = { tags };
  if (nextOptions?.revalidate !== undefined) {
    nextFetchOptions.revalidate = nextOptions.revalidate;
  }
  fetchOptions.next = nextFetchOptions;

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
