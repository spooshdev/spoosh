import { useRef, useReducer, useCallback } from "react";
import {
  generateTags,
  type EnlaceResponse,
  type ResolvedCacheConfig,
} from "enlace-core";
import type { AnyReactRequestOptions, UseEnlaceWriteResult } from "../types";
import { hookReducer, initialState } from "../reducer";
import { invalidateTags } from "../revalidator";
import {
  setCacheOptimistic,
  confirmOptimistic,
  rollbackOptimistic,
  updateCacheByTags,
} from "../cache";
import {
  createTrackingProxy,
  SELECTOR_PATH_KEY,
  type MethodWithPath,
} from "../trackingProxy";
import { cache } from "../optimistic";
import { resolveInvalidateTagsRuntime } from "../invalidationProxy";

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

function hasPathParams(path: string[]): boolean {
  return path.some((segment) => segment.startsWith(":"));
}

function extractTagsFromMethod(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  method: (...args: any[]) => Promise<EnlaceResponse<unknown, unknown>>
): string[] {
  const path = (method as unknown as MethodWithPath)[SELECTOR_PATH_KEY];

  if (!path) return [];

  return generateTags(path);
}

export type WriteModeConfig = {
  method: (...args: unknown[]) => Promise<EnlaceResponse<unknown, unknown>>;
  api: unknown;
  path: string[];
  methodName: string;
  autoRevalidateTags: boolean;
  retry?: number | false;
  retryDelay?: number;
};

function normalizeOptimisticConfigs(
  result: ResolvedCacheConfig | ResolvedCacheConfig[] | undefined
): ResolvedCacheConfig[] {
  if (!result) return [];

  return Array.isArray(result) ? result : [result];
}

export function useWriteImpl<
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  TMethod extends (...args: any[]) => Promise<EnlaceResponse<unknown, unknown>>,
>(config: WriteModeConfig): UseEnlaceWriteResult<TMethod> {
  const {
    method,
    api,
    path,
    methodName,
    autoRevalidateTags,
    retry,
    retryDelay,
  } = config;
  const [state, dispatch] = useReducer(hookReducer, initialState);

  const methodRef = useRef(method);
  const apiRef = useRef(api);
  const triggerRef = useRef<TMethod | null>(null);
  const pathRef = useRef(path);
  const methodNameRef = useRef(methodName);
  const autoRevalidateRef = useRef(autoRevalidateTags);

  methodRef.current = method;
  apiRef.current = api;
  pathRef.current = path;
  methodNameRef.current = methodName;
  autoRevalidateRef.current = autoRevalidateTags;

  const abortControllerRef = useRef<AbortController | null>(null);

  const abort = useCallback(() => {
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
  }, []);

  if (!triggerRef.current) {
    triggerRef.current = (async (...args: unknown[]) => {
      dispatch({ type: "MUTATION_START" });

      abortControllerRef.current = new AbortController();
      const signal = abortControllerRef.current.signal;

      const options = args[0] as AnyReactRequestOptions | undefined;

      const resolvedInvalidateTags = resolveInvalidateTagsRuntime(
        options?.invalidate
      );

      const optionsWithSignal = {
        retry,
        retryDelay,
        ...options,
        invalidate:
          resolvedInvalidateTags.length > 0
            ? resolvedInvalidateTags
            : undefined,
        signal,
      };
      const argsWithSignal = [optionsWithSignal, ...args.slice(1)];

      const resolvedPath = resolvePath(pathRef.current, options?.params);

      let optimisticConfigs: ResolvedCacheConfig[] = [];

      if (options?.optimistic) {
        const trackingProxy = createTrackingProxy(() => {});
        const callbackResult = options.optimistic(cache, trackingProxy);
        optimisticConfigs = normalizeOptimisticConfigs(callbackResult);
      }

      const immediateUpdates = optimisticConfigs.filter(
        (c) => c.timing !== "onSuccess"
      );
      const onSuccessUpdates = optimisticConfigs.filter(
        (c) => c.timing === "onSuccess"
      );

      const affectedKeysByConfig: Map<ResolvedCacheConfig, string[]> =
        new Map();
      const immediateTagsSet = new Set<string>();

      for (const cfg of immediateUpdates) {
        const tags = extractTagsFromMethod(cfg.for);

        if (!cfg.refetch) {
          tags.forEach((t) => immediateTagsSet.add(t));
        }

        const keys = setCacheOptimistic(tags, cfg.updater, cfg.match);
        affectedKeysByConfig.set(cfg, keys);
      }

      let res: EnlaceResponse<unknown, unknown>;

      try {
        if (hasPathParams(pathRef.current)) {
          let current: unknown = apiRef.current;

          for (const segment of resolvedPath) {
            current = (current as Record<string, unknown>)[segment];
          }

          const resolvedMethod = (current as Record<string, unknown>)[
            methodNameRef.current
          ] as (
            ...args: unknown[]
          ) => Promise<EnlaceResponse<unknown, unknown>>;

          res = await resolvedMethod(...argsWithSignal);
        } else {
          res = await methodRef.current(...argsWithSignal);
        }
      } catch (error) {
        for (const cfg of immediateUpdates) {
          if (cfg.rollbackOnError !== false) {
            const keys = affectedKeysByConfig.get(cfg) ?? [];
            rollbackOptimistic(keys);
          }

          cfg.onError?.(error);
        }

        throw error;
      }

      if (res.aborted) {
        for (const cfg of immediateUpdates) {
          const keys = affectedKeysByConfig.get(cfg) ?? [];
          rollbackOptimistic(keys);
        }

        return res;
      }

      if (!res.error) {
        dispatch({ type: "FETCH_SUCCESS", data: res.data });

        for (const cfg of immediateUpdates) {
          const keys = affectedKeysByConfig.get(cfg) ?? [];
          confirmOptimistic(keys);
        }

        for (const cfg of onSuccessUpdates) {
          const tags = extractTagsFromMethod(cfg.for);

          if (!cfg.refetch) {
            tags.forEach((t) => immediateTagsSet.add(t));
          }

          updateCacheByTags(tags, cfg.updater, res.data, cfg.match);
        }

        const autoInvalidate =
          options?.autoInvalidate ??
          (autoRevalidateRef.current ? "all" : false);

        let autoTags: string[] = [];

        if (autoInvalidate === "all") {
          autoTags = generateTags(resolvedPath);
        } else if (autoInvalidate === "self") {
          autoTags = [resolvedPath.join("/")];
        }

        const customTags = resolveInvalidateTagsRuntime(options?.invalidate);
        const tagsToInvalidate = [...new Set([...autoTags, ...customTags])];

        const filteredTags = tagsToInvalidate.filter(
          (t) => !immediateTagsSet.has(t)
        );

        if (filteredTags.length > 0) {
          invalidateTags(filteredTags);
        }
      } else {
        dispatch({ type: "FETCH_ERROR", error: res.error });

        for (const cfg of immediateUpdates) {
          if (cfg.rollbackOnError !== false) {
            const keys = affectedKeysByConfig.get(cfg) ?? [];
            rollbackOptimistic(keys);
            const tags = extractTagsFromMethod(cfg.for);
            invalidateTags(tags);
          }

          cfg.onError?.(res.error);
        }
      }

      return res;
    }) as TMethod;
  }

  return {
    trigger: triggerRef.current,
    abort,
    ...state,
  } as UseEnlaceWriteResult<TMethod>;
}
