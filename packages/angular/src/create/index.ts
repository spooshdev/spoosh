import type { PluginArray, PluginExecutor } from "@spoosh/core";
import { createInjectRead } from "../injectRead";
import { createInjectWrite } from "../injectWrite";
import { createInjectInfiniteRead } from "../injectInfiniteRead";
import type { SpooshAngularFunctions, SpooshInstanceShape } from "./types";

export function create<
  TSchema,
  TDefaultError,
  TPlugins extends PluginArray,
  TApi,
>(
  instance: SpooshInstanceShape<TApi, TSchema, TDefaultError, TPlugins>
): SpooshAngularFunctions<TDefaultError, TSchema, TPlugins> {
  const { api, stateManager, eventEmitter, pluginExecutor } = instance;

  const injectRead = createInjectRead<TSchema, TDefaultError, TPlugins>({
    api,
    stateManager,
    eventEmitter,
    pluginExecutor,
  } as Parameters<
    typeof createInjectRead<TSchema, TDefaultError, TPlugins>
  >[0]);

  const injectWrite = createInjectWrite<TSchema, TDefaultError, TPlugins>({
    api,
    stateManager,
    eventEmitter,
    pluginExecutor,
  } as Parameters<
    typeof createInjectWrite<TSchema, TDefaultError, TPlugins>
  >[0]);

  const injectInfiniteRead = createInjectInfiniteRead<
    TSchema,
    TDefaultError,
    TPlugins
  >({
    api,
    stateManager,
    eventEmitter,
    pluginExecutor,
  } as Parameters<
    typeof createInjectInfiniteRead<TSchema, TDefaultError, TPlugins>
  >[0]);

  const plugins = (pluginExecutor as PluginExecutor).getPlugins();

  const setupContext = {
    stateManager,
    eventEmitter,
    pluginExecutor,
  };

  for (const plugin of plugins) {
    plugin.setup?.(setupContext);
  }

  const instanceApiContext = {
    api,
    stateManager,
    eventEmitter,
    pluginExecutor,
  };

  const instanceApis = plugins.reduce(
    (acc, plugin) => {
      if (plugin.instanceApi) {
        return { ...acc, ...plugin.instanceApi(instanceApiContext) };
      }

      return acc;
    },
    {} as Record<string, unknown>
  );

  return {
    injectRead,
    injectWrite,
    injectInfiniteRead,
    ...instanceApis,
  } as SpooshAngularFunctions<TDefaultError, TSchema, TPlugins>;
}

export * from "./types";
