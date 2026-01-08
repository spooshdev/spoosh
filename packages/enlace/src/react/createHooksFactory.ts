import type { EnlaceResponse } from "enlace-core";
import type {
  ApiClient,
  EnlaceHooks,
  ReadFn,
  WriteSelectorFn,
  UseEnlaceReadOptions,
  UseEnlaceReadResult,
  UseEnlaceWriteResult,
  InfiniteReadFn,
  UseEnlaceInfiniteReadOptions,
  UseEnlaceInfiniteReadResult,
} from "./types";
import { useReadImpl, type ReadModeOptions } from "./hooks/useRead";
import { useWriteImpl } from "./hooks/useWrite";
import {
  useInfiniteReadImpl,
  type InfiniteReadModeOptions,
} from "./hooks/useInfiniteRead";
import { createTrackingProxy, type TrackingResult } from "./trackingProxy";

export type HookFactoryConfig = {
  autoGenerateTags: boolean;
  autoRevalidateTags: boolean;
  staleTime: number;
  retry?: number | false;
  retryDelay?: number;
};

export function createHooksFactory<TSchema, TDefaultError, TOptionsMap>(
  api: unknown,
  config: HookFactoryConfig
): EnlaceHooks<TSchema, TDefaultError, TOptionsMap> {
  const { autoGenerateTags, autoRevalidateTags, staleTime, retry, retryDelay } =
    config;

  function useRead<TData, TError>(
    readFn: ReadFn<TSchema, TData, TError, TDefaultError, TOptionsMap>,
    readOptions?: UseEnlaceReadOptions<TData, TError>
  ): UseEnlaceReadResult<TData, TError> {
    let trackingResult: TrackingResult = {
      trackedCall: null,
      selectorPath: null,
      selectorMethod: null,
    };

    const trackingProxy = createTrackingProxy<TSchema>((result) => {
      trackingResult = result;
    });

    (
      readFn as (api: ApiClient<TSchema, TDefaultError, TOptionsMap>) => unknown
    )(
      trackingProxy as unknown as ApiClient<TSchema, TDefaultError, TOptionsMap>
    );

    if (!trackingResult.trackedCall) {
      throw new Error(
        "useRead requires calling an HTTP method ($get). " +
          "Example: useRead((api) => api.posts.$get())"
      );
    }

    const options: ReadModeOptions<TData, TError> = {
      autoGenerateTags,
      staleTime,
      enabled: readOptions?.enabled ?? true,
      pollingInterval: readOptions?.pollingInterval,
      retry: readOptions?.retry ?? retry,
      retryDelay: readOptions?.retryDelay ?? retryDelay,
    };

    return useReadImpl<unknown, TData, TError>(
      api as unknown as ApiClient<unknown>,
      trackingResult.trackedCall,
      options
    );
  }

  function useWrite<
    TMethod extends (
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ...args: any[]
    ) => Promise<EnlaceResponse<unknown, unknown>>,
  >(
    selectorFn: WriteSelectorFn<TSchema, TMethod, TDefaultError, TOptionsMap>
  ): UseEnlaceWriteResult<TMethod> {
    let trackingResult: TrackingResult = {
      trackedCall: null,
      selectorPath: null,
      selectorMethod: null,
    };

    const trackingProxy = createTrackingProxy<TSchema>((result) => {
      trackingResult = result;
    });

    (
      selectorFn as (
        api: ApiClient<TSchema, TDefaultError, TOptionsMap>
      ) => unknown
    )(
      trackingProxy as unknown as ApiClient<TSchema, TDefaultError, TOptionsMap>
    );

    const actualMethod = (
      selectorFn as (
        api: ApiClient<TSchema, TDefaultError, TOptionsMap>
      ) => unknown
    )(api as unknown as ApiClient<TSchema, TDefaultError, TOptionsMap>);

    return useWriteImpl<TMethod>({
      method: actualMethod as (
        ...args: unknown[]
      ) => Promise<EnlaceResponse<unknown, unknown>>,
      api,
      path: trackingResult.selectorPath ?? [],
      methodName: trackingResult.selectorMethod ?? "",
      autoRevalidateTags,
      retry,
      retryDelay,
    });
  }

  function useInfiniteRead<
    TData,
    TError,
    TItem = TData extends Array<infer U> ? U : TData,
    TRequest = unknown,
  >(
    readFn: InfiniteReadFn<TSchema, TDefaultError, TOptionsMap>,
    readOptions: UseEnlaceInfiniteReadOptions<TData, TItem, TRequest>
  ): UseEnlaceInfiniteReadResult<TData, TError, TItem> {
    let trackingResult: TrackingResult = {
      trackedCall: null,
      selectorPath: null,
      selectorMethod: null,
    };

    const trackingProxy = createTrackingProxy<TSchema>((result) => {
      trackingResult = result;
    });

    (
      readFn as (api: ApiClient<TSchema, TDefaultError, TOptionsMap>) => unknown
    )(
      trackingProxy as unknown as ApiClient<TSchema, TDefaultError, TOptionsMap>
    );

    if (!trackingResult.trackedCall) {
      throw new Error(
        "useInfiniteRead requires calling an HTTP method ($get, $post, etc). " +
          "Example: useInfiniteRead((api) => api.posts.$get({ query: { limit: 10 } }), options)"
      );
    }

    const options = {
      autoGenerateTags,
      staleTime,
      ...readOptions,
      enabled: readOptions.enabled ?? true,
      retry: readOptions.retry ?? retry,
      retryDelay: readOptions.retryDelay ?? retryDelay,
    };

    return useInfiniteReadImpl<unknown, TData, TError, TItem>(
      api as unknown as ApiClient<unknown>,
      trackingResult.trackedCall,
      options as unknown as InfiniteReadModeOptions<TData, TItem>
    );
  }

  return {
    useRead,
    useWrite,
    useInfiniteRead,
  } as EnlaceHooks<TSchema, TDefaultError, TOptionsMap>;
}
