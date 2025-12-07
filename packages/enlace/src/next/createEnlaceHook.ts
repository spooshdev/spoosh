"use client";

import type { EnlaceOptions, EnlaceResponse } from "enlace-core";
import { createEnlace } from "./index";
import type { NextHookOptions, NextRequestOptionsBase } from "./types";
import type {
  ApiClient,
  QueryFn,
  SelectorFn,
  TrackedCall,
  UseEnlaceQueryResult,
  UseEnlaceSelectorResult,
} from "../react/types";
import { useQueryMode } from "../react/useQueryMode";
import { useSelectorMode } from "../react/useSelectorMode";
import { createTrackingProxy } from "../react/trackingProxy";

type NextApiClient<TSchema> = ApiClient<TSchema, NextRequestOptionsBase>;
type NextQueryFn<TSchema, TData, TError> = QueryFn<
  TSchema,
  TData,
  TError,
  NextRequestOptionsBase
>;
type NextSelectorFn<TSchema, TMethod> = SelectorFn<
  TSchema,
  TMethod,
  NextRequestOptionsBase
>;

type NextEnlaceHook<TSchema> = {
  <
    TMethod extends (
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Required for method type inference
      ...args: any[]
    ) => Promise<EnlaceResponse<unknown, unknown>>,
  >(
    selector: NextSelectorFn<TSchema, TMethod>
  ): UseEnlaceSelectorResult<TMethod>;

  <TData, TError>(
    queryFn: NextQueryFn<TSchema, TData, TError>
  ): UseEnlaceQueryResult<TData, TError>;
};

/**
 * Creates a React hook for making API calls in Next.js Client Components.
 * Uses Next.js-specific features like revalidator for server-side cache invalidation.
 *
 * @example
 * const useAPI = createEnlaceHook<ApiSchema>('https://api.com', {}, {
 *   revalidator: (tags) => revalidateTagsAction(tags),
 *   staleTime: 5000,
 * });
 *
 * // Query mode - auto-fetch
 * const { loading, data, error } = useAPI((api) => api.posts.get());
 *
 * // Selector mode - trigger for mutations
 * const { trigger } = useAPI((api) => api.posts.delete);
 */
export function createEnlaceHook<TSchema = unknown>(
  baseUrl: string,
  defaultOptions: EnlaceOptions = {},
  hookOptions: NextHookOptions = {}
): NextEnlaceHook<TSchema> {
  const {
    autoGenerateTags = true,
    autoRevalidateTags = true,
    staleTime = 0,
    ...nextOptions
  } = hookOptions;
  const api = createEnlace<TSchema>(baseUrl, defaultOptions, {
    autoGenerateTags,
    autoRevalidateTags,
    ...nextOptions,
  });

  function useEnlaceHook<
    TData,
    TError,
    TMethod extends (
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Required for method type inference
      ...args: any[]
    ) => Promise<EnlaceResponse<unknown, unknown>>,
  >(
    selectorOrQuery:
      | NextSelectorFn<TSchema, TMethod>
      | NextQueryFn<TSchema, TData, TError>
  ): UseEnlaceSelectorResult<TMethod> | UseEnlaceQueryResult<TData, TError> {
    let trackedCall: TrackedCall | null = null;
    let selectorPath: string[] | null = null;

    const trackingProxy = createTrackingProxy<TSchema>((result) => {
      trackedCall = result.trackedCall;
      selectorPath = result.selectorPath;
    });

    const result = (
      selectorOrQuery as (api: NextApiClient<TSchema>) => unknown
    )(trackingProxy as NextApiClient<TSchema>);

    if (typeof result === "function") {
      const actualResult = (
        selectorOrQuery as (api: NextApiClient<TSchema>) => unknown
      )(api as NextApiClient<TSchema>);
      return useSelectorMode<TMethod>(
        actualResult as (
          ...args: unknown[]
        ) => Promise<EnlaceResponse<unknown, unknown>>,
        selectorPath ?? [],
        autoRevalidateTags
      );
    }

    return useQueryMode<TSchema, TData, TError>(
      api as unknown as import("../react/types").ApiClient<TSchema>,
      trackedCall!,
      { autoGenerateTags, staleTime }
    );
  }

  return useEnlaceHook as NextEnlaceHook<TSchema>;
}
