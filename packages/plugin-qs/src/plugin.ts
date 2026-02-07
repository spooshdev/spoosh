import type { SpooshPlugin } from "@spoosh/core";
import qs from "qs";

import type {
  QsPluginConfig,
  QsReadHookOptions,
  QsWriteHookOptions,
  QsInfiniteReadHookOptions,
  QsReadResult,
  QsWriteResult,
} from "./types";

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
  infiniteReadOptions: QsInfiniteReadHookOptions;
  readResult: QsReadResult;
  writeResult: QsWriteResult;
}> {
  return {
    name: "spoosh:qs",
    operations: ["read", "write", "infiniteRead"],

    middleware: async (context, next) => {
      const query = context.request.query;

      if (!query || Object.keys(query).length === 0) {
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

      context.request = {
        ...context.request,
        query: flatQuery,
      };

      return next();
    },
  };
}
