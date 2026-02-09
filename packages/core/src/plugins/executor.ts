import type {
  SpooshPlugin,
  OperationType,
  PluginAccessor,
  PluginContext,
  PluginContextInput,
  DevtoolEvents,
} from "./types";
import type { SpooshResponse } from "../types/response.types";

export type PluginExecutor = {
  /** Execute lifecycle hooks for onMount or onUnmount */
  executeLifecycle: (
    phase: "onMount" | "onUnmount",
    operationType: OperationType,
    context: PluginContext
  ) => Promise<void>;

  /** Execute onUpdate lifecycle with previous context */
  executeUpdateLifecycle: (
    operationType: OperationType,
    context: PluginContext,
    previousContext: PluginContext
  ) => Promise<void>;

  executeMiddleware: (
    operationType: OperationType,
    context: PluginContext,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    coreFetch: () => Promise<SpooshResponse<any, any>>
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ) => Promise<SpooshResponse<any, any>>;

  getPlugins: () => readonly SpooshPlugin[];

  /** Creates a full PluginContext with plugins accessor */
  createContext: (input: PluginContextInput) => PluginContext;
};

/**
 * Validates that all plugin dependencies are satisfied.
 * Throws if a plugin depends on another that isn't registered.
 */
function validateDependencies(plugins: SpooshPlugin[]): void {
  const pluginNames = new Set(plugins.map((p) => p.name));

  for (const plugin of plugins) {
    if (plugin.dependencies) {
      for (const dep of plugin.dependencies) {
        if (!pluginNames.has(dep)) {
          throw new Error(
            `Plugin "${plugin.name}" depends on "${dep}", but "${dep}" is not registered.`
          );
        }
      }
    }
  }
}

/**
 * Sort plugins by priority. Lower priority values run first.
 * Plugins with the same priority maintain their registration order (stable sort).
 */
function sortByPriority(plugins: SpooshPlugin[]): SpooshPlugin[] {
  return [...plugins].sort((a, b) => {
    const priorityA = a.priority ?? 0;
    const priorityB = b.priority ?? 0;
    return priorityA - priorityB;
  });
}

export function createPluginExecutor(
  initialPlugins: SpooshPlugin[] = []
): PluginExecutor {
  validateDependencies(initialPlugins);
  const plugins = sortByPriority(initialPlugins);
  const frozenPlugins = Object.freeze([...plugins]);

  const createPluginAccessor = (context: PluginContext): PluginAccessor => ({
    get(name: string) {
      const plugin = plugins.find((p) => p.name === name);
      return plugin?.exports?.(context);
    },
  });

  const executeLifecycleImpl = async (
    phase: "onMount" | "onUnmount",
    operationType: OperationType,
    context: PluginContext
  ): Promise<void> => {
    for (const plugin of plugins) {
      if (!plugin.operations.includes(operationType)) {
        continue;
      }

      const handler = plugin.lifecycle?.[phase];

      if (!handler) {
        continue;
      }

      await handler(context);
    }
  };

  const executeUpdateLifecycleImpl = async (
    operationType: OperationType,
    context: PluginContext,
    previousContext: PluginContext
  ): Promise<void> => {
    for (const plugin of plugins) {
      if (!plugin.operations.includes(operationType)) {
        continue;
      }

      const handler = plugin.lifecycle?.onUpdate;

      if (!handler) {
        continue;
      }

      await handler(context, previousContext);
    }
  };

  return {
    executeLifecycle: executeLifecycleImpl,
    executeUpdateLifecycle: executeUpdateLifecycleImpl,

    async executeMiddleware(
      operationType: OperationType,
      context: PluginContext,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      coreFetch: () => Promise<SpooshResponse<any, any>>
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ): Promise<SpooshResponse<any, any>> {
      const applicablePlugins = plugins.filter((p) =>
        p.operations.includes(operationType)
      );

      const middlewares = applicablePlugins
        .filter((p) => p.middleware)
        .map((p) => p.middleware!);

      const tracedCoreFetch = async () => {
        const fetchTracer = context.tracer?.("spoosh:fetch");
        fetchTracer?.log("Network request");
        return coreFetch();
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let response: SpooshResponse<any, any>;

      if (middlewares.length === 0) {
        response = await tracedCoreFetch();
      } else {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        type NextFn = () => Promise<SpooshResponse<any, any>>;

        const chain: NextFn = middlewares.reduceRight<NextFn>(
          (next, middleware) => () => middleware(context, next),
          tracedCoreFetch
        );

        response = await chain();
      }

      for (const plugin of applicablePlugins) {
        if (plugin.afterResponse) {
          const newResponse = await plugin.afterResponse(context, response);

          if (newResponse) {
            response = newResponse;
          }
        }
      }

      context.eventEmitter.emit<DevtoolEvents["spoosh:request-complete"]>(
        "spoosh:request-complete",
        { context, queryKey: context.queryKey }
      );

      return response;
    },

    getPlugins() {
      return frozenPlugins;
    },

    createContext(input: PluginContextInput) {
      const ctx = input as PluginContext;
      ctx.plugins = createPluginAccessor(ctx);

      for (const plugin of plugins) {
        plugin.contextEnhancer?.(ctx);
      }

      return ctx;
    },
  };
}
