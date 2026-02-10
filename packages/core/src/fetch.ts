import {
  buildUrl,
  generateTags,
  mergeHeaders,
  resolveRequestBody,
  isAbortError,
} from "./utils";
import type {
  AnyRequestOptions,
  SpooshOptions,
  SpooshResponse,
  HttpMethod,
} from "./types";
import type { Transport, TransportOption } from "./transport/types";
import { fetchTransport } from "./transport/fetch";
import { xhrTransport } from "./transport/xhr";

export async function executeFetch<TData, TError>(
  baseUrl: string,
  path: string[],
  method: HttpMethod,
  defaultOptions: SpooshOptions,
  requestOptions?: AnyRequestOptions,
  nextTags?: boolean
): Promise<SpooshResponse<TData, TError>> {
  return executeCoreFetch<TData, TError>({
    baseUrl,
    path,
    method,
    defaultOptions,
    requestOptions,
    middlewareFetchInit: undefined,
    nextTags,
  });
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

  if (requestOptions?.params !== undefined) {
    fields.params = requestOptions.params;
  }

  if (Object.keys(fields).length === 0) {
    return {};
  }

  return { input: fields };
}

function resolveTransport(option?: TransportOption): Transport {
  if (option === "xhr" && typeof XMLHttpRequest !== "undefined") {
    return xhrTransport as Transport;
  }

  return fetchTransport;
}

type CoreFetchConfig = {
  baseUrl: string;
  path: string[];
  method: HttpMethod;
  defaultOptions: SpooshOptions;
  requestOptions?: AnyRequestOptions;
  middlewareFetchInit?: RequestInit;
  nextTags?: boolean;
};

async function executeCoreFetch<TData, TError>(
  config: CoreFetchConfig
): Promise<SpooshResponse<TData, TError>> {
  const {
    baseUrl,
    path,
    method,
    defaultOptions,
    requestOptions,
    middlewareFetchInit,
    nextTags,
  } = config;
  const {
    headers: defaultHeaders,
    transport: defaultTransport,
    ...fetchDefaults
  } = defaultOptions;

  const inputFields = buildInputFields(requestOptions);

  const finalPath = path;
  const url = buildUrl(baseUrl, finalPath, requestOptions?.query);

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

  if (nextTags) {
    const autoTags = generateTags(path);
    const userNext = (
      requestOptions as {
        next?: { tags?: string[]; revalidate?: number | false };
      }
    )?.next;

    (
      fetchInit as RequestInit & {
        next?: { tags?: string[]; revalidate?: number | false };
      }
    ).next = {
      tags: userNext?.tags ?? autoTags,
      ...(userNext?.revalidate !== undefined && {
        revalidate: userNext.revalidate,
      }),
    };
  }

  if (requestOptions?.signal) {
    fetchInit.signal = requestOptions.signal;
  }

  if (requestOptions?.body !== undefined) {
    const resolved = resolveRequestBody(requestOptions.body);

    if (resolved) {
      fetchInit.body = resolved.body;

      if (resolved.headers) {
        headers = await mergeHeaders(headers, resolved.headers);

        if (headers) {
          fetchInit.headers = headers;
        }
      }
    }
  }

  const resolvedTransport = resolveTransport(
    requestOptions?.transport ?? defaultTransport
  );

  if (requestOptions && headers) {
    requestOptions.headers = headers;
  }

  try {
    const result = await resolvedTransport(
      url,
      fetchInit,
      requestOptions?.transportOptions
    );

    if (result.ok) {
      return {
        status: result.status,
        data: result.data as TData,
        headers: result.headers,
        error: undefined,
        ...inputFields,
      };
    }

    const error =
      result.data !== undefined && result.data !== "" ? result.data : {};

    return {
      status: result.status,
      error: error as TError,
      headers: result.headers,
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

    return { status: 0, error: err as TError, data: undefined, ...inputFields };
  }
}
