import { __DEV__ } from "./env";
import { containsFile, isJsonBody } from "./isJsonBody";
import { objectToFormData } from "./objectToFormData";
import { objectToUrlEncoded } from "./objectToUrlEncoded";

/**
 * @internal
 */
export type SpooshBodyInternal<T = unknown> = {
  readonly __spooshBody: true;
  readonly kind: "form" | "json" | "urlencoded";
  readonly value: T;
};

/**
 * Opaque type representing a transformed body. Create using `form()`, `json()`, or `urlencoded()` helpers.
 * Do not create this type manually - use the helper functions instead.
 *
 * @example
 * ```ts
 * import { form, json, urlencoded } from "@spoosh/core";
 *
 * // Use helpers to create SpooshBody
 * trigger({ body: form({ file: myFile }) });
 * trigger({ body: json({ data: "value" }) });
 * trigger({ body: urlencoded({ key: "value" }) });
 * ```
 */
declare const __spooshBodyBrand: unique symbol;

export type SpooshBody<T = unknown> = {
  readonly [__spooshBodyBrand]: T;
};

export function isSpooshBody(value: unknown): value is SpooshBody {
  return (
    typeof value === "object" &&
    value !== null &&
    "__spooshBody" in value &&
    (value as SpooshBodyInternal).__spooshBody === true
  );
}

export function form<T>(value: T): SpooshBody<T> {
  return Object.freeze({
    __spooshBody: true as const,
    kind: "form" as const,
    value,
  }) as unknown as SpooshBody<T>;
}

export function json<T>(value: T): SpooshBody<T> {
  return Object.freeze({
    __spooshBody: true as const,
    kind: "json" as const,
    value,
  }) as unknown as SpooshBody<T>;
}

export function urlencoded<T>(value: T): SpooshBody<T> {
  return Object.freeze({
    __spooshBody: true as const,
    kind: "urlencoded" as const,
    value,
  }) as unknown as SpooshBody<T>;
}

export function resolveRequestBody(rawBody: unknown):
  | {
      body: BodyInit;
      headers?: Record<string, string>;
      removeHeaders?: string[];
    }
  | undefined {
  if (rawBody === undefined || rawBody === null) {
    return undefined;
  }

  if (isSpooshBody(rawBody)) {
    const body = rawBody as unknown as SpooshBodyInternal;

    switch (body.kind) {
      case "form":
        return {
          body: objectToFormData(body.value as Record<string, unknown>),
          removeHeaders: ["Content-Type"],
        };

      case "json":
        return {
          body: JSON.stringify(body.value),
          headers: { "Content-Type": "application/json" },
        };

      case "urlencoded":
        return {
          body: objectToUrlEncoded(body.value as Record<string, unknown>),
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

  if (rawBody instanceof FormData) {
    return { body: rawBody, removeHeaders: ["Content-Type"] };
  }

  return { body: rawBody as BodyInit };
}
