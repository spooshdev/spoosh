import type { SpooshPlugin } from "@spoosh/core";

import type {
  ProgressReadOptions,
  ProgressWriteOptions,
  ProgressInfiniteReadOptions,
  ProgressReadResult,
  ProgressWriteResult,
  ProgressOptions,
} from "./types";

const PLUGIN_NAME = "spoosh:progress";

export function progressPlugin(): SpooshPlugin<{
  readOptions: ProgressReadOptions;
  writeOptions: ProgressWriteOptions;
  infiniteReadOptions: ProgressInfiniteReadOptions;
  readResult: ProgressReadResult;
  writeResult: ProgressWriteResult;
}> {
  return {
    name: PLUGIN_NAME,
    operations: ["read", "write", "infiniteRead"],

    middleware: async (context, next) => {
      const t = context.tracer?.(PLUGIN_NAME);

      const pluginOptions = context.pluginOptions as
        | ProgressReadOptions
        | ProgressWriteOptions
        | undefined;

      if (!pluginOptions?.progress) {
        t?.skip("Disabled", { color: "muted" });
        return next();
      }

      t?.log("Progress enabled", { color: "info" });

      const progressOptions =
        typeof pluginOptions.progress === "object"
          ? pluginOptions.progress
          : ({} as ProgressOptions);

      context.request = {
        ...context.request,
        transport: "xhr",
        transportOptions: {
          onProgress: (event: ProgressEvent, xhr: XMLHttpRequest) => {
            let total = event.total;

            if (!event.lengthComputable && progressOptions.totalHeader) {
              const headerVal = xhr.getResponseHeader(
                progressOptions.totalHeader
              );

              if (headerVal) {
                total = parseInt(headerVal, 10);
              }
            }

            context.stateManager.setMeta(context.queryKey, {
              progress: {
                loaded: event.loaded,
                total,
              },
            });
          },
        },
      };

      return next();
    },
  };
}
