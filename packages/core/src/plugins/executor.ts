import type {
  EnlacePlugin,
  OperationType,
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
};

export function createPluginExecutor(
  initialPlugins: EnlacePlugin[] = []
): PluginExecutor {
  const plugins = [...initialPlugins];

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

        if (ctx.skipRemainingPlugins) {
          ctx.skipRemainingPlugins = false;
          break;
        }
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
  };
}
