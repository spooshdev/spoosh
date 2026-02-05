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

/**
 * Transport layer used for requests.
 *
 * - `"fetch"` — Uses the Fetch API (default).
 * - `"xhr"` — Uses XMLHttpRequest. Required for upload/download progress tracking.
 */
export type TransportOption = "fetch" | "xhr";

export interface TransportOptionsMap {
  fetch: never;
}
