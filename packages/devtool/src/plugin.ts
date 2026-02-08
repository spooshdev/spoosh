import type {
  SpooshPlugin,
  SpooshResponse,
  Trace,
  TraceEvent,
} from "@spoosh/core";

import { DevToolStore } from "./store";
import { DevToolPanel } from "./ui/panel";
import type { DevToolConfig, DevToolInstanceApi, DevToolTheme } from "./types";

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
  const {
    enabled = true,
    theme = "dark",
    position = "bottom-right",
    maxHistory = 50,
  } = config;

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

  return {
    name: "spoosh:devtool",
    operations: ["read", "write", "infiniteRead"],
    priority: -100,

    middleware: async (context, next) => {
      const resolvedPath = resolvePathWithParams(
        context.path,
        context.request.params as Record<string, string | number> | undefined
      );

      const trace = store.startTrace({
        operationType: context.operationType,
        method: context.method,
        path: resolvedPath,
        queryKey: context.queryKey,
        tags: context.tags,
      });

      const traceApi: Trace = {
        step: (eventOrFn: TraceEvent | (() => TraceEvent)) => {
          const event =
            typeof eventOrFn === "function" ? eventOrFn() : eventOrFn;
          trace.addStep(event, performance.now());
        },
      };

      (context as { trace: Trace }).trace = traceApi;

      const response = await next();

      store.endTrace(
        context.queryKey,
        response as SpooshResponse<unknown, unknown>
      );

      return response;
    },

    lifecycle: {
      onMount(context) {
        store.recordLifecycle("onMount", {
          operationType: context.operationType,
          method: context.method,
          path: context.path,
          queryKey: context.queryKey,
          tags: context.tags,
        });
      },

      onUpdate(context, prevContext) {
        store.recordLifecycle(
          "onUpdate",
          {
            operationType: context.operationType,
            method: context.method,
            path: context.path,
            queryKey: context.queryKey,
            tags: context.tags,
          },
          {
            operationType: prevContext.operationType,
            method: prevContext.method,
            path: prevContext.path,
            queryKey: prevContext.queryKey,
            tags: prevContext.tags,
          }
        );
      },

      onUnmount(context) {
        store.recordLifecycle("onUnmount", {
          operationType: context.operationType,
          method: context.method,
          path: context.path,
          queryKey: context.queryKey,
          tags: context.tags,
        });
      },
    },

    instanceApi(ctx) {
      const plugins = ctx.pluginExecutor
        .getPlugins()
        .map((p) => ({ name: p.name, operations: [...p.operations] }));
      store.setRegisteredPlugins(plugins);

      if (!globalPanel) {
        globalPanel = new DevToolPanel({
          store,
          theme,
          position,
          stateManager: ctx.stateManager,
          eventEmitter: ctx.eventEmitter,
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

      return {
        getHistory: () => store.getTraces(),
        clearHistory: () => store.clear(),
        setEnabled: (value: boolean) => globalPanel?.setVisible(value),
        setTheme: (newTheme: "light" | "dark" | DevToolTheme) =>
          globalPanel?.setTheme(newTheme),
        open: () => globalPanel?.open(),
        close: () => globalPanel?.close(),
        toggle: () => globalPanel?.toggle(),
      };
    },
  };
}
