import type { EnlacePlugin } from "./types";

type ExtractReadOptions<T> =
  T extends EnlacePlugin<infer R, object, object, object, object> ? R : object;

type ExtractWriteOptions<T> =
  T extends EnlacePlugin<object, infer W, object, object, object> ? W : object;

type ExtractInfiniteReadOptions<T> =
  T extends EnlacePlugin<object, object, infer I, object, object> ? I : object;

type ExtractReadResult<T> =
  T extends EnlacePlugin<object, object, object, infer R, object> ? R : object;

type ExtractWriteResult<T> =
  T extends EnlacePlugin<object, object, object, object, infer W> ? W : object;

type UnionToIntersection<U> = (
  U extends unknown ? (x: U) => void : never
) extends (x: infer I) => void
  ? I
  : never;

export type MergePluginOptions<
  TPlugins extends readonly EnlacePlugin<
    object,
    object,
    object,
    object,
    object
  >[],
> = {
  read: UnionToIntersection<ExtractReadOptions<TPlugins[number]>>;
  write: UnionToIntersection<ExtractWriteOptions<TPlugins[number]>>;
  infiniteRead: UnionToIntersection<
    ExtractInfiniteReadOptions<TPlugins[number]>
  >;
};

export type MergePluginResults<
  TPlugins extends readonly EnlacePlugin<
    object,
    object,
    object,
    object,
    object
  >[],
> = {
  read: UnionToIntersection<ExtractReadResult<TPlugins[number]>>;
  write: UnionToIntersection<ExtractWriteResult<TPlugins[number]>>;
};

export type PluginRegistry<
  TPlugins extends EnlacePlugin<object, object, object, object, object>[],
> = {
  plugins: TPlugins;
  _options: MergePluginOptions<TPlugins>;
};

export function createPluginRegistry<
  TPlugins extends EnlacePlugin<object, object, object, object, object>[],
>(plugins: [...TPlugins]): PluginRegistry<TPlugins> {
  return {
    plugins,
    _options: {} as MergePluginOptions<TPlugins>,
  };
}
