import type { EnlacePlugin, PluginContext } from "../../types";
import {
  createApiProxy,
  extractPathFromTracked,
  pathToTags,
} from "../../../utils/api-proxy";
import type {
  InvalidationPluginConfig,
  InvalidationWriteOptions,
  InvalidationReadOptions,
  InvalidationInfiniteReadOptions,
  InvalidationReadResult,
  InvalidationWriteResult,
  AutoInvalidate,
} from "./types";

/**
 * Resolves tags to invalidate from context and plugin options.
 */
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
      const proxy = createApiProxy<never>();
      const result = pluginOptions.invalidate(proxy as never);

      for (const item of result) {
        if (typeof item === "string") {
          tags.push(item);
        } else {
          const path = extractPathFromTracked(item);
          const derivedTags = pathToTags(path);
          const exactTag = derivedTags[derivedTags.length - 1];

          if (exactTag) {
            tags.push(exactTag);
          }
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

/**
 * Automatically invalidates cached queries after mutations.
 *
 * Triggers refetch for queries with matching tags when a mutation succeeds.
 *
 * @param config - Plugin configuration
 * @returns Invalidation plugin instance
 *
 * @example
 * ```ts
 * const plugins = [
 *   invalidationPlugin({ autoInvalidate: "all" }),
 * ];
 *
 * // Auto-invalidates all related queries
 * useWrite((api) => api.posts.$post);
 *
 * // Custom invalidation targets
 * useWrite((api) => api.posts.$post, {
 *   autoInvalidate: "none",
 *   invalidate: (api) => [api.posts.$get, api.users.$get],
 * });
 * ```
 */
export function invalidationPlugin(
  config: InvalidationPluginConfig = {}
): EnlacePlugin<{
  readOptions: InvalidationReadOptions;
  writeOptions: InvalidationWriteOptions;
  infiniteReadOptions: InvalidationInfiniteReadOptions;
  readResult: InvalidationReadResult;
  writeResult: InvalidationWriteResult;
}> {
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
