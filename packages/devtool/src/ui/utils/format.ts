export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function formatTime(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleTimeString("en-US", {
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function formatQueryParams(
  query?: Record<string, unknown>
): string | null {
  if (!query) return null;

  const entries = Object.entries(query);

  if (entries.length === 0) return null;

  return entries
    .map(
      ([k, v]) =>
        `${encodeURIComponent(k)}=${encodeURIComponent(String(v ?? ""))}`
    )
    .join("&");
}

function jsonReplacer(_key: string, value: unknown): unknown {
  if (value instanceof File) {
    return `[File: ${value.name} (${formatBytes(value.size)}, ${value.type || "unknown type"})]`;
  }

  if (value instanceof Blob) {
    return `[Blob: ${formatBytes(value.size)}, ${value.type || "unknown type"}]`;
  }

  if (value instanceof FormData) {
    const entries: Record<string, string> = {};
    value.forEach((v, k) => {
      if (v instanceof File) {
        entries[k] = `[File: ${v.name}]`;
      } else {
        entries[k] = String(v);
      }
    });
    return { "[FormData]": entries };
  }

  if (value instanceof ArrayBuffer) {
    return `[ArrayBuffer: ${formatBytes(value.byteLength)}]`;
  }

  if (typeof value === "function") {
    return `[Function: ${value.name || "anonymous"}]`;
  }

  return value;
}

export function highlightJson(json: string): string {
  return json.replace(
    /("(?:\\.|[^"\\])*")\s*:|("(?:\\.|[^"\\])*")|(\b\d+\.?\d*\b)|(\btrue\b|\bfalse\b)|(\bnull\b)/g,
    (match, key, str, num, bool, nil) => {
      if (key) return `<span class="spoosh-syn-key">${escapeHtml(key)}</span>:`;
      if (str) return `<span class="spoosh-syn-str">${escapeHtml(str)}</span>`;
      if (num) return `<span class="spoosh-syn-num">${num}</span>`;
      if (bool) return `<span class="spoosh-syn-bool">${bool}</span>`;
      if (nil) return `<span class="spoosh-syn-null">${nil}</span>`;
      return match;
    }
  );
}

export function formatJson(data: unknown): string {
  if (data === undefined)
    return '<span class="spoosh-syn-null">undefined</span>';
  if (data === null) return '<span class="spoosh-syn-null">null</span>';

  try {
    const json = JSON.stringify(data, jsonReplacer, 2);
    return highlightJson(json);
  } catch {
    return escapeHtml(String(data));
  }
}
