import type { SpooshPlugin } from "@spoosh/core";

import type {
  TransformReadOptions,
  TransformWriteOptions,
  TransformInfiniteReadOptions,
  TransformReadResult,
  TransformWriteResult,
  TransformOptions,
} from "./types";

function deepClone<T>(value: T): T {
  try {
    if (value === undefined || value === null) {
      return value;
    }

    return structuredClone(value);
  } catch {
    return value;
  }
}

/**
 * Enables data transformation for query, body, formData, urlEncoded, and response.
 *
 * Supports both sync and async transformer functions. All data is deep-cloned
 * before transformation to prevent mutation of original objects.
 *
 * All transforms are per-request for full type inference.
 *
 * @see {@link https://spoosh.dev/docs/plugins/transform | Transform Plugin Documentation}
 *
 * @example
 * ```ts
 * import { Spoosh } from "@spoosh/core";
 *
 * const client = new Spoosh<ApiSchema, Error>("/api")
 *   .use([
 *     // ... other plugins
 *     transformPlugin(),
 *   ]);
 *
 * // Per-request transforms with full type inference
 * const { data, transformedData } = useRead(
 *   (api) => api.posts.$get(),
 *   {
 *     transform: {
 *       query: (q) => ({ ...q, timestamp: Date.now() }),
 *       response: (posts) => ({
 *         count: posts.length,
 *         hasMore: posts.length >= 10,
 *       }),
 *     },
 *   }
 * );
 *
 * // useWrite with body transform
 * trigger({
 *   body: { name: "test" },
 *   transform: {
 *     body: (b) => ({ ...b, createdAt: Date.now() }),
 *   },
 * });
 * ```
 */
export function transformPlugin(): SpooshPlugin<{
  readOptions: TransformReadOptions;
  writeOptions: TransformWriteOptions;
  infiniteReadOptions: TransformInfiniteReadOptions;
  readResult: TransformReadResult;
  writeResult: TransformWriteResult;
}> {
  return {
    name: "spoosh:transform",
    operations: ["read", "write", "infiniteRead"],

    middleware: async (context, next) => {
      const { requestOptions } = context;
      const pluginOptions = context.pluginOptions as
        | TransformOptions
        | undefined;

      const transform = pluginOptions?.transform;

      if (transform?.query && requestOptions.query) {
        const cloned = deepClone(requestOptions.query);
        const transformed = await transform.query(cloned);

        context.requestOptions = {
          ...context.requestOptions,
          query: transformed as typeof requestOptions.query,
        };
      }

      if (transform?.body && requestOptions.body) {
        const cloned = deepClone(requestOptions.body);
        const transformed = await transform.body(cloned);

        context.requestOptions = {
          ...context.requestOptions,
          body: transformed,
        };
      }

      if (transform?.formData && requestOptions.formData) {
        const cloned = deepClone(requestOptions.formData);
        const transformed = await transform.formData(cloned);

        context.requestOptions = {
          ...context.requestOptions,
          formData: transformed as typeof requestOptions.formData,
        };
      }

      if (transform?.urlEncoded && requestOptions.urlEncoded) {
        const cloned = deepClone(requestOptions.urlEncoded);
        const transformed = await transform.urlEncoded(cloned);

        context.requestOptions = {
          ...context.requestOptions,
          urlEncoded: transformed as typeof requestOptions.urlEncoded,
        };
      }

      return next();
    },

    onResponse: async (context, response) => {
      const pluginOptions = context.pluginOptions as
        | TransformOptions
        | undefined;
      const responseTransformer = pluginOptions?.transform?.response;

      if (responseTransformer && response.data !== undefined) {
        const transformedData = await responseTransformer(response.data);

        context.stateManager.setMeta(context.queryKey, {
          transformedData,
        });
      }
    },
  };
}
