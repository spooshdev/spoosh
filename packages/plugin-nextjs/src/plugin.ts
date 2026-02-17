import type { SpooshPlugin } from "@spoosh/core";
import { resolvePathString } from "@spoosh/core";

import type {
  NextjsPluginConfig,
  NextjsReadOptions,
  NextjsWriteOptions,
  NextjsWriteTriggerOptions,
  NextjsQueueTriggerOptions,
  NextjsInfiniteReadOptions,
  NextjsReadResult,
  NextjsWriteResult,
  NextjsQueueResult,
} from "./types";

const PLUGIN_NAME = "spoosh:nextjs";

/**
 * Next.js integration plugin for server-side revalidation.
 *
 * Automatically revalidates Next.js cache tags and paths after successful mutations.
 *
 * @param config - Plugin configuration
 *
 * @see {@link https://spoosh.dev/docs/react/plugins/nextjs | Next.js Plugin Documentation}
 *
 * @returns Next.js plugin instance
 *
 * @example
 * ```ts
 * import { Spoosh } from "@spoosh/core";
 * import { nextjsPlugin } from "@spoosh/plugin-nextjs";
 *
 * const spoosh = new Spoosh<ApiSchema, Error>("/api")
 *   .use([
 *     nextjsPlugin({
 *       serverRevalidator: async (tags, paths) => {
 *         "use server";
 *         const { revalidateTag, revalidatePath } = await import("next/cache");
 *         tags.forEach((tag) => revalidateTag(tag));
 *         paths.forEach((path) => revalidatePath(path));
 *       },
 *     }),
 *   ]);
 * ```
 */
export function nextjsPlugin(config: NextjsPluginConfig = {}): SpooshPlugin<{
  readOptions: NextjsReadOptions;
  writeOptions: NextjsWriteOptions;
  writeTriggerOptions: NextjsWriteTriggerOptions;
  queueTriggerOptions: NextjsQueueTriggerOptions;
  infiniteReadOptions: NextjsInfiniteReadOptions;
  readResult: NextjsReadResult;
  writeResult: NextjsWriteResult;
  queueResult: NextjsQueueResult;
}> {
  const { serverRevalidator, skipServerRevalidation = false } = config;

  return {
    name: PLUGIN_NAME,
    operations: ["write", "queue"],

    middleware: async (context, next) => {
      const t = context.tracer?.(PLUGIN_NAME);
      const response = await next();

      if (response.error) {
        return response;
      }

      if (!serverRevalidator) {
        t?.skip("No revalidator", { color: "muted" });
        return response;
      }

      const pluginOptions = context.pluginOptions as
        | NextjsWriteTriggerOptions
        | undefined;

      const shouldRevalidate =
        pluginOptions?.serverRevalidate ?? !skipServerRevalidation;

      if (!shouldRevalidate) {
        t?.skip("Revalidation disabled", { color: "muted" });
        return response;
      }

      const revalidatePaths = pluginOptions?.revalidatePaths ?? [];
      const params = context.request.params as
        | Record<string, string | number>
        | undefined;
      const resolvedTags = context.tags.map((tag) =>
        resolvePathString(tag, params)
      );

      if (resolvedTags.length > 0 || revalidatePaths.length > 0) {
        t?.log(`Revalidated`, {
          color: "info",
          info: [
            { label: "tags", value: resolvedTags },
            { label: "paths", value: revalidatePaths },
          ],
        });

        await serverRevalidator(resolvedTags, revalidatePaths);
      } else {
        t?.skip("Nothing to revalidate", { color: "muted" });
      }

      return response;
    },
  };
}
