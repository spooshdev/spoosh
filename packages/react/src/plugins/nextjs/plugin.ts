import type { EnlacePlugin } from "enlace";
import type {
  NextjsPluginConfig,
  NextjsReadOptions,
  NextjsWriteOptions,
  NextjsInfiniteReadOptions,
  NextjsReadResult,
  NextjsWriteResult,
} from "./types";

export function nextjsPlugin(config: NextjsPluginConfig = {}): EnlacePlugin<{
  readOptions: NextjsReadOptions;
  writeOptions: NextjsWriteOptions;
  infiniteReadOptions: NextjsInfiniteReadOptions;
  readResult: NextjsReadResult;
  writeResult: NextjsWriteResult;
}> {
  const { serverRevalidator, skipServerRevalidation = false } = config;

  return {
    name: "enlace:nextjs",
    operations: ["write"],

    middleware: async (context, next) => {
      const response = await next();

      if (response.error || !serverRevalidator) {
        return response;
      }

      const pluginOptions = context.pluginOptions as
        | NextjsWriteOptions
        | undefined;

      const shouldRevalidate =
        pluginOptions?.serverRevalidate ?? !skipServerRevalidation;

      if (!shouldRevalidate) {
        return response;
      }

      const revalidatePaths = pluginOptions?.revalidatePaths ?? [];

      if (context.tags.length > 0 || revalidatePaths.length > 0) {
        await serverRevalidator(context.tags, revalidatePaths);
      }

      return response;
    },
  };
}
