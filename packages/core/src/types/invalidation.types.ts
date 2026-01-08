import type { EnlaceResponse } from "./response.types";
import type { SchemaMethod } from "./common.types";
import type { OptimisticSchemaHelper } from "./optimistic.types";

export type AutoInvalidate = "all" | "self" | false;

type InvalidateCallbackFn<TSchema> = (
  api: OptimisticSchemaHelper<TSchema>
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
