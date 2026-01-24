import type { SpooshPlugin } from "@spoosh/core";

import type {
  TransformReadOptions,
  TransformWriteOptions,
  TransformInfiniteReadOptions,
  TransformReadResult,
  TransformWriteResult,
  TransformOptions,
} from "./types";

/**
 * Enables response data transformation.
 *
 * Supports both sync and async transformer functions.
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
 * const { data, meta } = useRead(
 *   (api) => api.posts.$get(),
 *   {
 *     transform: (posts) => ({
 *       count: posts.length,
 *       hasMore: posts.length >= 10,
 *     }),
 *   }
 * );
 *
 * // Access transformed data via meta
 * console.log(meta.transformedData);
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

    onResponse: async (context, response) => {
      const pluginOptions = context.pluginOptions as
        | TransformOptions
        | undefined;
      const responseTransformer = pluginOptions?.transform;

      if (responseTransformer && response.data !== undefined) {
        const transformedData = await responseTransformer(response.data);

        context.stateManager.setMeta(context.queryKey, {
          transformedData,
        });
      }
    },
  };
}
