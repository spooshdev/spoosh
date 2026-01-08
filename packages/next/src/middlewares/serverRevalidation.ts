import {
  createMiddleware,
  generateTags,
  type MiddlewareContext,
  type AutoInvalidate,
} from "enlace-core";
import type { ServerRevalidateHandler } from "../types";

export type ServerRevalidationConfig = {
  serverRevalidator?: ServerRevalidateHandler;
  skipServerRevalidation?: boolean;
  autoRevalidateTags?: boolean;
};

export const createServerRevalidationMiddleware = (
  config: ServerRevalidationConfig = {}
) => {
  const {
    serverRevalidator,
    skipServerRevalidation = false,
    autoRevalidateTags = true,
  } = config;

  return createMiddleware("serverRevalidation", "after", (context) => {
    if (context.method === "GET") {
      return context;
    }

    if (!context.response || context.response.error) {
      return context;
    }

    const requestOptions = context.requestOptions as
      | {
          serverRevalidate?: boolean;
          autoInvalidate?: AutoInvalidate;
          invalidate?: string[];
          revalidatePaths?: string[];
        }
      | undefined;

    const shouldRevalidate =
      requestOptions?.serverRevalidate ?? !skipServerRevalidation;

    if (!shouldRevalidate) {
      return context;
    }

    const autoInvalidateSetting =
      requestOptions?.autoInvalidate ?? (autoRevalidateTags ? "all" : false);

    let autoTags: string[] = [];

    if (autoInvalidateSetting === "all") {
      autoTags = generateTags(context.path);
    } else if (autoInvalidateSetting === "self") {
      autoTags = [context.path.join("/")];
    }

    const customTags = requestOptions?.invalidate ?? [];
    const revalidateTags = [...new Set([...autoTags, ...customTags])];
    const revalidatePaths = requestOptions?.revalidatePaths ?? [];

    if (revalidateTags.length > 0 || revalidatePaths.length > 0) {
      serverRevalidator?.(revalidateTags, revalidatePaths);
    }

    return context as MiddlewareContext;
  });
};
