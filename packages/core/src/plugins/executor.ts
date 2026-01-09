import type {
  EnlacePlugin,
  OperationType,
  PluginAccessor,
  PluginContext,
  PluginPhase,
} from "./types";

export type PluginExecutor = {
  execute: <TData, TError>(
    phase: PluginPhase,
    operationType: OperationType,
    context: PluginContext<TData, TError>
  ) => Promise<PluginContext<TData, TError>>;

  addPlugin: (plugin: EnlacePlugin) => void;
  removePlugin: (name: string) => void;
  getPlugins: () => EnlacePlugin[];
  createPluginAccessor: (context: PluginContext) => PluginAccessor;
};

export function createPluginExecutor(
  initialPlugins: EnlacePlugin[] = []
): PluginExecutor {
  const plugins = [...initialPlugins];

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

    addPlugin(plugin) {
      plugins.push(plugin);
    },

    removePlugin(name) {
      const index = plugins.findIndex((p) => p.name === name);

      if (index !== -1) {
        plugins.splice(index, 1);
      }
    },

    getPlugins() {
      return [...plugins];
    },

    createPluginAccessor,
  };
}
