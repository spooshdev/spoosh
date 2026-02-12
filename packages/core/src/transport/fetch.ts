import type { Transport } from "./types";

export const fetchTransport: Transport = async (url, init) => {
  const res = await fetch(url, init);
  const contentType = res.headers.get("content-type");
  const isJson = contentType?.includes("application/json");
  const isText =
    contentType?.includes("text/") || contentType?.includes("application/xml");

  let data: unknown;

  if (isJson) {
    data = await res.json();
  } else if (isText) {
    data = await res.text();
  } else {
    data = undefined;
  }

  return { ok: res.ok, status: res.status, headers: res.headers, data };
};
