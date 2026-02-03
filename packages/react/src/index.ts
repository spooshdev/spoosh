"use client";

export { createReactSpoosh, type SpooshReactHooks } from "./createReactSpoosh";
export { createUseRead } from "./useRead";
export { createUseWrite } from "./useWrite";
export { createUseInfiniteRead } from "./useInfiniteRead";

export type { PluginHooksConfig } from "./types/shared";
export type {
  BaseReadOptions,
  UseReadResult,
  BaseReadResult,
  TriggerOptions,
  ResponseInputFields,
  ReadApiClient,
} from "./useRead/types";
export type {
  UseWriteResult,
  BaseWriteResult,
  WriteResponseInputFields,
  WriteApiClient,
} from "./useWrite/types";
export type {
  UseInfiniteReadResult,
  BaseInfiniteReadResult,
  BaseInfiniteReadOptions,
  AnyInfiniteRequestOptions,
  InfiniteReadApiClient,
  InfiniteNextContext,
  InfinitePrevContext,
} from "./useInfiniteRead/types";
export type {
  ExtractMethodData,
  ExtractMethodError,
  ExtractMethodOptions,
  ExtractCoreMethodOptions,
  ExtractResponseRequestOptions,
  ExtractMethodQuery,
  ExtractMethodBody,
  ExtractResponseQuery,
  ExtractResponseBody,
  ExtractResponseParamNames,
} from "./types/extraction";
