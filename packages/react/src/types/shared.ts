import type {
  SpooshPlugin,
  SpooshClient,
  SpooshOptions,
  MethodOptionsMap,
  CoreRequestOptionsBase,
  PluginTypeConfig,
} from "@spoosh/core";

type QueryRequestOptions = CoreRequestOptionsBase;

type MutationRequestOptions = CoreRequestOptionsBase;

export type ReactOptionsMap = MethodOptionsMap<
  QueryRequestOptions,
  MutationRequestOptions
>;

export type ApiClient<TSchema> = SpooshClient<TSchema, unknown>;

export type PluginHooksConfig<
  TPlugins extends readonly SpooshPlugin<PluginTypeConfig>[],
> = {
  baseUrl: string;
  defaultOptions?: SpooshOptions;
  plugins: TPlugins;
};
