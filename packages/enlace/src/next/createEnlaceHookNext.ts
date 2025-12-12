"use client";

import type { EnlaceOptions, EnlaceResponse } from "enlace-core";
import { createEnlaceNext } from "./index";
import type {
  NextApiClient,
  NextEnlaceHook,
  NextHookOptions,
  NextQueryFn,
  NextSelectorFn,
} from "./types";
import type {
  TrackedCall,
  UseEnlaceQueryOptions,
  UseEnlaceQueryResult,
  UseEnlaceSelectorResult,
} from "../react/types";
import { useQueryMode } from "../react/useQueryMode";
import { useSelectorMode } from "../react/useSelectorMode";
import { createTrackingProxy } from "../react/trackingProxy";

/**
 * Creates a React hook for making API calls in Next.js Client Components.
 * Uses Next.js-specific features like serverRevalidator for server-side cache invalidation.
 *
 * @example
 * const useAPI = createEnlaceHookNext<ApiSchema>('https://api.com', {}, {
 *   serverRevalidator: (tags) => revalidateTagsAction(tags),
 *   staleTime: 5000,
 * });
 *
 * // Query mode - auto-fetch
 * const { loading, data, error } = useAPI((api) => api.posts.get());
 *
 * // Selector mode - trigger for mutations
 * const { trigger } = useAPI((api) => api.posts.delete);
 */
export function createEnlaceHookNext<
  TSchema = unknown,
  TDefaultError = unknown,
>(
  baseUrl: string,
  defaultOptions: EnlaceOptions = {},
  hookOptions: NextHookOptions = {}
): NextEnlaceHook<TSchema, TDefaultError> {
  const {
    autoGenerateTags = true,
    autoRevalidateTags = true,
    staleTime = 0,
    ...nextOptions
  } = hookOptions;
  const api = createEnlaceNext<TSchema, TDefaultError>(
    baseUrl,
    defaultOptions,
    {
      autoGenerateTags,
      autoRevalidateTags,
      ...nextOptions,
    }
  );

  function useEnlaceHook<
    TData,
    TError,
    TMethod extends (
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Required for method type inference
      ...args: any[]
    ) => Promise<EnlaceResponse<unknown, unknown>>,
  >(
    selectorOrQuery:
      | NextSelectorFn<TSchema, TMethod, TDefaultError>
      | NextQueryFn<TSchema, TData, TError, TDefaultError>,
    queryOptions?: UseEnlaceQueryOptions
  ): UseEnlaceSelectorResult<TMethod> | UseEnlaceQueryResult<TData, TError> {
    let trackedCall: TrackedCall | null = null;
    let selectorPath: string[] | null = null;
    let selectorMethod: string | null = null;

    const trackingProxy = createTrackingProxy<TSchema>((result) => {
      trackedCall = result.trackedCall;
      selectorPath = result.selectorPath;
      selectorMethod = result.selectorMethod;
    });

    const result = (
      selectorOrQuery as (api: NextApiClient<TSchema, TDefaultError>) => unknown
    )(trackingProxy as NextApiClient<TSchema, TDefaultError>);

    if (typeof result === "function") {
      const actualResult = (
        selectorOrQuery as (
          api: NextApiClient<TSchema, TDefaultError>
        ) => unknown
      )(api as NextApiClient<TSchema, TDefaultError>);

      return useSelectorMode<TMethod>({
        method: actualResult as (
          ...args: unknown[]
        ) => Promise<EnlaceResponse<unknown, unknown>>,
        api,
        path: selectorPath ?? [],
        methodName: selectorMethod ?? "",
        autoRevalidateTags,
      });
    }

    if (!trackedCall) {
      throw new Error(
        "useAPI query mode requires calling an HTTP method (get, post, etc.). " +
          "Did you mean to use selector mode? Example: useAPI((api) => api.posts.get())"
      );
    }

    return useQueryMode<TSchema, TData, TError>(
      api as unknown as import("../react/types").ApiClient<
        TSchema,
        TDefaultError
      >,
      trackedCall,
      { autoGenerateTags, staleTime, enabled: queryOptions?.enabled ?? true }
    );
  }

  return useEnlaceHook as NextEnlaceHook<TSchema, TDefaultError>;
}
