export { create, type SpooshReactHooks } from "./create";

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
  InfiniteReadApiClient,
  InfiniteNextContext,
  InfinitePrevContext,
  InfiniteTriggerOptions,
} from "./useInfiniteRead/types";
export type {
  UseQueueResult,
  UseQueueOptions,
  QueueApiClient,
  QueueTriggerInput,
} from "./useQueue/types";
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
