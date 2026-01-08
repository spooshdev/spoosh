"use client";

import type { EnlaceOptions } from "enlace-core";
import type { EnlaceHooks } from "enlace";
import { createHooksFactory } from "enlace";
import { enlace } from "../index";
import type { NextHookOptions, NextOptionsMap } from "../types";

/**
 * Creates React hooks for making API calls in Next.js Client Components.
 * Returns { useRead, useWrite, useInfiniteRead }.
 *
 * @example
 * import { enlaceHooks } from 'enlace-next/client';
 *
 * const { useRead, useWrite, useInfiniteRead } = enlaceHooks<ApiSchema>('https://api.com', {}, {
 *   serverRevalidator: (tags) => revalidateTagsAction(tags),
 * });
 *
 * // Read - auto-fetch GET requests
 * const { loading, data, error } = useRead((api) => api.posts.$get());
 *
 * // Write - trigger-based mutations
 * const { trigger } = useWrite((api) => api.posts.$delete);
 *
 * // Infinite Read - paginated data with fetchNext/fetchPrev
 * const { data, fetchNext, canFetchNext } = useInfiniteRead(
 *   (api) => api.posts.$get({ query: { limit: 10 } }),
 *   {
 *     canFetchNext: ({ response }) => response?.hasMore ?? false,
 *     nextPageRequest: ({ response }) => ({ query: { cursor: response?.nextCursor } }),
 *     merger: (allResponses) => allResponses.flatMap(r => r.items),
 *   }
 * );
 */
export function enlaceHooks<TSchema = unknown, TDefaultError = unknown>(
  baseUrl: string,
  defaultOptions: EnlaceOptions = {},
  hookOptions: NextHookOptions = {}
): EnlaceHooks<TSchema, TDefaultError, NextOptionsMap> {
  const {
    autoGenerateTags = true,
    autoRevalidateTags = true,
    staleTime = 0,
    retry,
    retryDelay,
    ...nextOptions
  } = hookOptions;

  const api = enlace<TSchema, TDefaultError>(baseUrl, defaultOptions, {
    autoGenerateTags,
    autoRevalidateTags,
    ...nextOptions,
  });

  return createHooksFactory<TSchema, TDefaultError, NextOptionsMap>(api, {
    autoGenerateTags,
    autoRevalidateTags,
    staleTime,
    retry,
    retryDelay,
  });
}

export { invalidateTags } from "enlace";
