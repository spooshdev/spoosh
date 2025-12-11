import { useRef, useReducer, useEffect } from "react";
import type { EnlaceResponse } from "enlace-core";
import type {
  ApiClient,
  HookState,
  ReactRequestOptionsBase,
  TrackedCall,
  UseEnlaceQueryResult,
} from "./types";
import { hookReducer } from "./reducer";
import { generateTags } from "../utils/generateTags";
import { onRevalidate } from "./revalidator";
import {
  createQueryKey,
  getCache,
  setCache,
  subscribeCache,
  isStale,
} from "./cache";

function resolvePath(
  path: string[],
  pathParams: Record<string, string | number> | undefined
): string[] {
  if (!pathParams) return path;
  return path.map((segment) => {
    if (segment.startsWith(":")) {
      const paramName = segment.slice(1);
      const value = pathParams[paramName];
      if (value === undefined) {
        throw new Error(`Missing path parameter: ${paramName}`);
      }
      return String(value);
    }
    return segment;
  });
}

export type QueryModeOptions = {
  autoGenerateTags: boolean;
  staleTime: number;
  enabled: boolean;
};

export function useQueryMode<TSchema, TData, TError>(
  api: ApiClient<TSchema>,
  trackedCall: TrackedCall,
  options: QueryModeOptions
): UseEnlaceQueryResult<TData, TError> {
  const { autoGenerateTags, staleTime, enabled } = options;
  const queryKey = createQueryKey(trackedCall);

  const requestOptions = trackedCall.options as
    | ReactRequestOptionsBase
    | undefined;
  const resolvedPath = resolvePath(
    trackedCall.path,
    requestOptions?.pathParams
  );
  const queryTags =
    requestOptions?.tags ??
    (autoGenerateTags ? generateTags(resolvedPath) : []);

  const getCacheState = (includeNeedsFetch = false): HookState => {
    const cached = getCache<TData, TError>(queryKey);
    const hasCachedData = cached?.data !== undefined;
    const isFetching = !!cached?.promise;
    const needsFetch =
      includeNeedsFetch && (!hasCachedData || isStale(queryKey, staleTime));
    return {
      loading: !hasCachedData && (isFetching || needsFetch),
      fetching: isFetching || needsFetch,
      data: cached?.data,
      error: cached?.error,
    };
  };

  const [state, dispatch] = useReducer(hookReducer, null, () =>
    getCacheState(true)
  );

  const mountedRef = useRef(true);
  const fetchRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    mountedRef.current = true;

    if (!enabled) {
      dispatch({ type: "RESET" });
      return () => {
        mountedRef.current = false;
      };
    }

    dispatch({ type: "RESET", state: getCacheState(true) });

    const doFetch = () => {
      const cached = getCache<TData, TError>(queryKey);

      if (cached?.promise) {
        return;
      }

      dispatch({ type: "FETCH_START" });

      let current: unknown = api;
      for (const segment of resolvedPath) {
        current = (current as Record<string, unknown>)[segment];
      }

      const method = (current as Record<string, unknown>)[
        trackedCall.method
      ] as (opts?: unknown) => Promise<EnlaceResponse<TData, TError>>;

      const fetchPromise = method(trackedCall.options).then((res) => {
        if (mountedRef.current) {
          setCache<TData, TError>(queryKey, {
            data: res.error ? undefined : res.data,
            error: res.error,
            timestamp: Date.now(),
            tags: queryTags,
          });
        }
      });

      setCache<TData, TError>(queryKey, {
        promise: fetchPromise,
        tags: queryTags,
      });
    };

    fetchRef.current = doFetch;

    const cached = getCache<TData, TError>(queryKey);
    if (cached?.data !== undefined && !isStale(queryKey, staleTime)) {
      dispatch({ type: "SYNC_CACHE", state: getCacheState() });
    } else {
      doFetch();
    }

    const unsubscribe = subscribeCache(queryKey, () => {
      if (mountedRef.current) {
        dispatch({ type: "SYNC_CACHE", state: getCacheState() });
      }
    });

    return () => {
      mountedRef.current = false;
      fetchRef.current = null;
      unsubscribe();
    };
  }, [queryKey, enabled]);

  useEffect(() => {
    if (queryTags.length === 0) return;

    return onRevalidate((invalidatedTags) => {
      const hasMatch = invalidatedTags.some((tag) => queryTags.includes(tag));
      if (hasMatch && mountedRef.current && fetchRef.current) {
        fetchRef.current();
      }
    });
  }, [JSON.stringify(queryTags)]);

  return state as UseEnlaceQueryResult<TData, TError>;
}
