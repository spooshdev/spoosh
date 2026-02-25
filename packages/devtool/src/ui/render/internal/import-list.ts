import type { ExportedTrace, ExportedSSE, ExportedItem } from "../../../types";
import {
  escapeHtml,
  formatTime,
  parseQueryKey,
  formatDuration,
} from "../../utils";

export interface ImportListContext {
  items: ExportedItem[];
  selectedTraceId: string | null;
  filename: string | null;
}

const uploadIcon = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
  <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12"/>
</svg>`;

function renderImportTraceRow(
  trace: ExportedTrace,
  isSelected: boolean
): string {
  const duration = trace.duration?.toFixed(0) ?? "...";
  const response = trace.response as Record<string, unknown> | undefined;
  const isAborted = !!response?.aborted;
  const hasError = !!response?.error && !isAborted;
  const statusClass = isAborted ? "aborted" : hasError ? "error" : "success";
  const { queryParams } = parseQueryKey(trace.queryKey);
  const timestamp = formatTime(trace.timestamp);

  const traceClass = `spoosh-trace-card${isSelected ? " selected" : ""}${hasError ? " error" : ""}${isAborted ? " aborted" : ""} status-${statusClass}`;

  return `
    <div class="${traceClass}" data-imported-trace-id="${escapeHtml(trace.id)}">
      <div class="spoosh-trace-card-header">
        <span class="spoosh-trace-method-badge method-${trace.method}">${trace.method}</span>
        <span class="spoosh-trace-path">${escapeHtml(trace.path)}${queryParams ? `<span class="spoosh-trace-query">?${escapeHtml(queryParams)}</span>` : ""}</span>
      </div>
      <div class="spoosh-trace-card-footer">
        <span class="spoosh-trace-preview">${timestamp}</span>
        <span class="spoosh-trace-duration ${statusClass}">${duration}ms</span>
      </div>
    </div>
  `;
}

function getSSEStatusClass(status: ExportedSSE["status"]): string {
  switch (status) {
    case "connected":
      return "success";
    case "error":
      return "error";
    case "connecting":
      return "pending";
    case "disconnected":
    default:
      return "neutral";
  }
}

function getSSEDuration(sub: ExportedSSE): string {
  if (sub.status === "connecting") return "connecting...";

  const startTime = sub.connectedAt ?? sub.timestamp;
  const endTime = sub.disconnectedAt ?? sub.timestamp;

  return formatDuration(endTime - startTime);
}

function renderImportSSERow(sub: ExportedSSE, isSelected: boolean): string {
  const statusClass = getSSEStatusClass(sub.status);
  const duration = getSSEDuration(sub);
  const timestamp = formatTime(sub.timestamp);

  const rowClass = `spoosh-trace-card${isSelected ? " selected" : ""} status-${statusClass}`;

  return `
    <div class="${rowClass}" data-imported-trace-id="${escapeHtml(sub.id)}">
      <div class="spoosh-trace-card-header">
        <span class="spoosh-trace-method-badge method-sse">SSE</span>
        <span class="spoosh-trace-path">${escapeHtml(sub.channel)}</span>
      </div>
      <div class="spoosh-trace-card-footer">
        <span class="spoosh-trace-preview">${timestamp}</span>
        <span class="spoosh-trace-duration ${statusClass}">${sub.messageCount} msgs · ${duration}</span>
      </div>
    </div>
  `;
}

function renderImportItemRow(item: ExportedItem, isSelected: boolean): string {
  if (item.type === "sse") {
    return renderImportSSERow(item, isSelected);
  }

  return renderImportTraceRow(item, isSelected);
}

export function renderImportEmptyState(): string {
  return `
    <div class="spoosh-import-empty">
      <div class="spoosh-import-empty-icon">${uploadIcon}</div>
      <div class="spoosh-import-empty-text">Import previously exported traces</div>
      <div class="spoosh-import-empty-hint">Load a JSON file exported from Spoosh DevTool</div>
      <button class="spoosh-import-btn" data-action="import-file">
        Import File
      </button>
    </div>
  `;
}

export function renderImportList(ctx: ImportListContext): string {
  const { items, selectedTraceId, filename } = ctx;

  if (items.length === 0 && !filename) {
    return renderImportEmptyState();
  }

  if (items.length === 0 && filename) {
    return `<div class="spoosh-empty">No matching traces</div>`;
  }

  return `
    <div class="spoosh-traces">
      ${[...items]
        .reverse()
        .map((item) => renderImportItemRow(item, item.id === selectedTraceId))
        .join("")}
    </div>
  `;
}
