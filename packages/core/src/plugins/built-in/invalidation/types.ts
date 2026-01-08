import type {
  AutoInvalidate,
  InvalidateOption,
} from "../../../types/invalidation.types";

export type { AutoInvalidate, InvalidateOption };

export type InvalidateCallbackFn<TSchema = unknown> = (
  api: TSchema
) => ((() => Promise<{ data?: unknown }>) | string)[];

export interface InvalidationWriteOptions<TSchema = unknown> {
  autoInvalidate?: AutoInvalidate;
  invalidate?: InvalidateOption<TSchema>;
}

export type InvalidationReadOptions = object;

export type InvalidationInfiniteReadOptions = object;

export type InvalidationReadResult = object;

export type InvalidationWriteResult = object;
