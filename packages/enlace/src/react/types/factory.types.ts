import type { UseAPIQuery } from "./query.types";
import type { UseAPIMutation } from "./mutation.types";
import type { UseAPIInfiniteQuery } from "./infinite.types";

export type EnlaceHooks<TSchema, TDefaultError = unknown> = {
  useQuery: UseAPIQuery<TSchema, TDefaultError>;
  useMutation: UseAPIMutation<TSchema, TDefaultError>;
  useInfiniteQuery: UseAPIInfiniteQuery<TSchema, TDefaultError>;
};
