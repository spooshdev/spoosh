export interface TransportResponse {
  ok: boolean;
  status: number;
  headers: Headers;
  data: unknown;
}

export type Transport<TOptions = unknown> = (
  url: string,
  init: RequestInit,
  options?: TOptions
) => Promise<TransportResponse>;

export type TransportOption = "fetch" | "xhr";

export interface TransportOptionsMap {
  fetch: never;
}
