import {
  executeFetch,
  type EnlaceCallbackPayload,
  type EnlaceCallbacks,
  type EnlaceOptions,
  type EnlaceResponse,
  type HttpMethod,
  type RequestOptions,
} from "enlace-core";
import type { NextOptions, NextRequestOptionsBase } from "./types";
import { generateTags } from "../utils/generateTags";

type NextFetchOptions = Pick<NextRequestOptionsBase, "tags" | "revalidate">;

type CombinedOptions = EnlaceOptions & NextOptions & EnlaceCallbacks;

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
    skipServerRevalidation = false,
    serverRevalidator,
    onSuccess,
    ...coreOptions
  } = combinedOptions;

  const isGet = method === "GET";
  const autoTags = generateTags(path);

  const nextOnSuccess = (payload: EnlaceCallbackPayload<unknown>) => {
    if (!isGet) {
      const shouldRevalidateServer =
        requestOptions?.serverRevalidate ?? !skipServerRevalidation;

      if (shouldRevalidateServer) {
        const revalidateTags =
          requestOptions?.revalidateTags ??
          (autoRevalidateTags ? autoTags : []);
        const revalidatePaths = requestOptions?.revalidatePaths ?? [];

        if (revalidateTags.length || revalidatePaths.length) {
          serverRevalidator?.(revalidateTags, revalidatePaths);
        }
      }
    }
    onSuccess?.(payload);
  };

  const nextRequestOptions: RequestOptions<unknown> & {
    next?: NextFetchOptions;
  } = { ...requestOptions };

  if (isGet) {
    const tags =
      requestOptions?.tags ?? (autoGenerateTags ? autoTags : undefined);
    const nextFetchOptions: NextFetchOptions = {};

    if (tags) {
      nextFetchOptions.tags = tags;
    }

    if (requestOptions?.revalidate !== undefined) {
      nextFetchOptions.revalidate = requestOptions.revalidate;
    }

    nextRequestOptions.next = nextFetchOptions;
  }

  return executeFetch<TData, TError>(
    baseUrl,
    path,
    method,
    { ...coreOptions, onSuccess: nextOnSuccess },
    nextRequestOptions
  );
}
