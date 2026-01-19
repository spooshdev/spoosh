import type { SpooshPlugin } from "@spoosh/core";
import qs from "qs";

import type {
  QsPluginConfig,
  QsReadOptions,
  QsWriteOptions,
  QsInfiniteReadOptions,
  QsReadResult,
  QsWriteResult,
} from "./types";

/**
 * Enables nested object serialization in query parameters using bracket notation.
 *
 * Transforms nested objects like `{ pagination: { limit: 10 } }` into
 * `pagination[limit]=10` format.
 *
 * @param config - Plugin configuration
 *
 * @see {@link https://spoosh.dev/docs/plugins/qs | QS Plugin Documentation}
 *
 * @example
 * ```ts
 * import { Spoosh } from "@spoosh/core";
 *
 * const client = new Spoosh<ApiSchema, Error>("/api")
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
  readOptions: QsReadOptions;
  writeOptions: QsWriteOptions;
  infiniteReadOptions: QsInfiniteReadOptions;
  readResult: QsReadResult;
  writeResult: QsWriteResult;
}> {
  const {
    arrayFormat: defaultArrayFormat = "brackets",
    allowDots: defaultAllowDots = false,
    skipNulls: defaultSkipNulls = true,
    options: additionalOptions = {},
  } = config;

  return {
    name: "spoosh:qs",
    operations: ["read", "write", "infiniteRead"],

    middleware: async (context, next) => {
      const query = context.requestOptions.query;

      if (!query || Object.keys(query).length === 0) {
        return next();
      }

      const pluginOptions = context.pluginOptions as QsReadOptions | undefined;

      const arrayFormat = pluginOptions?.arrayFormat ?? defaultArrayFormat;
      const allowDots = pluginOptions?.allowDots ?? defaultAllowDots;
      const skipNulls = pluginOptions?.skipNulls ?? defaultSkipNulls;

      const stringified = qs.stringify(query, {
        ...additionalOptions,
        arrayFormat,
        allowDots,
        skipNulls,
        encode: false,
      });

      const flatQuery = qs.parse(stringified, { depth: 0 }) as Record<
        string,
        string
      >;

      context.requestOptions = {
        ...context.requestOptions,
        query: flatQuery,
      };

      return next();
    },
  };
}
