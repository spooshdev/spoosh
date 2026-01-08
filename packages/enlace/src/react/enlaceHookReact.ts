import { enlace, type EnlaceOptions } from "enlace-core";
import type { EnlaceHookOptions, EnlaceHooks } from "./types";
import type { ReactOptionsMap } from "./types/request.types";
import { createHooksFactory } from "./createHooksFactory";

/**
 * Creates React hooks for making API calls.
 * Returns { useRead, useWrite, useInfiniteRead }.
 *
 * @example
 * const { useRead, useWrite, useInfiniteRead } = enlaceHookReact<ApiSchema>('https://api.com');
 *
 * // Read - auto-fetch GET requests
 * const { loading, data, error } = useRead((api) => api.posts.$get({ query: { userId } }));
 *
 * // Write - trigger-based mutations
 * const { trigger, loading } = useWrite((api) => api.posts.$delete);
 * onClick={() => trigger({ body: { id: 1 } })}
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
export function enlaceHookReact<TSchema = unknown, TDefaultError = unknown>(
  baseUrl: string,
  defaultOptions: EnlaceOptions = {},
  hookOptions: EnlaceHookOptions = {}
): EnlaceHooks<TSchema, TDefaultError, ReactOptionsMap> {
  const {
    autoGenerateTags = true,
    autoRevalidateTags = true,
    staleTime = 0,
    onSuccess,
    onError,
    middlewares,
    retry,
    retryDelay,
  } = hookOptions;

  const api = enlace<TSchema, TDefaultError>(baseUrl, defaultOptions, {
    onSuccess,
    onError,
    middlewares,
  });

  return createHooksFactory<TSchema, TDefaultError, ReactOptionsMap>(api, {
    autoGenerateTags,
    autoRevalidateTags,
    staleTime,
    retry,
    retryDelay,
  });
}
