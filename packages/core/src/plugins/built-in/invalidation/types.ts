import type { EnlaceResponse } from "../../../types/response.types";
import type { SchemaMethod } from "../../../types/common.types";
import type { QuerySchemaHelper } from "../../schema-helper";

export type AutoInvalidate = "all" | "self" | "none";

type InvalidateCallbackFn<TSchema> = (
  api: QuerySchemaHelper<TSchema>
) => (
  | ((...args: unknown[]) => Promise<EnlaceResponse<unknown, unknown>>)
  | string
)[];

export type InvalidateOption<TSchema> =
  | string[]
  | InvalidateCallbackFn<TSchema>;

type InvalidateOptionForMethod<TRootSchema> = {
  autoInvalidate?: AutoInvalidate;
  invalidate?: InvalidateOption<TRootSchema>;
};

export type WithInvalidate<
  TMethod extends SchemaMethod,
  TRootSchema,
> = TMethod extends "$get" ? object : InvalidateOptionForMethod<TRootSchema>;

export interface InvalidationPluginConfig {
  autoInvalidate?: AutoInvalidate;
}

export interface InvalidationWriteOptions<TSchema = unknown> {
  autoInvalidate?: AutoInvalidate;
  invalidate?: InvalidateOption<TSchema>;
}

export type InvalidationReadOptions = object;

export type InvalidationInfiniteReadOptions = object;

export type InvalidationReadResult = object;

export type InvalidationWriteResult = object;
