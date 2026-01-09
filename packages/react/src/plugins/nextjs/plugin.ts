import type { EnlacePlugin } from "enlace";
import type {
  NextjsPluginConfig,
  NextjsReadOptions,
  NextjsWriteOptions,
  NextjsInfiniteReadOptions,
  NextjsReadResult,
  NextjsWriteResult,
} from "./types";

export function nextjsPlugin(
  config: NextjsPluginConfig = {}
): EnlacePlugin<
  NextjsReadOptions,
  NextjsWriteOptions,
  NextjsInfiniteReadOptions,
  NextjsReadResult,
  NextjsWriteResult
> {
  const { serverRevalidator, skipServerRevalidation = false } = config;

  return {
    name: "enlace:nextjs",
    operations: ["write"],

    handlers: {
      async onSuccess(context) {
        if (!serverRevalidator) {
          return context;
        }

        const pluginOptions = context.metadata.get("pluginOptions") as
          | NextjsWriteOptions
          | undefined;

        const shouldRevalidate =
          pluginOptions?.serverRevalidate ?? !skipServerRevalidation;

        if (!shouldRevalidate) {
          return context;
        }

        const revalidatePaths = pluginOptions?.revalidatePaths ?? [];

        if (context.tags.length > 0 || revalidatePaths.length > 0) {
          await serverRevalidator(context.tags, revalidatePaths);
        }

        return context;
      },
    },
  };
}
