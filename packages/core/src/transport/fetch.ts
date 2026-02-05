import type { Transport } from "./types";

export const fetchTransport: Transport = async (url, init) => {
  const res = await fetch(url, init);
  const contentType = res.headers.get("content-type");
  const isJson = contentType?.includes("application/json");
  const data = isJson ? await res.json() : res;

  return { ok: res.ok, status: res.status, headers: res.headers, data };
};
