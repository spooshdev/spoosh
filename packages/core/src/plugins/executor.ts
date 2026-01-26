import type {
  SpooshPlugin,
  OperationType,
  PluginAccessor,
  PluginContext,
  PluginContextInput,
} from "./types";
import type { SpooshResponse } from "../types/response.types";

export type PluginExecutor = {
  /** Execute lifecycle hooks for onMount or onUnmount */
  executeLifecycle: <TData, TError>(
    phase: "onMount" | "onUnmount",
    operationType: OperationType,
    context: PluginContext<TData, TError>
  ) => Promise<void>;

  /** Execute onUpdate lifecycle with previous context */
  executeUpdateLifecycle: <TData, TError>(
    operationType: OperationType,
    context: PluginContext<TData, TError>,
    previousContext: PluginContext<TData, TError>
  ) => Promise<void>;

  /** Execute middleware chain with a core fetch function, then run afterResponse handlers */
  executeMiddleware: <TData, TError>(
    operationType: OperationType,
    context: PluginContext<TData, TError>,
    coreFetch: () => Promise<SpooshResponse<TData, TError>>
  ) => Promise<SpooshResponse<TData, TError>>;

  getPlugins: () => readonly SpooshPlugin[];

  /** Creates a full PluginContext with plugins accessor injected */
  createContext: <TData, TError>(
    input: PluginContextInput<TData, TError>
  ) => PluginContext<TData, TError>;
};

function validateDependencies(plugins: SpooshPlugin[]): void {
  const names = new Set(plugins.map((p) => p.name));

  for (const plugin of plugins) {
    for (const dep of plugin.dependencies ?? []) {
      if (!names.has(dep)) {
        throw new Error(
          `Plugin "${plugin.name}" depends on "${dep}" which is not registered`
        );
      }
    }
  }
}

function sortByDependencies(plugins: SpooshPlugin[]): SpooshPlugin[] {
  const sorted: SpooshPlugin[] = [];
  const visited = new Set<string>();
  const visiting = new Set<string>();
  const pluginMap = new Map(plugins.map((p) => [p.name, p]));

  function visit(plugin: SpooshPlugin): void {
    if (visited.has(plugin.name)) return;

    if (visiting.has(plugin.name)) {
      throw new Error(
        `Circular dependency detected involving "${plugin.name}"`
      );
    }

    visiting.add(plugin.name);

    for (const dep of plugin.dependencies ?? []) {
      const depPlugin = pluginMap.get(dep);
      if (depPlugin) visit(depPlugin);
    }

    visiting.delete(plugin.name);
    visited.add(plugin.name);
    sorted.push(plugin);
  }

  for (const plugin of plugins) {
    visit(plugin);
  }

  return sorted;
}

export function createPluginExecutor(
  initialPlugins: SpooshPlugin[] = []
): PluginExecutor {
  validateDependencies(initialPlugins);
  const plugins = sortByDependencies(initialPlugins);
  const frozenPlugins = Object.freeze([...plugins]);

  const createPluginAccessor = (context: PluginContext): PluginAccessor => ({
    get(name: string) {
      const plugin = plugins.find((p) => p.name === name);
      return plugin?.exports?.(context);
    },
  });

  const executeLifecycleImpl = async <TData, TError>(
    phase: "onMount" | "onUnmount",
    operationType: OperationType,
    context: PluginContext<TData, TError>
  ): Promise<void> => {
    for (const plugin of plugins) {
      if (!plugin.operations.includes(operationType)) {
        continue;
      }

      const handler = plugin.lifecycle?.[phase];

      if (!handler) {
        continue;
      }

      await handler(context as PluginContext<unknown, unknown>);
    }
  };

  const executeUpdateLifecycleImpl = async <TData, TError>(
    operationType: OperationType,
    context: PluginContext<TData, TError>,
    previousContext: PluginContext<TData, TError>
  ): Promise<void> => {
    for (const plugin of plugins) {
      if (!plugin.operations.includes(operationType)) {
        continue;
      }

      const handler = plugin.lifecycle?.onUpdate;

      if (!handler) {
        continue;
      }

      await handler(
        context as PluginContext<unknown, unknown>,
        previousContext as PluginContext<unknown, unknown>
      );
    }
  };

  return {
    executeLifecycle: executeLifecycleImpl,
    executeUpdateLifecycle: executeUpdateLifecycleImpl,

    async executeMiddleware<TData, TError>(
      operationType: OperationType,
      context: PluginContext<TData, TError>,
      coreFetch: () => Promise<SpooshResponse<TData, TError>>
    ): Promise<SpooshResponse<TData, TError>> {
      const applicablePlugins = plugins.filter((p) =>
        p.operations.includes(operationType)
      );

      const middlewares = applicablePlugins
        .filter((p) => p.middleware)
        .map((p) => p.middleware!);

      let response: SpooshResponse<TData, TError>;

      if (middlewares.length === 0) {
        response = await coreFetch();
      } else {
        type NextFn = () => Promise<SpooshResponse<TData, TError>>;

        const chain: NextFn = middlewares.reduceRight<NextFn>(
          (next, middleware) => {
            return () =>
              middleware(
                context as PluginContext<unknown, unknown>,
                next as () => Promise<SpooshResponse<unknown, unknown>>
              ) as Promise<SpooshResponse<TData, TError>>;
          },
          coreFetch
        );

        response = await chain();
      }

      for (const plugin of applicablePlugins) {
        if (plugin.afterResponse) {
          const newResponse = await plugin.afterResponse(
            context as PluginContext<unknown, unknown>,
            response as SpooshResponse<unknown, unknown>
          );

          if (newResponse) {
            response = newResponse as SpooshResponse<TData, TError>;
          }
        }
      }

      return response;
    },

    getPlugins() {
      return frozenPlugins;
    },

    createContext<TData, TError>(input: PluginContextInput<TData, TError>) {
      const ctx = input as PluginContext<TData, TError>;
      ctx.plugins = createPluginAccessor(ctx);
      ctx.headers = {};
      ctx.setHeaders = (newHeaders) => {
        ctx.headers = { ...ctx.headers, ...newHeaders };
        ctx.requestOptions.headers = ctx.headers;
      };
      return ctx;
    },
  };
}
