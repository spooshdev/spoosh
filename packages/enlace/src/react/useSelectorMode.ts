import { useRef, useState } from "react";
import type { EnlaceResponse } from "enlace-core";
import type {
  HookState,
  ReactRequestOptionsBase,
  UseEnlaceSelectorResult,
} from "./types";
import { generateTags } from "../utils/generateTags";
import { invalidateTags } from "./revalidator";

export function useSelectorMode<
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Required for method type inference
  TMethod extends (...args: any[]) => Promise<EnlaceResponse<unknown, unknown>>,
>(
  method: (...args: unknown[]) => Promise<EnlaceResponse<unknown, unknown>>,
  path: string[],
  autoRevalidateTags: boolean
): UseEnlaceSelectorResult<TMethod> {
  const [state, setState] = useState<HookState>({
    loading: false,
    ok: undefined,
    data: undefined,
    error: undefined,
  });

  const methodRef = useRef(method);
  const triggerRef = useRef<TMethod | null>(null);
  const pathRef = useRef(path);
  const autoRevalidateRef = useRef(autoRevalidateTags);

  methodRef.current = method;
  pathRef.current = path;
  autoRevalidateRef.current = autoRevalidateTags;

  if (!triggerRef.current) {
    triggerRef.current = (async (...args: unknown[]) => {
      setState((s) => ({ ...s, loading: true }));
      const res = await methodRef.current(...args);
      setState({
        loading: false,
        ok: res.ok,
        data: res.ok ? res.data : undefined,
        error: res.ok ? undefined : res.error,
      });

      if (res.ok) {
        const options = args[0] as ReactRequestOptionsBase | undefined;
        const tagsToInvalidate =
          options?.revalidateTags ??
          (autoRevalidateRef.current ? generateTags(pathRef.current) : []);

        if (tagsToInvalidate.length > 0) {
          invalidateTags(tagsToInvalidate);
        }
      }

      return res;
    }) as TMethod;
  }

  return {
    trigger: triggerRef.current,
    ...state,
  } as UseEnlaceSelectorResult<TMethod>;
}
