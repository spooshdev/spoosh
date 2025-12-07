import {
  buildUrl,
  isJsonBody,
  mergeHeaders,
  type EnlaceOptions,
  type EnlaceResponse,
  type HttpMethod,
  type RequestOptions,
} from "enlace-core";
import type { NextOptions, NextRequestOptionsBase } from "./types";
import { generateTags } from "../utils/generateTags";

type NextFetchOptions = Pick<NextRequestOptionsBase, "tags" | "revalidate">;

type CombinedOptions = EnlaceOptions & NextOptions;

export async function executeNextFetch<TData, TError>(
  baseUrl: string,
  path: string[],
  method: HttpMethod,
  combinedOptions: CombinedOptions,
  requestOptions?: RequestOptions<unknown> & NextRequestOptionsBase
): Promise<EnlaceResponse<TData, TError>> {
  const {
    autoGenerateTags = true,
    autoRevalidateTags = true,
    revalidator,
    headers: defaultHeaders,
    ...restOptions
  } = combinedOptions;

  const url = buildUrl(baseUrl, path, requestOptions?.query);
  let headers = mergeHeaders(defaultHeaders, requestOptions?.headers);

  const isGet = method === "GET";
  const autoTags = generateTags(path);

  const fetchOptions: RequestInit & { next?: NextFetchOptions } = {
    ...restOptions,
    method,
  };

  if (requestOptions?.cache) {
    fetchOptions.cache = requestOptions.cache;
  }

  if (isGet) {
    const tags = requestOptions?.tags ?? (autoGenerateTags ? autoTags : undefined);
    const nextFetchOptions: NextFetchOptions = {};
    if (tags) {
      nextFetchOptions.tags = tags;
    }
    if (requestOptions?.revalidate !== undefined) {
      nextFetchOptions.revalidate = requestOptions.revalidate;
    }
    fetchOptions.next = nextFetchOptions;
  }

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
    if (!isGet && !requestOptions?.skipRevalidator) {
      const revalidateTags = requestOptions?.revalidateTags ?? (autoRevalidateTags ? autoTags : []);
      const revalidatePaths = requestOptions?.revalidatePaths ?? [];
      if (revalidateTags.length || revalidatePaths.length) {
        revalidator?.(revalidateTags, revalidatePaths);
      }
    }

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
