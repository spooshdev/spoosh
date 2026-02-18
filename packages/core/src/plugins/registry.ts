import type { SpooshPlugin, PluginTypeConfig } from "./types";
import type { ResolveInstanceApi } from "./type-resolver";

type ExtractReadOptions<T> =
  T extends SpooshPlugin<infer Types>
    ? Types extends { readOptions: infer R }
      ? R
      : object
    : object;

type ExtractWriteOptions<T> =
  T extends SpooshPlugin<infer Types>
    ? Types extends { writeOptions: infer W }
      ? W
      : object
    : object;

type ExtractPagesOptions<T> =
  T extends SpooshPlugin<infer Types>
    ? Types extends { pagesOptions: infer I }
      ? I
      : object
    : object;

type ExtractWriteTriggerOptions<T> =
  T extends SpooshPlugin<infer Types>
    ? Types extends { writeTriggerOptions: infer W }
      ? W
      : object
    : object;

type ExtractQueueOptions<T> =
  T extends SpooshPlugin<infer Types>
    ? Types extends { queueOptions: infer Q }
      ? Q
      : object
    : object;

type ExtractQueueTriggerOptions<T> =
  T extends SpooshPlugin<infer Types>
    ? Types extends { queueTriggerOptions: infer Q }
      ? Q
      : object
    : object;

type ExtractQueueResult<T> =
  T extends SpooshPlugin<infer Types>
    ? Types extends { queueResult: infer Q }
      ? Q
      : object
    : object;

type ExtractReadResult<T> =
  T extends SpooshPlugin<infer Types>
    ? Types extends { readResult: infer R }
      ? R
      : object
    : object;

type ExtractWriteResult<T> =
  T extends SpooshPlugin<infer Types>
    ? Types extends { writeResult: infer W }
      ? W
      : object
    : object;

type ExtractInstanceApi<T> =
  T extends SpooshPlugin<infer Types>
    ? Types extends { instanceApi: infer A }
      ? A
      : object
    : object;

type UnionToIntersection<U> = (
  U extends unknown ? (x: U) => void : never
) extends (x: infer I) => void
  ? I
  : never;

export type MergePluginOptions<
  TPlugins extends readonly SpooshPlugin<PluginTypeConfig>[],
> = {
  read: UnionToIntersection<ExtractReadOptions<TPlugins[number]>>;
  write: UnionToIntersection<ExtractWriteOptions<TPlugins[number]>>;
  pages: UnionToIntersection<ExtractPagesOptions<TPlugins[number]>>;
  writeTrigger: UnionToIntersection<
    ExtractWriteTriggerOptions<TPlugins[number]>
  >;
  queue: UnionToIntersection<ExtractQueueOptions<TPlugins[number]>>;
  queueTrigger: UnionToIntersection<
    ExtractQueueTriggerOptions<TPlugins[number]>
  >;
};

export type MergePluginResults<
  TPlugins extends readonly SpooshPlugin<PluginTypeConfig>[],
> = {
  read: UnionToIntersection<ExtractReadResult<TPlugins[number]>>;
  write: UnionToIntersection<ExtractWriteResult<TPlugins[number]>>;
  queue: UnionToIntersection<ExtractQueueResult<TPlugins[number]>>;
};

export type MergePluginInstanceApi<
  TPlugins extends readonly SpooshPlugin<PluginTypeConfig>[],
  TSchema = unknown,
> = ResolveInstanceApi<
  UnionToIntersection<ExtractInstanceApi<TPlugins[number]>>,
  TSchema,
  MergePluginOptions<TPlugins>["read"]
>;

export type PluginRegistry<TPlugins extends SpooshPlugin<PluginTypeConfig>[]> =
  {
    plugins: TPlugins;
    _options: MergePluginOptions<TPlugins>;
  };

export function createPluginRegistry<
  TPlugins extends SpooshPlugin<PluginTypeConfig>[],
>(plugins: [...TPlugins]): PluginRegistry<TPlugins> {
  return {
    plugins,
    _options: {} as MergePluginOptions<TPlugins>,
  };
}
