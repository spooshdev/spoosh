import type { EnlaceOptions } from "enlace-core";

export type NextFetchOptions = {
  revalidate?: number | false;
  tags?: string[];
};

export type RevalidateHandler = (
  tags: string[],
  paths: string[]
) => void | Promise<void>;

export type NextEnlaceOptions = EnlaceOptions & {
  autoGenerateTags?: boolean;
  autoRevalidateTags?: boolean;
  revalidate?: RevalidateHandler;
};

export type NextRequestOptionsBase = {
  next?: NextFetchOptions;
  revalidateTags?: string[];
  revalidatePaths?: string[];
};
