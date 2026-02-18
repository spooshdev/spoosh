export { create } from "./create";

export type {
  SpooshInstanceShape,
  EnabledOption,
  AngularOptionsMap,
} from "./types/shared";
export type {
  ExtractMethodData,
  ExtractMethodError,
  ExtractMethodOptions,
  ExtractMethodQuery,
  ExtractMethodBody,
  ExtractResponseQuery,
  ExtractResponseBody,
  ExtractResponseParamNames,
} from "./types/extraction";
export type {
  BaseReadOptions,
  BaseReadResult,
  ReadApiClient,
  TriggerOptions,
  ResponseInputFields,
} from "./injectRead/types";
export type {
  BaseWriteResult,
  WriteApiClient,
  WriteResponseInputFields,
} from "./injectWrite/types";
export type {
  BasePagesOptions,
  BasePagesResult,
  PagesApiClient,
  PagesTriggerOptions,
} from "./injectPages/types";
export type {
  BaseQueueResult,
  QueueApiClient,
  QueueTriggerInput,
  InjectQueueOptions,
} from "./injectQueue/types";
