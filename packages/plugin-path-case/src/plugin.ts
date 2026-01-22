import type { SpooshPlugin } from "@spoosh/core";

import type {
  PathCasePluginConfig,
  PathCaseHookOptions,
  BuiltInCase,
} from "./types";
import { camelToKebab, camelToPascal, camelToSnake } from "./case-utils";

function getConverter(
  targetCase: BuiltInCase | ((segment: string) => string)
): (segment: string) => string {
  if (typeof targetCase === "function") {
    return targetCase;
  }

  switch (targetCase) {
    case "kebab":
      return camelToKebab;
    case "snake":
      return camelToSnake;
    case "pascal":
      return camelToPascal;
    case "camel":
      return (s) => s;
  }
}

function createPathTransformer(
  targetCase: BuiltInCase | ((segment: string) => string),
  exclude: string[]
): (path: string[]) => string[] {
  const convert = getConverter(targetCase);

  return (path) =>
    path.map((segment) => {
      if (
        segment.startsWith(":") ||
        /^\d+$/.test(segment) ||
        exclude.includes(segment)
      ) {
        return segment;
      }

      return convert(segment);
    });
}

/**
 * Transforms API path segments from camelCase to a target case format (kebab-case, snake_case, etc.)
 * for HTTP requests while maintaining camelCase in TypeScript code.
 *
 * **IMPORTANT**: Apply `CamelCaseKeys` at the `Spoosh` constructor level, not at createReactSpoosh or similar.
 * The schema type must be transformed when creating the Spoosh instance.
 *
 * @param config - Plugin configuration
 *
 * @see {@link https://spoosh.dev/docs/plugins/path-case | Path Case Plugin Documentation}
 *
 * @example Basic Usage
 * ```ts
 * import { Spoosh } from "@spoosh/core";
 * import { createReactSpoosh } from "@spoosh/react";
 * import { CamelCaseKeys, pathCasePlugin } from "@spoosh/plugin-path-case";
 * import type { ApiSchema } from "./generated/api-schema";
 *
 * // Apply CamelCaseKeys at Spoosh constructor
 * const client = new Spoosh<CamelCaseKeys<ApiSchema>, Error>("/api")
 *   .use([pathCasePlugin({ targetCase: "kebab" })]);
 *
 * const { useRead, useWrite } = createReactSpoosh(client);
 *
 * // TypeScript: camelCase with full autocomplete
 * useRead((api) => api.blogPosts(postId).relatedArticles.$get());
 * // HTTP request: GET /blog-posts/123/related-articles
 * ```
 *
 * @example With Exclusions
 * ```ts
 * pathCasePlugin({
 *   targetCase: "kebab",
 *   exclude: ["v1", "api"],
 * })
 * // api.v1.blogPosts.$get() -> GET /v1/blog-posts
 * ```
 *
 * @example With Custom Converter
 * ```ts
 * import { paramCase } from "change-case";
 *
 * pathCasePlugin({
 *   targetCase: paramCase,
 * })
 * ```
 *
 * @example Per-Request Override
 * ```ts
 * useRead((api) => api.someEndpoint.$get(), {
 *   pathCase: { targetCase: "snake" },
 * });
 * // -> GET /some_endpoint
 * ```
 */
export function pathCasePlugin(config: PathCasePluginConfig): SpooshPlugin<{
  readOptions: PathCaseHookOptions;
  writeOptions: PathCaseHookOptions;
  infiniteReadOptions: PathCaseHookOptions;
}> {
  const { targetCase: globalTargetCase, exclude: globalExclude = [] } = config;

  return {
    name: "spoosh:path-case",
    operations: ["read", "write", "infiniteRead"],

    middleware: async (context, next) => {
      const requestOptions = (
        context.pluginOptions as PathCaseHookOptions | undefined
      )?.pathCase;

      const targetCase = requestOptions?.targetCase ?? globalTargetCase;
      const exclude = requestOptions?.exclude ?? globalExclude;

      context.requestOptions._pathTransformer = createPathTransformer(
        targetCase,
        exclude
      );

      return next();
    },
  };
}
