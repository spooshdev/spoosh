import {
  enlace,
  type EnlacePlugin,
  type EnlaceOptions,
  createPluginExecutor,
  createStateManager,
  createEventEmitter,
} from "enlace-core";
import { createUseRead } from "./useRead";
import { createUseWrite } from "./useWrite";
import { createUseInfiniteRead } from "./useInfiniteRead";

export type { PluginHooksConfig, BaseReadOptions } from "./types";
export type {
  UseReadResult,
  UseWriteResult,
  UseInfiniteReadResult,
  BaseReadResult,
  BaseWriteResult,
  BaseInfiniteReadResult,
  BaseInfiniteReadOptions,
} from "./types";

type PluginArray = readonly EnlacePlugin<
  object,
  object,
  object,
  object,
  object
>[];

type HooksConfig<TPlugins extends PluginArray> = {
  baseUrl: string;
  defaultOptions?: EnlaceOptions;
  plugins: TPlugins;
};

export function enlaceHooks<TSchema, TDefaultError = unknown>() {
  return <const TPlugins extends PluginArray>(
    config: HooksConfig<TPlugins>
  ) => {
    const { baseUrl, defaultOptions = {}, plugins } = config;

    const api = enlace<TSchema, TDefaultError>(baseUrl, defaultOptions);
    const stateManager = createStateManager();
    const eventEmitter = createEventEmitter();
    const pluginExecutor = createPluginExecutor([...plugins]);

    const useRead = createUseRead<TSchema, TDefaultError, TPlugins>({
      api,
      stateManager,
      eventEmitter,
      pluginExecutor,
    });

    const useWrite = createUseWrite<TSchema, TDefaultError, TPlugins>({
      api,
      stateManager,
      eventEmitter,
      pluginExecutor,
    });

    const useInfiniteRead = createUseInfiniteRead<
      TSchema,
      TDefaultError,
      TPlugins
    >({
      api,
      stateManager,
      eventEmitter,
      pluginExecutor,
    });

    return {
      useRead,
      useWrite,
      useInfiniteRead,
      api,
      stateManager,
      eventEmitter,
      pluginExecutor,
    };
  };
}
