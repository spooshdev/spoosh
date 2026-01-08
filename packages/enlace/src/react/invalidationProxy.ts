import type { EnlaceResponse } from "enlace-core";
import {
  createTrackingProxy,
  SELECTOR_PATH_KEY,
  type MethodWithPath,
} from "./trackingProxy";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyInvalidateOption = string[] | ((api: any) => any[]);

export function resolveInvalidateTagsRuntime(
  invalidate: AnyInvalidateOption | undefined
): string[] {
  if (!invalidate) return [];

  if (Array.isArray(invalidate)) {
    return invalidate;
  }

  const proxy = createTrackingProxy(() => {});
  const results = invalidate(proxy);

  return results
    .map((item) => {
      if (typeof item === "string") {
        return item;
      }

      const method = item as MethodWithPath &
        ((...args: unknown[]) => Promise<EnlaceResponse<unknown, unknown>>);
      const path = method[SELECTOR_PATH_KEY];

      return path ? path.join("/") : "";
    })
    .filter(Boolean);
}
