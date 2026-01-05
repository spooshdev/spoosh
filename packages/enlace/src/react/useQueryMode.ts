import { useRef, useReducer, useEffect } from "react";
import type { EnlaceResponse } from "enlace-core";
import type {
  AnyReactRequestOptions,
  ApiClient,
  HookState,
  PollingInterval,
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
  params: Record<string, string | number> | undefined
): string[] {
  if (!params) return path;
  return path.map((segment) => {
    if (segment.startsWith(":")) {
      const paramName = segment.slice(1);
      const value = params[paramName];
      if (value === undefined) {
        throw new Error(`Missing path parameter: ${paramName}`);
      }
      return String(value);
    }
    return segment;
  });
}

export type QueryModeOptions<TData = unknown, TError = unknown> = {
  autoGenerateTags: boolean;
  staleTime: number;
  enabled: boolean;
  pollingInterval: PollingInterval<TData, TError> | undefined;
};

export function useQueryMode<TSchema, TData, TError>(
  api: ApiClient<TSchema>,
  trackedCall: TrackedCall,
  options: QueryModeOptions<TData, TError>
): UseEnlaceQueryResult<TData, TError> {
  const { autoGenerateTags, staleTime, enabled, pollingInterval } = options;
  const queryKey = createQueryKey(trackedCall);

  const requestOptions = trackedCall.options as
    | AnyReactRequestOptions
    | undefined;
  const resolvedPath = resolvePath(trackedCall.path, requestOptions?.params);
  const baseTags =
    requestOptions?.tags ??
    (autoGenerateTags ? generateTags(resolvedPath) : []);
  const queryTags = [...baseTags, ...(requestOptions?.additionalTags ?? [])];

  const getCacheState = (includeNeedsFetch = false): HookState => {
    const cached = getCache<TData, TError>(queryKey);
    const hasCachedData = cached?.data !== undefined;
    const isFetching = !!cached?.promise;
    const stale = isStale(queryKey, staleTime);
    const needsFetch = includeNeedsFetch && (!hasCachedData || stale);
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
  const pollingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pollingIntervalRef = useRef(pollingInterval);
  pollingIntervalRef.current = pollingInterval;

  useEffect(() => {
    mountedRef.current = true;

    if (!enabled) {
      dispatch({ type: "RESET" });

      if (pollingTimeoutRef.current) {
        clearTimeout(pollingTimeoutRef.current);
        pollingTimeoutRef.current = null;
      }

      return () => {
        mountedRef.current = false;
      };
    }

    dispatch({ type: "RESET", state: getCacheState(true) });

    const scheduleNextPoll = () => {
      const currentPollingInterval = pollingIntervalRef.current;

      if (
        !mountedRef.current ||
        !enabled ||
        currentPollingInterval === undefined
      ) {
        return;
      }

      const cached = getCache<TData, TError>(queryKey);
      const interval =
        typeof currentPollingInterval === "function"
          ? currentPollingInterval(cached?.data, cached?.error)
          : currentPollingInterval;

      if (interval === false || interval <= 0) {
        return;
      }

      if (pollingTimeoutRef.current) {
        clearTimeout(pollingTimeoutRef.current);
      }

      pollingTimeoutRef.current = setTimeout(() => {
        if (mountedRef.current && enabled && fetchRef.current) {
          fetchRef.current();
        }
      }, interval);
    };

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

      const fetchPromise = method(trackedCall.options)
        .then((res) => {
          setCache<TData, TError>(queryKey, {
            data: res.error ? undefined : res.data,
            error: res.error,
            timestamp: Date.now(),
            tags: queryTags,
          });
        })
        .catch((err: TError) => {
          setCache<TData, TError>(queryKey, {
            data: undefined,
            error: err,
            timestamp: Date.now(),
            tags: queryTags,
          });
        })
        .finally(() => {
          scheduleNextPoll();
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
      scheduleNextPoll();
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

      if (pollingTimeoutRef.current) {
        clearTimeout(pollingTimeoutRef.current);
        pollingTimeoutRef.current = null;
      }

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
