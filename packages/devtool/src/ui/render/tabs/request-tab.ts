import type { OperationTrace } from "../../../types";
import { escapeHtml, formatJson } from "../../utils";

const copyIcon = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
  <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
  <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/>
</svg>`;

const eyeIcon = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
  <circle cx="12" cy="12" r="3"/>
</svg>`;

const eyeOffIcon = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
  <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/>
  <line x1="1" y1="1" x2="23" y2="23"/>
</svg>`;

function renderDataSection(
  label: string,
  data: unknown,
  badge?: string
): string {
  const jsonStr = JSON.stringify(data, null, 2);

  return `
    <div class="spoosh-data-section">
      <div class="spoosh-data-label">${label}${badge ? ` <span class="spoosh-body-type ${badge}">${badge}</span>` : ""}</div>
      <div class="spoosh-code-block">
        <button class="spoosh-code-copy-btn" data-action="copy" data-copy-content="${escapeHtml(jsonStr)}" title="Copy">
          ${copyIcon}
        </button>
        <pre class="spoosh-json">${formatJson(data)}</pre>
      </div>
    </div>
  `;
}

function renderBody(body: unknown): string {
  const spooshBody = body as {
    __spooshBody?: boolean;
    kind?: "form" | "json" | "urlencoded";
    value?: unknown;
  };

  if (
    spooshBody?.__spooshBody &&
    spooshBody.kind &&
    spooshBody.value !== undefined
  ) {
    return renderDataSection("Body", spooshBody.value, spooshBody.kind);
  }

  return renderDataSection("Body", body, "json");
}

function renderHeaderRow(
  name: string,
  value: string,
  isSensitive: boolean
): string {
  const escapedName = escapeHtml(name);
  const escapedValue = escapeHtml(value);

  if (!isSensitive) {
    return `
      <div class="spoosh-header-row">
        <span class="spoosh-header-name">${escapedName}</span>
        <span class="spoosh-header-value">${escapedValue}</span>
      </div>
    `;
  }

  return `
    <div class="spoosh-header-row">
      <span class="spoosh-header-name">${escapedName}</span>
      <span class="spoosh-header-value-wrap">
        <span class="spoosh-header-masked">••••••</span>
        <span class="spoosh-header-revealed">${escapedValue}</span>
        <button class="spoosh-header-toggle" data-action="toggle-sensitive-header" title="Toggle visibility">
          <span class="spoosh-eye-show">${eyeIcon}</span>
          <span class="spoosh-eye-hide">${eyeOffIcon}</span>
        </button>
      </span>
    </div>
  `;
}

function renderHeadersSection(
  headers: Record<string, string>,
  sensitiveHeaders: Set<string>
): string {
  const rows = Object.entries(headers)
    .map(([name, value]) =>
      renderHeaderRow(name, value, sensitiveHeaders.has(name.toLowerCase()))
    )
    .join("");

  return `
    <div class="spoosh-data-section">
      <div class="spoosh-data-label">Headers</div>
      <div class="spoosh-headers-list">
        ${rows}
      </div>
    </div>
  `;
}

export function renderRequestTab(
  trace: OperationTrace,
  sensitiveHeaders: Set<string>
): string {
  const { query, body, params } = trace.request;
  const headers =
    trace.finalHeaders ??
    (trace.request.headers as Record<string, string> | undefined);
  const isReadOperation = trace.method === "GET";

  const hasTags = isReadOperation && trace.tags.length > 0;
  const hasParams = params && Object.keys(params).length > 0;
  const hasQuery = query && Object.keys(query).length > 0;
  const hasBody = body !== undefined;
  const hasHeaders = headers && Object.keys(headers).length > 0;

  if (!hasTags && !hasParams && !hasQuery && !hasBody && !hasHeaders) {
    return `<div class="spoosh-empty-tab">No request data</div>`;
  }

  return `
    ${hasHeaders ? renderHeadersSection(headers, sensitiveHeaders) : ""}
    ${hasTags ? renderDataSection("Tags", trace.tags) : ""}
    ${hasParams ? renderDataSection("Params", params) : ""}
    ${hasQuery ? renderDataSection("Query", query) : ""}
    ${hasBody ? renderBody(body) : ""}
  `;
}
