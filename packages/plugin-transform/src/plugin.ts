import type { SpooshPlugin } from "@spoosh/core";

import type {
  TransformReadOptions,
  TransformWriteOptions,
  TransformQueueOptions,
  TransformReadResult,
  TransformWriteResult,
  TransformQueueResult,
  TransformOptions,
} from "./types";

const PLUGIN_NAME = "spoosh:transform";

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
  queueOptions: TransformQueueOptions;
  readResult: TransformReadResult;
  writeResult: TransformWriteResult;
  queueResult: TransformQueueResult;
}> {
  return {
    name: PLUGIN_NAME,
    operations: ["read", "write", "queue"],

    afterResponse: async (context, response) => {
      const t = context.tracer?.(PLUGIN_NAME);

      const pluginOptions = context.pluginOptions as
        | TransformOptions
        | undefined;

      const responseTransformer = (pluginOptions as TransformReadOptions)
        ?.transform;

      if (!responseTransformer || response.data === undefined) {
        return;
      }

      const transformedData = await responseTransformer(response.data);

      t?.log("Transformed", {
        color: "success",
        diff: {
          before: response.data,
          after: transformedData,
          label: "Transform applied to response data",
        },
      });

      context.stateManager.setMeta(context.queryKey, {
        transformedData,
      });
    },
  };
}
