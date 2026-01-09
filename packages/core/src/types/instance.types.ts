import type { StateManager } from "../state/manager";
import type { EventEmitter } from "../events/emitter";
import type { PluginExecutor } from "../plugins/executor";
import type { EnlaceClient } from "./client.types";
import type { EnlaceOptions } from "./request.types";
import type { EnlacePlugin, PluginTypeConfig } from "../plugins/types";
import type { CoreRequestOptionsBase } from "./request.types";

export type PluginArray = readonly EnlacePlugin<PluginTypeConfig>[];

export interface EnlaceConfig<TPlugins extends PluginArray = PluginArray> {
  baseUrl: string;
  defaultOptions?: EnlaceOptions;
  plugins?: TPlugins;
}

export type EnlaceInstance<
  TSchema = unknown,
  TDefaultError = unknown,
  TPlugins extends PluginArray = PluginArray,
> = {
  api: EnlaceClient<TSchema, TDefaultError, CoreRequestOptionsBase>;

  stateManager: StateManager;
  eventEmitter: EventEmitter;
  pluginExecutor: PluginExecutor;

  config: {
    baseUrl: string;
    defaultOptions: EnlaceOptions;
  };

  _types: {
    schema: TSchema;
    defaultError: TDefaultError;
    plugins: TPlugins;
  };
};
