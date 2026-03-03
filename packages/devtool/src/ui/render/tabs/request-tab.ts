import type { OperationTrace } from "../../../types";
import type { ViewModelState } from "../../view-model";
import { escapeHtml } from "../../utils";
import { formatJsonTree } from "../../utils/json-tree";

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
  contextId: string,
  collapsedPaths: ReadonlySet<string>,
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
        <pre class="spoosh-json">${formatJsonTree(data, {
          withLineNumbers: true,
          contextId,
          collapsedPaths,
        })}</pre>
      </div>
    </div>
  `;
}

interface SpooshBody {
  __spooshBody: boolean;
  kind: "form" | "json" | "urlencoded";
  value: unknown;
}

function isSpooshBody(value: unknown): value is SpooshBody {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const obj = value as Record<string, unknown>;
  return (
    obj.__spooshBody === true &&
    typeof obj.kind === "string" &&
    ["form", "json", "urlencoded"].includes(obj.kind) &&
    "value" in obj
  );
}

function isFormData(value: unknown): value is FormData {
  if (value instanceof FormData) return true;

  if (
    typeof value === "object" &&
    value !== null &&
    value.constructor?.name === "FormData" &&
    typeof (value as FormData).forEach === "function"
  ) {
    return true;
  }

  return false;
}

function isFileObject(value: unknown): boolean {
  if (value instanceof File) return true;

  if (typeof value !== "object" || value === null) return false;

  const obj = value as Record<string, unknown>;
  return (
    obj.constructor?.name === "File" ||
    (typeof obj.name === "string" &&
      typeof obj.size === "number" &&
      typeof obj.type === "string")
  );
}

function sanitizeFormValue(value: unknown): unknown {
  if (value instanceof File || isFileObject(value)) {
    const file = value as File;
    const name = file.name || "unknown";
    const size = file.size;
    const type = file.type || "unknown type";

    if (size) {
      const sizeStr =
        size < 1024
          ? `${size} B`
          : size < 1024 * 1024
            ? `${(size / 1024).toFixed(1)} KB`
            : `${(size / (1024 * 1024)).toFixed(1)} MB`;
      return `[File: ${name} (${sizeStr}, ${type})]`;
    }

    return `[File: ${name}]`;
  }

  if (
    typeof value === "object" &&
    value !== null &&
    Object.keys(value).length === 0
  ) {
    return "[File]";
  }

  return value;
}

function sanitizeFormData(
  data: Record<string, unknown>
): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(data)) {
    result[key] = sanitizeFormValue(value);
  }

  return result;
}

function renderBody(
  body: unknown,
  contextId: string,
  collapsedPaths: ReadonlySet<string>
): string {
  if (isSpooshBody(body)) {
    const displayValue =
      typeof body.value === "object" && body.value !== null
        ? sanitizeFormData(body.value as Record<string, unknown>)
        : body.value;
    return renderDataSection(
      "Body",
      displayValue,
      contextId,
      collapsedPaths,
      body.kind
    );
  }

  if (isFormData(body)) {
    const formDataObj: Record<string, unknown> = {};

    body.forEach((value, key) => {
      formDataObj[key] = sanitizeFormValue(value);
    });

    return renderDataSection(
      "Body",
      formDataObj,
      contextId,
      collapsedPaths,
      "form"
    );
  }

  return renderDataSection("Body", body, contextId, collapsedPaths, "json");
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
  state: ViewModelState,
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

  const baseContextId = `request-${trace.id}`;

  return `
    ${hasHeaders ? renderHeadersSection(headers, sensitiveHeaders) : ""}
    ${hasTags ? renderDataSection("Tags", trace.tags, `${baseContextId}-tags`, state.collapsedJsonPaths.get(`${baseContextId}-tags`) ?? new Set()) : ""}
    ${hasParams ? renderDataSection("Params", params, `${baseContextId}-params`, state.collapsedJsonPaths.get(`${baseContextId}-params`) ?? new Set()) : ""}
    ${hasQuery ? renderDataSection("Query", query, `${baseContextId}-query`, state.collapsedJsonPaths.get(`${baseContextId}-query`) ?? new Set()) : ""}
    ${hasBody ? renderBody(body, `${baseContextId}-body`, state.collapsedJsonPaths.get(`${baseContextId}-body`) ?? new Set()) : ""}
  `;
}
