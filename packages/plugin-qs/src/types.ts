import type { IStringifyOptions } from "qs";

export type QsPluginConfig = IStringifyOptions;

export type QsOptions = IStringifyOptions;

export interface QsReadHookOptions {
  qs?: QsOptions;
}

export interface QsWriteHookOptions {
  qs?: QsOptions;
}

export interface QsPagesHookOptions {
  qs?: QsOptions;
}

export interface QsQueueHookOptions {
  qs?: QsOptions;
}

export type QsReadResult = object;

export type QsWriteResult = object;

export type QsQueueResult = object;
