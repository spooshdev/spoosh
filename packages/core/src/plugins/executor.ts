import type {
  EnlacePlugin,
  OperationType,
  PluginAccessor,
  PluginContext,
  PluginContextInput,
  PluginPhase,
} from "./types";

export type PluginExecutor = {
  execute: <TData, TError>(
    phase: PluginPhase,
    operationType: OperationType,
    context: PluginContext<TData, TError>
  ) => Promise<PluginContext<TData, TError>>;

  getPlugins: () => readonly EnlacePlugin[];

  /** Creates a full PluginContext with plugins accessor injected */
  createContext: <TData, TError>(
    input: PluginContextInput<TData, TError>
  ) => PluginContext<TData, TError>;
};

function validateDependencies(plugins: EnlacePlugin[]): void {
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

function sortByDependencies(plugins: EnlacePlugin[]): EnlacePlugin[] {
  const sorted: EnlacePlugin[] = [];
  const visited = new Set<string>();
  const visiting = new Set<string>();
  const pluginMap = new Map(plugins.map((p) => [p.name, p]));

  function visit(plugin: EnlacePlugin): void {
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
  initialPlugins: EnlacePlugin[] = []
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

  return {
    async execute<TData, TError>(
      phase: PluginPhase,
      operationType: OperationType,
      context: PluginContext<TData, TError>
    ): Promise<PluginContext<TData, TError>> {
      let ctx = context;

      for (const plugin of plugins) {
        if (!plugin.operations.includes(operationType)) {
          continue;
        }

        const handler = plugin.handlers[phase];

        if (!handler) {
          continue;
        }

        ctx = (await handler(
          ctx as PluginContext<unknown, unknown>
        )) as PluginContext<TData, TError>;
      }

      return ctx;
    },

    getPlugins() {
      return frozenPlugins;
    },

    createContext<TData, TError>(input: PluginContextInput<TData, TError>) {
      const ctx = input as PluginContext<TData, TError>;
      ctx.plugins = createPluginAccessor(ctx);
      return ctx;
    },
  };
}
