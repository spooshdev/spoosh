import { useRef, useReducer } from "react";
import type { EnlaceResponse } from "enlace-core";
import type { ReactRequestOptionsBase, UseEnlaceSelectorResult } from "./types";
import { hookReducer, initialState } from "./reducer";
import { generateTags } from "../utils/generateTags";
import { invalidateTags } from "./revalidator";

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

function hasPathParams(path: string[]): boolean {
  return path.some((segment) => segment.startsWith(":"));
}

export type SelectorModeConfig = {
  method: (...args: unknown[]) => Promise<EnlaceResponse<unknown, unknown>>;
  api: unknown;
  path: string[];
  methodName: string;
  autoRevalidateTags: boolean;
};

export function useSelectorMode<
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Required for method type inference
  TMethod extends (...args: any[]) => Promise<EnlaceResponse<unknown, unknown>>,
>(config: SelectorModeConfig): UseEnlaceSelectorResult<TMethod> {
  const { method, api, path, methodName, autoRevalidateTags } = config;
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

  if (!triggerRef.current) {
    triggerRef.current = (async (...args: unknown[]) => {
      dispatch({ type: "FETCH_START" });

      const options = args[0] as ReactRequestOptionsBase | undefined;
      const resolvedPath = resolvePath(pathRef.current, options?.pathParams);

      let res: EnlaceResponse<unknown, unknown>;

      if (hasPathParams(pathRef.current)) {
        let current: unknown = apiRef.current;
        for (const segment of resolvedPath) {
          current = (current as Record<string, unknown>)[segment];
        }
        const resolvedMethod = (current as Record<string, unknown>)[
          methodNameRef.current
        ] as (...args: unknown[]) => Promise<EnlaceResponse<unknown, unknown>>;
        res = await resolvedMethod(...args);
      } else {
        res = await methodRef.current(...args);
      }

      if (!res.error) {
        dispatch({ type: "FETCH_SUCCESS", data: res.data });

        const tagsToInvalidate =
          options?.revalidateTags ??
          (autoRevalidateRef.current ? generateTags(resolvedPath) : []);

        if (tagsToInvalidate.length > 0) {
          invalidateTags(tagsToInvalidate);
        }
      } else {
        dispatch({ type: "FETCH_ERROR", error: res.error });
      }

      return res;
    }) as TMethod;
  }

  return {
    trigger: triggerRef.current,
    ...state,
  } as UseEnlaceSelectorResult<TMethod>;
}
