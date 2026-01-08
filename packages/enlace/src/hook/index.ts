"use client";

export { enlaceHookReact as enlaceHooks } from "../react/enlaceHookReact";
export * from "../react/types";
export { invalidateTags } from "../react/revalidator";
export * from "../react/experimental";

export {
  cachePlugin,
  type CachePluginConfig,
  type CacheReadOptions,
  type CacheWriteOptions,
  pollingPlugin,
  type PollingPluginConfig,
  type PollingReadOptions,
} from "enlace-core";
