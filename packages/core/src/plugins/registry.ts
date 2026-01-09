import type { EnlacePlugin, PluginTypeConfig } from "./types";

type ExtractReadOptions<T> =
  T extends EnlacePlugin<infer Types>
    ? Types extends { readOptions: infer R }
      ? R
      : object
    : object;

type ExtractWriteOptions<T> =
  T extends EnlacePlugin<infer Types>
    ? Types extends { writeOptions: infer W }
      ? W
      : object
    : object;

type ExtractInfiniteReadOptions<T> =
  T extends EnlacePlugin<infer Types>
    ? Types extends { infiniteReadOptions: infer I }
      ? I
      : object
    : object;

type ExtractReadResult<T> =
  T extends EnlacePlugin<infer Types>
    ? Types extends { readResult: infer R }
      ? R
      : object
    : object;

type ExtractWriteResult<T> =
  T extends EnlacePlugin<infer Types>
    ? Types extends { writeResult: infer W }
      ? W
      : object
    : object;

type UnionToIntersection<U> = (
  U extends unknown ? (x: U) => void : never
) extends (x: infer I) => void
  ? I
  : never;

export type MergePluginOptions<
  TPlugins extends readonly EnlacePlugin<PluginTypeConfig>[],
> = {
  read: UnionToIntersection<ExtractReadOptions<TPlugins[number]>>;
  write: UnionToIntersection<ExtractWriteOptions<TPlugins[number]>>;
  infiniteRead: UnionToIntersection<
    ExtractInfiniteReadOptions<TPlugins[number]>
  >;
};

export type MergePluginResults<
  TPlugins extends readonly EnlacePlugin<PluginTypeConfig>[],
> = {
  read: UnionToIntersection<ExtractReadResult<TPlugins[number]>>;
  write: UnionToIntersection<ExtractWriteResult<TPlugins[number]>>;
};

export type PluginRegistry<
  TPlugins extends EnlacePlugin<PluginTypeConfig>[],
> = {
  plugins: TPlugins;
  _options: MergePluginOptions<TPlugins>;
};

export function createPluginRegistry<
  TPlugins extends EnlacePlugin<PluginTypeConfig>[],
>(plugins: [...TPlugins]): PluginRegistry<TPlugins> {
  return {
    plugins,
    _options: {} as MergePluginOptions<TPlugins>,
  };
}
