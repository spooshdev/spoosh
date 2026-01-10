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
  InvalidationPluginExports,
} from "./types";

const INVALIDATION_DEFAULT_KEY = "invalidation:autoInvalidateDefault";

/**
 * Resolves tags to invalidate from context and plugin options.
 */
function resolveInvalidateTags(
  context: PluginContext,
  defaultAutoInvalidate: AutoInvalidate
): string[] {
  const pluginOptions = context.pluginOptions as
    | InvalidationWriteOptions
    | undefined;

  const tags: string[] = [];

  if (pluginOptions?.invalidate) {
    if (Array.isArray(pluginOptions.invalidate)) {
      tags.push(...pluginOptions.invalidate);
    } else {
      const proxy = createApiProxy<never>();
      const invalidationTargets = pluginOptions.invalidate(proxy as never);

      for (const target of invalidationTargets) {
        if (typeof target === "string") {
          tags.push(target);
        } else {
          const path = extractPathFromTracked(target);
          const derivedTags = pathToTags(path);
          const exactTag = derivedTags[derivedTags.length - 1];

          if (exactTag) {
            tags.push(exactTag);
          }
        }
      }
    }
  }

  const overrideDefault = context.metadata.get(INVALIDATION_DEFAULT_KEY) as
    | AutoInvalidate
    | undefined;
  const effectiveDefault = overrideDefault ?? defaultAutoInvalidate;
  const autoInvalidate = pluginOptions?.autoInvalidate ?? effectiveDefault;

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
 * ## Plugin Exports
 *
 * Other plugins can influence the default auto-invalidation behavior via the
 * plugin exports API:
 *
 * ```ts
 * context.plugins.get("enlace:invalidation")?.setAutoInvalidateDefault("none");
 * ```
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
 * // Auto-invalidates all related queries (default behavior)
 * trigger({ body: { title: "New Post" } });
 *
 * // Custom invalidation targets
 * trigger({
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

    exports(context): InvalidationPluginExports {
      return {
        setAutoInvalidateDefault(value: AutoInvalidate) {
          context.metadata.set(INVALIDATION_DEFAULT_KEY, value);
        },
      };
    },

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
