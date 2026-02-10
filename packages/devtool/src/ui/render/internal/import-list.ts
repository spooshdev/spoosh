import type { ExportedTrace } from "../../../types";
import { escapeHtml, formatTime } from "../../utils";

export interface ImportListContext {
  traces: ExportedTrace[];
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
  const hasError =
    trace.response !== undefined &&
    typeof trace.response === "object" &&
    trace.response !== null &&
    "error" in trace.response &&
    !!(trace.response as Record<string, unknown>).error;
  const statusClass = hasError ? "error" : "success";

  return `
    <div class="spoosh-trace${isSelected ? " selected" : ""}${hasError ? " error" : ""}" data-imported-trace-id="${escapeHtml(trace.id)}">
      <div class="spoosh-trace-status ${statusClass}"></div>
      <div class="spoosh-trace-info">
        <div class="spoosh-trace-key-row">
          <span class="spoosh-trace-method method-${trace.method}">${trace.method}</span>
          <span class="spoosh-trace-path">${escapeHtml(trace.path)}</span>
        </div>
        <div class="spoosh-trace-preview-row">
          <span class="spoosh-trace-preview">${formatTime(trace.timestamp)}</span>
          <span class="spoosh-trace-time">${duration}ms</span>
        </div>
      </div>
    </div>
  `;
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
  const { traces, selectedTraceId, filename } = ctx;

  if (traces.length === 0 && !filename) {
    return renderImportEmptyState();
  }

  if (traces.length === 0 && filename) {
    return `<div class="spoosh-empty">No matching traces</div>`;
  }

  return `
    <div class="spoosh-traces">
      ${[...traces]
        .reverse()
        .map((trace) =>
          renderImportTraceRow(trace, trace.id === selectedTraceId)
        )
        .join("")}
    </div>
  `;
}
