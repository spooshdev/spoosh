import type { EnlaceOptions } from "../core/types";

export type NextFetchOptions = {
  revalidate?: number | false;
  tags?: string[];
};

export type NextEnlaceOptions = EnlaceOptions;

export type NextRequestOptionsBase = {
  next?: NextFetchOptions;
};
