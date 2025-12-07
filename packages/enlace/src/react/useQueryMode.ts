import { useRef, useState, useEffect, useCallback } from "react";
import type { EnlaceResponse } from "enlace-core";
import type {
  ApiClient,
  HookState,
  ReactRequestOptionsBase,
  TrackedCall,
  UseEnlaceQueryResult,
} from "./types";
import { HTTP_METHODS } from "./types";
import { generateTags } from "../utils/generateTags";
import { onRevalidate } from "./revalidator";

function createQueryKey(tracked: TrackedCall): string {
  return JSON.stringify({
    path: tracked.path,
    method: tracked.method,
    options: tracked.options,
  });
}

export type TrackingResult = {
  trackedCall: TrackedCall | null;
  selectorPath: string[] | null;
  selectorMethod: string | null;
};

export function createTrackingProxy<TSchema>(
  onTrack: (result: TrackingResult) => void
): ApiClient<TSchema> {
  const createProxy = (path: string[] = []): unknown => {
    return new Proxy(() => {}, {
      get(_, prop: string) {
        if (HTTP_METHODS.includes(prop as (typeof HTTP_METHODS)[number])) {
          const methodFn = (options?: unknown) => {
            onTrack({
              trackedCall: { path, method: prop, options },
              selectorPath: null,
              selectorMethod: null,
            });
            return Promise.resolve({ ok: true, data: undefined });
          };
          onTrack({
            trackedCall: null,
            selectorPath: path,
            selectorMethod: prop,
          });
          return methodFn;
        }
        return createProxy([...path, prop]);
      },
    });
  };
  return createProxy() as ApiClient<TSchema>;
}

export function useQueryMode<TSchema, TData, TError>(
  api: ApiClient<TSchema>,
  trackedCall: TrackedCall,
  autoGenerateTags: boolean
): UseEnlaceQueryResult<TData, TError> {
  const [state, setState] = useState<HookState>({
    loading: true,
    ok: undefined,
    data: undefined,
    error: undefined,
  });

  const queryKey = createQueryKey(trackedCall);
  const prevKeyRef = useRef<string | null>(null);
  const isFetchingRef = useRef(false);

  const options = trackedCall.options as ReactRequestOptionsBase | undefined;
  const queryTags =
    options?.tags ?? (autoGenerateTags ? generateTags(trackedCall.path) : []);
  const queryTagsKey = JSON.stringify(queryTags);

  const fetchData = useCallback(() => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;

    setState((s) => ({ ...s, loading: true }));

    let current: unknown = api;
    for (const segment of trackedCall.path) {
      current = (current as Record<string, unknown>)[segment];
    }
    const method = (current as Record<string, unknown>)[trackedCall.method] as (
      opts?: unknown
    ) => Promise<EnlaceResponse<unknown, unknown>>;

    method(trackedCall.options).then((res) => {
      isFetchingRef.current = false;
      setState({
        loading: false,
        ok: res.ok,
        data: res.ok ? res.data : undefined,
        error: res.ok ? undefined : res.error,
      });
    });
  }, [api, trackedCall]);

  useEffect(() => {
    if (prevKeyRef.current === queryKey) return;
    prevKeyRef.current = queryKey;
    fetchData();
  }, [queryKey, fetchData]);

  useEffect(() => {
    if (queryTags.length === 0) return;

    return onRevalidate((invalidatedTags) => {
      const hasMatch = invalidatedTags.some((tag) => queryTags.includes(tag));
      if (hasMatch) {
        prevKeyRef.current = null;
        fetchData();
      }
    });
  }, [queryTagsKey, fetchData]);

  return state as UseEnlaceQueryResult<TData, TError>;
}
