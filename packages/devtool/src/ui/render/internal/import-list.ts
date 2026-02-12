import type { ExportedTrace } from "../../../types";
import { escapeHtml, formatTime, formatQueryParams } from "../../utils";

function parseQueryKey(queryKey: string): { queryParams: string | null } {
  try {
    const parsed = JSON.parse(queryKey) as {
      options?: { query?: Record<string, unknown> };
      pageRequest?: { query?: Record<string, unknown> };
    };

    const query = parsed.pageRequest?.query ?? parsed.options?.query;
    const queryParams = query ? formatQueryParams(query) : null;

    return { queryParams };
  } catch {
    return { queryParams: null };
  }
}

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
