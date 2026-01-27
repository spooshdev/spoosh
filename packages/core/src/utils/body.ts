import { __DEV__ } from "./env";
import { containsFile, isJsonBody } from "./isJsonBody";
import { objectToFormData } from "./objectToFormData";
import { objectToUrlEncoded } from "./objectToUrlEncoded";

export type SpooshBody<T = unknown> = {
  readonly __spooshBody: true;
  readonly kind: "form" | "json" | "urlencoded";
  readonly value: T;
};

export function isSpooshBody(value: unknown): value is SpooshBody {
  return (
    typeof value === "object" &&
    value !== null &&
    "__spooshBody" in value &&
    (value as SpooshBody).__spooshBody === true
  );
}

export function form<T>(value: T): SpooshBody<T> {
  return Object.freeze({
    __spooshBody: true as const,
    kind: "form" as const,
    value,
  });
}

export function json<T>(value: T): SpooshBody<T> {
  return Object.freeze({
    __spooshBody: true as const,
    kind: "json" as const,
    value,
  });
}

export function urlencoded<T>(value: T): SpooshBody<T> {
  return Object.freeze({
    __spooshBody: true as const,
    kind: "urlencoded" as const,
    value,
  });
}

export function resolveRequestBody(
  rawBody: unknown
): { body: BodyInit; headers?: Record<string, string> } | undefined {
  if (rawBody === undefined || rawBody === null) {
    return undefined;
  }

  if (isSpooshBody(rawBody)) {
    switch (rawBody.kind) {
      case "form":
        return {
          body: objectToFormData(rawBody.value as Record<string, unknown>),
        };

      case "json":
        return {
          body: JSON.stringify(rawBody.value),
          headers: { "Content-Type": "application/json" },
        };

      case "urlencoded":
        return {
          body: objectToUrlEncoded(rawBody.value as Record<string, unknown>),
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
        };
    }
  }

  if (isJsonBody(rawBody)) {
    if (__DEV__() && containsFile(rawBody)) {
      console.warn(
        "[spoosh] Plain object body contains File/Blob. Use form() wrapper for multipart upload."
      );
    }

    return {
      body: JSON.stringify(rawBody),
      headers: { "Content-Type": "application/json" },
    };
  }

  return { body: rawBody as BodyInit };
}
