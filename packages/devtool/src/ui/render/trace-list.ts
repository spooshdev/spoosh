import type { OperationTrace } from "../../types";
import { escapeHtml, formatQueryParams } from "../utils";

export interface TraceRowContext {
  trace: OperationTrace;
  isSelected: boolean;
}

function getResponsePreview(trace: OperationTrace): string {
  if (trace.duration === undefined) return "pending...";

  if (trace.response?.aborted) {
    return "aborted";
  }

  if (trace.response?.error) {
    const status = trace.response.status;
    return status ? `${status}` : "error";
  }

  const data = trace.response?.data;
  if (data === undefined) return "no data";
  if (data === null) return "null";
  if (Array.isArray(data)) return `Array(${data.length})`;
  if (typeof data === "object") return "Object";
  if (typeof data === "string")
    return data.length > 20 ? `"${data.slice(0, 20)}..."` : `"${data}"`;
  return String(data);
}

export function renderTraceRow(ctx: TraceRowContext): string {
  const { trace, isSelected } = ctx;
  const isPending = trace.duration === undefined;
  const isAborted = !!trace.response?.aborted;
  const hasError = !!trace.response?.error && !isAborted;
  const statusClass = isPending
    ? "pending"
    : isAborted
      ? "aborted"
      : hasError
        ? "error"
        : "success";
  const duration = trace.duration?.toFixed(0) ?? "...";
  const queryParams = formatQueryParams(
    trace.request.query as Record<string, unknown> | undefined
  );
  const preview = getResponsePreview(trace);

  const traceClass = `spoosh-trace-card${isSelected ? " selected" : ""}${hasError ? " error" : ""}${isAborted ? " aborted" : ""} status-${statusClass}`;

  return `
    <div class="${traceClass}" data-trace-id="${trace.id}">
      <div class="spoosh-trace-card-header">
        <span class="spoosh-trace-method-badge method-${trace.method}">${trace.method}</span>
        <span class="spoosh-trace-path">${escapeHtml(trace.path)}${queryParams ? `<span class="spoosh-trace-query">?${escapeHtml(queryParams)}</span>` : ""}</span>
      </div>
      <div class="spoosh-trace-card-footer">
        <span class="spoosh-trace-preview">${escapeHtml(preview)}</span>
        <span class="spoosh-trace-duration ${statusClass}">${duration}ms</span>
      </div>
    </div>
  `;
}

export function renderTraceList(
  traces: OperationTrace[],
  selectedTraceId: string | null
): string {
  if (traces.length === 0) {
    return `<div class="spoosh-empty">No requests yet</div>`;
  }

  return `
    <div class="spoosh-traces">
      ${[...traces]
        .reverse()
        .map((trace) =>
          renderTraceRow({ trace, isSelected: trace.id === selectedTraceId })
        )
        .join("")}
    </div>
  `;
}
