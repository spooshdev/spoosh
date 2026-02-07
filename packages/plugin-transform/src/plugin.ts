import type { SpooshPlugin } from "@spoosh/core";

import type {
  TransformReadOptions,
  TransformWriteOptions,
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
 * @see {@link https://spoosh.dev/docs/react/plugins/transform | Transform Plugin Documentation}
 *
 * @example
 * ```ts
 * import { Spoosh } from "@spoosh/core";
 *
 * const spoosh = new Spoosh<ApiSchema, Error>("/api")
 *   .use([
 *     // ... other plugins
 *     transformPlugin(),
 *   ]);
 *
 * // Per-request transforms with full type inference
 * const { data, meta } = useRead(
 *   (api) => api("posts").GET(),
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
  readResult: TransformReadResult;
  writeResult: TransformWriteResult;
}> {
  return {
    name: "spoosh:transform",
    operations: ["read", "write"],

    afterResponse: async (context, response) => {
      const pluginOptions = context.pluginOptions as
        | TransformOptions
        | undefined;
      const responseTransformer = (pluginOptions as TransformReadOptions)
        ?.transform;

      if (!responseTransformer || response.data === undefined) {
        return;
      }

      const transformedData = await responseTransformer(response.data);

      context.stateManager.setMeta(context.queryKey, {
        transformedData,
      });
    },
  };
}
