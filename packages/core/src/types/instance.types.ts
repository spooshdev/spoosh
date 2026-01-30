import type { StateManager } from "../state/manager";
import type { EventEmitter } from "../events/emitter";
import type { PluginExecutor } from "../plugins/executor";
import type { SpooshClient } from "./client.types";
import type { SpooshOptions } from "./request.types";
import type { SpooshPlugin, PluginTypeConfig } from "../plugins/types";

export type PluginArray = readonly SpooshPlugin<PluginTypeConfig>[];

/**
 * Configuration options for Spoosh runtime behavior.
 */
export type SpooshConfigOptions = {
  /**
   * Prefix to strip from tag generation.
   *
   * URL prefix stripping always auto-detects from baseUrl.
   * This option only affects tag generation for cache invalidation.
   *
   * - `undefined`: Auto-detect from baseUrl (default)
   * - `string`: Explicit prefix to strip from tags
   *
   * @example
   * ```ts
   * // Default: auto-detect from baseUrl
   * // baseUrl="/api", schema="api/posts" → tags: ["posts"]
   * new Spoosh<Schema>('https://localhost:3000/api')
   *
   * // Explicit prefix (when baseUrl doesn't have it)
   * // baseUrl="/", schema="api/v1/posts" → tags: ["posts"]
   * new Spoosh<Schema>('http://localhost:3000')
   *   .configure({ stripTagPrefix: "api/v1" })
   * ```
   */
  stripTagPrefix?: string;
};

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
