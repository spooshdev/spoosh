"use client";

export { createReactSpoosh, type SpooshReactHooks } from "./createReactSpoosh";
export { createUseRead } from "./useRead";
export { createUseWrite } from "./useWrite";
export { createUseInfiniteRead } from "./useInfiniteRead";

export type {
  PluginHooksConfig,
  BaseReadOptions,
  UseReadResult,
  UseWriteResult,
  UseInfiniteReadResult,
  BaseReadResult,
  BaseWriteResult,
  BaseInfiniteReadResult,
  BaseInfiniteReadOptions,
} from "./types";
