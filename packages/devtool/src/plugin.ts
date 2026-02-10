import type {
  SpooshPlugin,
  SpooshResponse,
  RequestTracer,
  EventTracer,
  TraceOptions,
  TraceStage,
  DevtoolEvents,
} from "@spoosh/core";

import { DevToolStore } from "./store";
import { DevToolPanel } from "./ui/panel";
import type { DevToolConfig, DevToolInstanceApi } from "./types";
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

const DEFAULT_SENSITIVE_HEADERS = [
  "authorization",
  "proxy-authorization",
  "cookie",
  "set-cookie",
  "x-api-key",
];

let globalStore: DevToolStore | null = null;
let globalPanel: DevToolPanel | null = null;

export function devtool(
  config: DevToolConfig = {}
): SpooshPlugin<{ instanceApi: DevToolInstanceApi }> {
  const { enabled = true, showFloatingIcon = true } = config;

  if (!enabled || typeof window === "undefined") {
    return {
      name: "spoosh:devtool",
      operations: ["read", "write", "infiniteRead"],
    };
  }

  const sensitiveSet = new Set(
    (config.sensitiveHeaders ?? DEFAULT_SENSITIVE_HEADERS).map((h) =>
      h.toLowerCase()
    )
  );

  if (!globalStore) {
    globalStore = new DevToolStore();
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
      context.temp.set("devtool:traceId", trace.id);

      const createRequestTracer = (plugin: string): RequestTracer => {
        const step = (
          stage: TraceStage,
          msg: string,
          options?: TraceOptions
        ) => {
          trace.addStep(
            { plugin, stage, reason: msg, ...options },
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
        context.temp.delete("devtool:traceId");
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

    setup(ctx) {
      ctx.eventTracer = createEventTracer;
      ctx.pluginExecutor.registerContextEnhancer((context) => {
        context.eventTracer = createEventTracer;
      });

      const plugins = ctx.pluginExecutor
        .getPlugins()
        .map((p) => ({ name: p.name, operations: [...p.operations] }));
      store.setRegisteredPlugins(plugins);
      store.setStateManager(ctx.stateManager);
      store.setEventEmitter(ctx.eventEmitter);
      store.setSensitiveHeaders(sensitiveSet);

      if (!globalPanel) {
        globalPanel = new DevToolPanel({
          store,
          showFloatingIcon,
          sensitiveHeaders: sensitiveSet,
        });
        globalPanel.mount();
      }

      const unsubInvalidate = ctx.eventEmitter.on(
        "invalidate",
        (tags: string[]) => {
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
        }
      );

      const unsubDevtoolEvent = ctx.eventEmitter.on<
        DevtoolEvents["spoosh:devtool-event"]
      >("spoosh:devtool-event", (event) => {
        store.addEvent(event);
      });

      const unsubRequestComplete = ctx.eventEmitter.on<
        DevtoolEvents["spoosh:request-complete"]
      >("spoosh:request-complete", ({ context }) => {
        const traceId = context.temp.get("devtool:traceId") as
          | string
          | undefined;

        if (!traceId) return;

        const headers = context.request.headers as
          | Record<string, string>
          | undefined;

        if (headers && Object.keys(headers).length > 0) {
          store.setTraceHeaders(traceId, { ...headers });
        }

        const cacheEntry = context.stateManager.getCache(context.queryKey);

        if (cacheEntry?.meta && cacheEntry.meta.size > 0) {
          store.setTraceMeta(traceId, Object.fromEntries(cacheEntry.meta));
        }
      });
    },

    instanceApi() {
      return {
        devtools: {
          exportTraces: () => store.exportTraces(),
          clearTraces: () => store.clear(),
          toggle: () => globalPanel?.toggle(),
          toggleFloatingIcon: () => globalPanel?.toggleFloatingIcon(),
        },
      };
    },
  };
}
