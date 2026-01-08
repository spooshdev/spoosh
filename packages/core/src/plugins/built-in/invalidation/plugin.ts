import type { EnlacePlugin, PluginContext } from "../../types";
import type {
  InvalidationPluginConfig,
  InvalidationWriteOptions,
  InvalidationReadOptions,
  InvalidationInfiniteReadOptions,
  InvalidationReadResult,
  InvalidationWriteResult,
  AutoInvalidate,
} from "./types";

function resolveInvalidateTags(
  context: PluginContext,
  defaultAutoInvalidate: AutoInvalidate
): string[] {
  const pluginOptions = context.metadata.get("pluginOptions") as
    | InvalidationWriteOptions
    | undefined;

  const tags: string[] = [];

  if (pluginOptions?.invalidate) {
    if (Array.isArray(pluginOptions.invalidate)) {
      tags.push(...pluginOptions.invalidate);
    } else {
      const proxy = new Proxy(
        {},
        {
          get(_, prop) {
            const path: string[] = [];

            const createPathProxy = (): unknown =>
              new Proxy(
                {},
                {
                  get(_, innerProp) {
                    if (
                      innerProp === "$get" ||
                      innerProp === "$post" ||
                      innerProp === "$put" ||
                      innerProp === "$patch" ||
                      innerProp === "$delete"
                    ) {
                      return () => {
                        const tag = path.join("/");
                        tags.push(tag);

                        return Promise.resolve({ data: undefined });
                      };
                    }

                    path.push(String(innerProp));

                    return createPathProxy();
                  },
                }
              );

            path.push(String(prop));

            return createPathProxy();
          },
        }
      );

      const result = pluginOptions.invalidate(proxy);

      for (const item of result) {
        if (typeof item === "string") {
          tags.push(item);
        }
      }
    }
  }

  const autoInvalidate = pluginOptions?.autoInvalidate ?? defaultAutoInvalidate;

  if (autoInvalidate === "all") {
    tags.push(...context.tags);
  } else if (autoInvalidate === "self") {
    const selfTag = context.path.join("/");
    tags.push(selfTag);
  }

  return [...new Set(tags)];
}

export function invalidationPlugin(
  config: InvalidationPluginConfig = {}
): EnlacePlugin<
  InvalidationReadOptions,
  InvalidationWriteOptions,
  InvalidationInfiniteReadOptions,
  InvalidationReadResult,
  InvalidationWriteResult
> {
  const { autoInvalidate: defaultAutoInvalidate = "all" } = config;

  return {
    name: "enlace:invalidation",
    operations: ["write"],

    handlers: {
      onSuccess(context: PluginContext) {
        const tags = resolveInvalidateTags(context, defaultAutoInvalidate);

        if (tags.length > 0) {
          context.eventEmitter.emit("invalidate", tags);
        }

        return context;
      },
    },
  };
}
