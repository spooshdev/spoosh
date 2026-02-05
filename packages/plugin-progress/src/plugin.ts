import type { SpooshPlugin } from "@spoosh/core";

import type {
  ProgressReadOptions,
  ProgressWriteOptions,
  ProgressInfiniteReadOptions,
  ProgressReadResult,
  ProgressWriteResult,
  ProgressOptions,
} from "./types";

export function progressPlugin(): SpooshPlugin<{
  readOptions: ProgressReadOptions;
  writeOptions: ProgressWriteOptions;
  infiniteReadOptions: ProgressInfiniteReadOptions;
  readResult: ProgressReadResult;
  writeResult: ProgressWriteResult;
}> {
  return {
    name: "spoosh:progress",
    operations: ["read", "write", "infiniteRead"],

    middleware: async (context, next) => {
      const pluginOptions = context.pluginOptions as
        | ProgressReadOptions
        | ProgressWriteOptions
        | undefined;

      if (!pluginOptions?.progress) {
        return next();
      }

      const progressOptions =
        typeof pluginOptions.progress === "object"
          ? pluginOptions.progress
          : ({} as ProgressOptions);

      context.requestOptions = {
        ...context.requestOptions,
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
