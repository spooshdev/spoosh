import type {
  SpooshPlugin,
  SpooshResponse,
  RequestTracer,
  EventTracer,
  TraceOptions,
  TraceStage,
} from "@spoosh/core";

import { DevToolStore } from "./store";
import { DevToolPanel } from "./ui/panel";
import type { DevToolConfig, DevToolInstanceApi, DevToolTheme } from "./types";
import type { DedupeMode } from "@spoosh/plugin-deduplication";

function resolvePathWithParams(
  path: string,
  params: Record<string, string | number> | undefined
): string {
  if (!params) return path;

  return path
    .split("/")
    .map((segment) => {
      if (segment.startsWith(":")) {
        const paramName = segment.slice(1);
        const value = params[paramName];

        return value !== undefined ? String(value) : segment;
      }

      return segment;
    })
    .join("/");
}

let globalStore: DevToolStore | null = null;
let globalPanel: DevToolPanel | null = null;

export function devtool(
  config: DevToolConfig = {}
): SpooshPlugin<{ instanceApi: DevToolInstanceApi }> {
  const { enabled = true, maxHistory = 50, showFloatingIcon = true } = config;

  if (!enabled || typeof window === "undefined") {
    return {
      name: "spoosh:devtool",
      operations: ["read", "write", "infiniteRead"],
    };
  }

  if (!globalStore) {
    globalStore = new DevToolStore({ maxHistory });
  }

  const store = globalStore;

  const createEventTracer = (plugin: string): EventTracer => ({
    emit: (msg, options) =>
      store.addEvent({
        plugin,
        message: msg,
        color: options?.color,
        queryKey: options?.queryKey,
        meta: options?.meta,
        timestamp: Date.now(),
      }),
  });

  return {
    name: "spoosh:devtool",
    operations: ["read", "write", "infiniteRead"],
    priority: -100,

    contextEnhancer(context) {
      context.eventTracer = createEventTracer;
    },

    middleware: async (context, next) => {
      const hasPendingPromise = context.stateManager.getPendingPromise(
        context.queryKey
      );

      if (hasPendingPromise) {
        const dedupePlugin = context.plugins?.get("spoosh:deduplication");
        const willBeDeduplicated = dedupePlugin?.isDedupeEnabled(
          context.operationType,
          context.pluginOptions as { dedupe?: DedupeMode } | undefined
        );

        if (willBeDeduplicated) {
          return next();
        }
      }

      const resolvedPath = resolvePathWithParams(
        context.path,
        context.request.params as Record<string, string | number> | undefined
      );

      const trace = store.startTrace(context, resolvedPath);

      const createRequestTracer = (plugin: string): RequestTracer => {
        const step = (
          stage: TraceStage,
          msg: string,
          options?: TraceOptions
        ) => {
          trace.addStep(
            {
              plugin,
              stage,
              reason: msg,
              color: options?.color,
              diff: options?.diff,
            },
            performance.now()
          );
        };

        return {
          return: (msg, options) => step("return", msg, options),
          log: (msg, options) => step("log", msg, options),
          skip: (msg, options) => step("skip", msg, options),
        };
      };

      context.tracer = createRequestTracer;

      const response = await next();

      const isDebounced =
        response?.status === 0 &&
        response?.data === undefined &&
        !response?.error &&
        !response?.aborted;

      if (isDebounced) {
        store.discardTrace(trace.id);
      } else {
        store.endTrace(trace.id, response as SpooshResponse<unknown, unknown>);
      }

      return response;
    },

    lifecycle: {
      onMount(context) {
        store.recordLifecycle("onMount", context);
      },

      onUpdate(context, prevContext) {
        store.recordLifecycle("onUpdate", context, prevContext);
      },

      onUnmount(context) {
        store.recordLifecycle("onUnmount", context);
      },
    },

    instanceApi(ctx) {
      ctx.eventTracer = createEventTracer;

      const plugins = ctx.pluginExecutor
        .getPlugins()
        .map((p) => ({ name: p.name, operations: [...p.operations] }));
      store.setRegisteredPlugins(plugins);

      if (!globalPanel) {
        globalPanel = new DevToolPanel({
          store,
          showFloatingIcon,
        });
        globalPanel.mount();
      }

      ctx.eventEmitter.on("invalidate", (tags: string[]) => {
        const affectedKeys = ctx.stateManager.getCacheEntriesByTags(tags);
        const listenerCounts = affectedKeys.map(({ key }) => ({
          key,
          count: ctx.stateManager.getSubscribersCount(key),
        }));

        store.recordInvalidation({
          tags,
          affectedKeys: listenerCounts,
          totalListeners: listenerCounts.reduce((sum, k) => sum + k.count, 0),
          timestamp: Date.now(),
        });
      });

      ctx.eventEmitter.on("devtool:event", (event) => {
        store.addEvent(event);
      });

      return {
        devtools: {
          getHistory: () => store.getTraces(),
          clearHistory: () => store.clear(),
          setEnabled: (value: boolean) => globalPanel?.setVisible(value),
          setTheme: (newTheme: "light" | "dark" | DevToolTheme) =>
            globalPanel?.setTheme(newTheme),
          open: () => globalPanel?.open(),
          close: () => globalPanel?.close(),
          toggle: () => globalPanel?.toggle(),
        },
      };
    },
  };
}
