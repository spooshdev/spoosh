import type { SpooshPlugin } from "@spoosh/core";
import qs from "qs";

import type {
  QsPluginConfig,
  QsReadHookOptions,
  QsWriteHookOptions,
  QsPagesHookOptions,
  QsQueueHookOptions,
  QsReadResult,
  QsWriteResult,
  QsQueueResult,
} from "./types";

const PLUGIN_NAME = "spoosh:qs";

const DEFAULT_OPTIONS = {
  arrayFormat: "brackets",
  allowDots: false,
  skipNulls: true,
} as const;

/**
 * Enables nested object serialization in query parameters using bracket notation.
 *
 * Transforms nested objects like `{ pagination: { limit: 10 } }` into
 * `pagination[limit]=10` format.
 *
 * @param config - Plugin configuration
 *
 * @see {@link https://spoosh.dev/docs/react/plugins/qs | QS Plugin Documentation}
 *
 * @example
 * ```ts
 * import { Spoosh } from "@spoosh/core";
 *
 * const spoosh = new Spoosh<ApiSchema, Error>("/api")
 *   .use([
 *     // ... other plugins
 *     qsPlugin({ arrayFormat: "brackets" }),
 *   ]);
 *
 * // Query: { filters: { status: "active", tags: ["a", "b"] } }
 * // Result: filters[status]=active&filters[tags][]=a&filters[tags][]=b
 * ```
 */
export function qsPlugin(config: QsPluginConfig = {}): SpooshPlugin<{
  readOptions: QsReadHookOptions;
  writeOptions: QsWriteHookOptions;
  pagesOptions: QsPagesHookOptions;
  queueOptions: QsQueueHookOptions;
  readResult: QsReadResult;
  writeResult: QsWriteResult;
  queueResult: QsQueueResult;
}> {
  return {
    name: PLUGIN_NAME,
    operations: ["read", "write", "pages", "queue"],

    middleware: async (context, next) => {
      const t = context.tracer?.(PLUGIN_NAME);
      const query = context.request.query;

      if (!query || Object.keys(query).length === 0) {
        t?.skip("No query params", { color: "muted" });
        return next();
      }

      const pluginOptions = (
        context.pluginOptions as QsReadHookOptions | undefined
      )?.qs;

      const stringified = qs.stringify(query, {
        ...DEFAULT_OPTIONS,
        ...config,
        ...pluginOptions,
        encode: false,
      });

      const flatQuery = qs.parse(stringified, { depth: 0 }) as Record<
        string,
        string
      >;

      t?.log("Serialized query", {
        color: "info",
        diff: {
          before: query,
          after: flatQuery,
          label: "Serialize query params",
        },
      });

      context.request = {
        ...context.request,
        query: flatQuery,
      };

      return next();
    },
  };
}
