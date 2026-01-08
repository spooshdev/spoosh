import type { EnlacePlugin } from "./types";

type ExtractReadOptions<T> =
  T extends EnlacePlugin<infer R, object, object> ? R : object;

type ExtractWriteOptions<T> =
  T extends EnlacePlugin<object, infer W, object> ? W : object;

type ExtractInfiniteReadOptions<T> =
  T extends EnlacePlugin<object, object, infer I> ? I : object;

type UnionToIntersection<U> = (
  U extends unknown ? (x: U) => void : never
) extends (x: infer I) => void
  ? I
  : never;

export type MergePluginOptions<
  TPlugins extends EnlacePlugin<object, object, object>[],
> = {
  read: UnionToIntersection<ExtractReadOptions<TPlugins[number]>>;
  write: UnionToIntersection<ExtractWriteOptions<TPlugins[number]>>;
  infiniteRead: UnionToIntersection<
    ExtractInfiniteReadOptions<TPlugins[number]>
  >;
};

export type PluginRegistry<
  TPlugins extends EnlacePlugin<object, object, object>[],
> = {
  plugins: TPlugins;
  _options: MergePluginOptions<TPlugins>;
};

export function createPluginRegistry<
  TPlugins extends EnlacePlugin<object, object, object>[],
>(plugins: [...TPlugins]): PluginRegistry<TPlugins> {
  return {
    plugins,
    _options: {} as MergePluginOptions<TPlugins>,
  };
}
