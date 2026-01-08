export interface RevalidationPluginConfig {
  revalidateOnFocus?: boolean;
  revalidateOnReconnect?: boolean;
}

export interface RevalidationReadOptions {
  revalidateOnFocus?: boolean;
  revalidateOnReconnect?: boolean;
}

export type RevalidationWriteOptions = object;

export type RevalidationInfiniteReadOptions = object;

export type RevalidationReadResult = object;

export type RevalidationWriteResult = object;
