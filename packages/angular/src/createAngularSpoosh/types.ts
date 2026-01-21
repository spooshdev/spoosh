import type { PluginArray, MergePluginInstanceApi } from "@spoosh/core";
import type {
  SpooshInstanceShape,
  ExtractMethodData,
  ExtractMethodError,
} from "../types";

export type SpooshAngularFunctions<
  TDefaultError,
  TSchema,
  TPlugins extends PluginArray,
> = {
  injectRead: ReturnType<
    typeof import("../injectRead").createInjectRead<
      TSchema,
      TDefaultError,
      TPlugins
    >
  >;
  injectWrite: ReturnType<
    typeof import("../injectWrite").createInjectWrite<
      TSchema,
      TDefaultError,
      TPlugins
    >
  >;
  injectInfiniteRead: ReturnType<
    typeof import("../injectInfiniteRead").createInjectInfiniteRead<
      TSchema,
      TDefaultError,
      TPlugins
    >
  >;
} & MergePluginInstanceApi<TPlugins, TSchema>;

export type { SpooshInstanceShape, ExtractMethodData, ExtractMethodError };
