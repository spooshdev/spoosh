import type { PluginArray, MergePluginInstanceApi } from "@spoosh/core";
import type { SpooshInstanceShape } from "../types/shared";
import type {
  ExtractMethodData,
  ExtractMethodError,
} from "../types/extraction";

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
  injectPages: ReturnType<
    typeof import("../injectPages").createInjectPages<
      TSchema,
      TDefaultError,
      TPlugins
    >
  >;
  injectQueue: ReturnType<
    typeof import("../injectQueue").createInjectQueue<
      TSchema,
      TDefaultError,
      TPlugins
    >
  >;
} & MergePluginInstanceApi<TPlugins, TSchema>;

export type { SpooshInstanceShape, ExtractMethodData, ExtractMethodError };
