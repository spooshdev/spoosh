import type { SpooshPlugin, PluginContext } from "@spoosh/core";
import {
  createSelectorProxy,
  extractPathFromSelector,
  generateTags,
} from "@spoosh/core";

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
      const proxy = createSelectorProxy<never>();
      const invalidationTargets = pluginOptions.invalidate(proxy as never);

      for (const target of invalidationTargets) {
        if (typeof target === "string") {
          tags.push(target);
        } else {
          const path = extractPathFromSelector(target);
          const derivedTags = generateTags(path);
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
 * Enables automatic cache invalidation after mutations.
 *
 * Marks related cache entries as stale and triggers refetches
 * based on tags or explicit invalidation targets.
 *
 * @param config - Plugin configuration
 *
 * @see {@link https://spoosh.dev/docs/plugins/invalidation | Invalidation Plugin Documentation}
 *
 * @example
 * ```ts
 * const plugins = [invalidationPlugin({ autoInvalidate: "all" })];
 *
 * // Per-mutation override
 * trigger({
 *   autoInvalidate: "self", // Only invalidate the same endpoint
 *   invalidate: ["posts"], // Or explicit tags
 * });
 * ```
 */
export function invalidationPlugin(
  config: InvalidationPluginConfig = {}
): SpooshPlugin<{
  readOptions: InvalidationReadOptions;
  writeOptions: InvalidationWriteOptions;
  infiniteReadOptions: InvalidationInfiniteReadOptions;
  readResult: InvalidationReadResult;
  writeResult: InvalidationWriteResult;
}> {
  const { autoInvalidate: defaultAutoInvalidate = "all" } = config;

  return {
    name: "spoosh:invalidation",
    operations: ["write"],

    exports(context): InvalidationPluginExports {
      return {
        setAutoInvalidateDefault(value: AutoInvalidate) {
          context.metadata.set(INVALIDATION_DEFAULT_KEY, value);
        },
      };
    },

    onResponse(context, response) {
      if (!response.error) {
        const tags = resolveInvalidateTags(context, defaultAutoInvalidate);

        if (tags.length > 0) {
          context.stateManager.markStale(tags);
          context.eventEmitter.emit("invalidate", tags);
        }
      }
    },
  };
}
