import type { Transport } from "./types";

export interface XhrTransportOptions {
  /** Called on upload and download progress events. */
  onProgress?: (event: ProgressEvent, xhr: XMLHttpRequest) => void;
}

declare module "./types" {
  interface TransportOptionsMap {
    xhr: XhrTransportOptions;
  }
}

export const xhrTransport: Transport<XhrTransportOptions> = (
  url,
  init,
  options
) => {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open(init.method ?? "GET", url);

    if (init.headers) {
      const headers =
        init.headers instanceof Headers
          ? init.headers
          : new Headers(init.headers as HeadersInit);

      headers.forEach((value, key) => {
        xhr.setRequestHeader(key, value);
      });
    }

    if (init.credentials === "include") {
      xhr.withCredentials = true;
    }

    const onAbort = () => xhr.abort();

    if (init.signal) {
      if (init.signal.aborted) {
        xhr.abort();
        return;
      }

      init.signal.addEventListener("abort", onAbort);
    }

    const cleanup = () => {
      init.signal?.removeEventListener("abort", onAbort);
    };

    if (options?.onProgress) {
      xhr.upload.addEventListener("progress", (event) => {
        options.onProgress!(event, xhr);
      });

      xhr.addEventListener("progress", (event) => {
        options.onProgress!(event, xhr);
      });
    }

    xhr.addEventListener("load", () => {
      cleanup();

      const status = xhr.status;
      const ok = status >= 200 && status < 300;

      const responseHeaders = new Headers();
      const rawHeaders = xhr.getAllResponseHeaders().trim();

      if (rawHeaders) {
        rawHeaders.split("\r\n").forEach((line) => {
          const idx = line.indexOf(": ");

          if (idx > 0) {
            responseHeaders.append(
              line.substring(0, idx),
              line.substring(idx + 2)
            );
          }
        });
      }

      const contentType = responseHeaders.get("content-type");
      const isJson = contentType?.includes("application/json");
      let data: unknown;

      try {
        data = isJson ? JSON.parse(xhr.responseText) : xhr.responseText;
      } catch {
        data = xhr.responseText;
      }

      resolve({ ok, status, headers: responseHeaders, data });
    });

    xhr.addEventListener("error", () => {
      cleanup();
      reject(new TypeError("Network request failed"));
    });

    xhr.addEventListener("abort", () => {
      cleanup();
      reject(new DOMException("Aborted", "AbortError"));
    });

    xhr.send(init.body as XMLHttpRequestBodyInit);
  });
};
