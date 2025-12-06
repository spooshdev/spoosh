import type { EnlaceOptions } from "../core/types";

export type NextFetchOptions = {
  revalidate?: number | false;
  tags?: string[];
};

export type RevalidateHandler = (
  tags: string[],
  paths: string[]
) => void | Promise<void>;

export type NextEnlaceOptions = EnlaceOptions & {
  revalidate?: RevalidateHandler;
};

export type NextRequestOptionsBase = {
  next?: NextFetchOptions;
  revalidateTags?: string[];
  revalidatePaths?: string[];
};
