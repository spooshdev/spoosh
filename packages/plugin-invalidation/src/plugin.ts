import {
  resolvePathString,
  createSpooshPlugin,
  normalizeTag,
} from "@spoosh/core";

import type {
  InvalidationPluginConfig,
  InvalidationWriteOptions,
  InvalidationWriteTriggerOptions,
  InvalidationQueueTriggerOptions,
  InvalidationReadOptions,
  InvalidationPagesOptions,
  InvalidationReadResult,
  InvalidationWriteResult,
  InvalidationQueueResult,
  InvalidationInstanceApi,
  InvalidationPluginInternal,
  InvalidateOption,
} from "./types";

const PLUGIN_NAME = "spoosh:invalidation";
const AUTO_INVALIDATE_DISABLED_KEY = "invalidation:autoDisabled";

function calculateSegmentDepth(path: string, groups: string[]): number {
  if (groups.length === 0) return 1;

  // Sort by length descending to match longest prefix first
  const sortedGroups = [...groups].sort((a, b) => b.length - a.length);

  for (const group of sortedGroups) {
    const normalizedGroup = group.replace(/^\/+|\/+$/g, "");

    if (path === normalizedGroup || path.startsWith(normalizedGroup + "/")) {
      // Count segments in the group prefix + 1
      return normalizedGroup.split("/").length + 1;
    }
  }

  return 1;
}

function resolveInvalidateTags(
  path: string,
  params: Record<string, string | number> | undefined,
  invalidateOption: InvalidateOption | undefined,
  autoInvalidate: boolean,
  groups: string[]
): string[] | false {
  if (invalidateOption === false) {
    return false;
  }

  if (invalidateOption === "*" || invalidateOption === "/*") {
    return ["*"];
  }

  if (typeof invalidateOption === "string") {
    const normalized = normalizeTag(invalidateOption);
    // "/*" normalizes to "*" which is global refetch
    if (normalized === "*") {
      return ["*"];
    }
    return [normalized];
  }

  if (Array.isArray(invalidateOption)) {
    return [...new Set(invalidateOption.map(normalizeTag))];
  }

  if (!autoInvalidate) {
    return false;
  }

  const resolvedPath = normalizeTag(resolvePathString(path, params));
  const segments = resolvedPath.split("/");
  const depth = calculateSegmentDepth(resolvedPath, groups);

  // Get the base segments up to the calculated depth
  const baseSegments = segments.slice(0, depth);

  if (baseSegments.length === 0 || !baseSegments[0]) {
    return false;
  }

  const base = baseSegments.join("/");
  return [base, `${base}/*`];
}

/**
 * Enables automatic cache invalidation after mutations.
 *
 * Marks related cache entries as stale and triggers refetches
 * based on wildcard patterns or explicit invalidation targets.
 *
 * @param config - Plugin configuration
 *
 * @see {@link https://spoosh.dev/docs/react/plugins/invalidation | Invalidation Plugin Documentation}
 *
 * @example
 * ```ts
 * import { Spoosh } from "@spoosh/core";
 *
 * const spoosh = new Spoosh<ApiSchema, Error>("/api")
 *   .use([
 *     invalidationPlugin({ autoInvalidate: true }),
 *   ]);
 *
 * // Per-mutation invalidation
 * trigger({
 *   invalidate: "posts", // Exact match only
 * });
 *
 * trigger({
 *   invalidate: "posts/*", // Children only (posts/1, posts/1/comments)
 * });
 *
 * trigger({
 *   invalidate: ["posts", "posts/*"], // posts AND all children
 * });
 *
 * trigger({
 *   invalidate: false, // Disable invalidation
 * });
 *
 * trigger({
 *   invalidate: "*", // Global refetch - triggers all queries to refetch
 * });
 * ```
 */
export function invalidationPlugin(config: InvalidationPluginConfig = {}) {
  const { autoInvalidate = true, groups = [] } = config;

  return createSpooshPlugin<{
    readOptions: InvalidationReadOptions;
    writeOptions: InvalidationWriteOptions;
    writeTriggerOptions: InvalidationWriteTriggerOptions;
    queueTriggerOptions: InvalidationQueueTriggerOptions;
    pagesOptions: InvalidationPagesOptions;
    readResult: InvalidationReadResult;
    writeResult: InvalidationWriteResult;
    queueResult: InvalidationQueueResult;
    api: InvalidationInstanceApi;
    internal: InvalidationPluginInternal;
  }>({
    name: PLUGIN_NAME,
    operations: ["write", "queue"],

    afterResponse(context, response) {
      const t = context.tracer?.(PLUGIN_NAME);

      if (!response.error) {
        const params = context.request.params as
          | Record<string, string | number>
          | undefined;

        const invalidateOption = (
          context.pluginOptions as
            | InvalidationWriteTriggerOptions
            | InvalidationQueueTriggerOptions
            | undefined
        )?.invalidate;

        const isAutoDisabled = context.temp.get(AUTO_INVALIDATE_DISABLED_KEY);
        const effectiveAutoInvalidate = isAutoDisabled ? false : autoInvalidate;

        const tags = resolveInvalidateTags(
          context.path,
          params,
          invalidateOption,
          effectiveAutoInvalidate,
          groups
        );

        if (tags === false) {
          t?.skip("Invalidation disabled", { color: "muted" });
          return;
        }

        if (tags.includes("*")) {
          t?.log("Refetch all", { color: "warning" });
          context.eventEmitter.emit("refetchAll", undefined);
          return;
        }

        if (tags.length > 0) {
          t?.log("Invalidated patterns", {
            color: "info",
            info: [{ label: "Patterns", value: tags }],
          });
          context.stateManager.markStale(tags);
          context.eventEmitter.emit("invalidate", tags);
        } else {
          t?.skip("No patterns to invalidate", { color: "muted" });
        }
      }
    },

    api(context) {
      const { stateManager, eventEmitter } = context;
      const et = context.eventTracer?.(PLUGIN_NAME);

      const invalidate = (input: string | string[]): void => {
        const rawPatterns = Array.isArray(input) ? input : [input];

        // Both "*" and "/*" trigger global refetch
        if (rawPatterns.includes("*") || rawPatterns.includes("/*")) {
          et?.emit("Refetch all (manual)", { color: "warning" });
          eventEmitter.emit("refetchAll", undefined);
          return;
        }

        const patterns = rawPatterns.map(normalizeTag);

        // Check if any normalized pattern is "*" (from "/*")
        if (patterns.includes("*")) {
          et?.emit("Refetch all (manual)", { color: "warning" });
          eventEmitter.emit("refetchAll", undefined);
          return;
        }

        if (patterns.length > 0) {
          et?.emit(`Invalidated: ${patterns.join(", ")}`, { color: "info" });
          stateManager.markStale(patterns);
          eventEmitter.emit("invalidate", patterns);
        }
      };

      return { invalidate };
    },

    internal(context): InvalidationPluginInternal {
      return {
        disableAutoInvalidate() {
          context.temp.set(AUTO_INVALIDATE_DISABLED_KEY, true);
        },
      };
    },
  });
}
