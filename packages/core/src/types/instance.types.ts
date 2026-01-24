import type { StateManager } from "../state/manager";
import type { EventEmitter } from "../events/emitter";
import type { PluginExecutor } from "../plugins/executor";
import type { SpooshClient } from "./client.types";
import type { SpooshOptions } from "./request.types";
import type { SpooshPlugin, PluginTypeConfig } from "../plugins/types";

export type PluginArray = readonly SpooshPlugin<PluginTypeConfig>[];

export interface SpooshConfig<TPlugins extends PluginArray = PluginArray> {
  baseUrl: string;
  defaultOptions?: SpooshOptions;
  plugins?: TPlugins;
}

export type SpooshInstance<
  TSchema = unknown,
  TDefaultError = unknown,
  TPlugins extends PluginArray = PluginArray,
> = {
  api: SpooshClient<TSchema, TDefaultError>;

  stateManager: StateManager;
  eventEmitter: EventEmitter;
  pluginExecutor: PluginExecutor;

  config: {
    baseUrl: string;
    defaultOptions: SpooshOptions;
  };

  _types: {
    schema: TSchema;
    defaultError: TDefaultError;
    plugins: TPlugins;
  };
};
