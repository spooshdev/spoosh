import type { SpooshPlugin } from "@spoosh/core";

import type {
  NextjsPluginConfig,
  NextjsReadOptions,
  NextjsWriteOptions,
  NextjsInfiniteReadOptions,
  NextjsReadResult,
  NextjsWriteResult,
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
  infiniteReadOptions: NextjsInfiniteReadOptions;
  readResult: NextjsReadResult;
  writeResult: NextjsWriteResult;
}> {
  const { serverRevalidator, skipServerRevalidation = false } = config;

  return {
    name: PLUGIN_NAME,
    operations: ["write"],

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
        | NextjsWriteOptions
        | undefined;

      const shouldRevalidate =
        pluginOptions?.serverRevalidate ?? !skipServerRevalidation;

      if (!shouldRevalidate) {
        t?.skip("Revalidation disabled", { color: "muted" });
        return response;
      }

      const revalidatePaths = pluginOptions?.revalidatePaths ?? [];

      if (context.tags.length > 0 || revalidatePaths.length > 0) {
        const parts: string[] = [];

        if (context.tags.length > 0) {
          parts.push(`tags: ${context.tags.join(", ")}`);
        }

        if (revalidatePaths.length > 0) {
          parts.push(`paths: ${revalidatePaths.join(", ")}`);
        }

        t?.log(`Revalidated ${parts.join("; ")}`, { color: "success" });
        await serverRevalidator(context.tags, revalidatePaths);
      } else {
        t?.skip("Nothing to revalidate", { color: "muted" });
      }

      return response;
    },
  };
}
