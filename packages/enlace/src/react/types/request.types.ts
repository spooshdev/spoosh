import type {
  CoreRequestOptionsBase,
  MethodOptionsMap,
  ResolvedCacheConfig,
  AutoInvalidate,
} from "enlace-core";

export type QueryRequestOptions = CoreRequestOptionsBase & {
  tags?: string[];
  additionalTags?: string[];
};

export type MutationRequestOptions = CoreRequestOptionsBase;

export type ReactOptionsMap = MethodOptionsMap<
  QueryRequestOptions,
  MutationRequestOptions
>;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyInvalidateOption = string[] | ((api: any) => any[]);

export type AnyReactRequestOptions = QueryRequestOptions & {
  autoInvalidate?: AutoInvalidate;
  invalidate?: AnyInvalidateOption;
  params?: Record<string, string | number>;
  optimistic?: (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    cache: any,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    api: any
  ) => ResolvedCacheConfig | ResolvedCacheConfig[];
};
