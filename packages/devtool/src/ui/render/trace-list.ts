import type { OperationTrace, SubscriptionTrace, Trace } from "../../types";
import {
  escapeHtml,
  formatQueryParams,
  formatDuration,
  parseQueryKey,
} from "../utils";

export interface TraceRowContext {
  trace: OperationTrace;
  isSelected: boolean;
}

export interface SubscriptionRowContext {
  subscription: SubscriptionTrace;
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

function getSubscriptionStatusClass(
  status: SubscriptionTrace["status"]
): string {
  switch (status) {
    case "connecting":
      return "pending";
    case "connected":
      return "success";
    case "disconnected":
      return "neutral";
    case "error":
      return "error";
    default:
      return "neutral";
  }
}

function getSubscriptionStatusIndicator(
  status: SubscriptionTrace["status"]
): string {
  switch (status) {
    case "connecting":
      return `<span class="spoosh-status-indicator connecting" title="Connecting">◌</span>`;
    case "connected":
      return `<span class="spoosh-status-indicator connected" title="Connected">●</span>`;
    case "disconnected":
      return `<span class="spoosh-status-indicator disconnected" title="Disconnected">○</span>`;
    case "error":
      return `<span class="spoosh-status-indicator error" title="Error">●</span>`;
    default:
      return "";
  }
}

function getSubscriptionDuration(subscription: SubscriptionTrace): string {
  if (subscription.status === "connecting") {
    return "connecting...";
  }

  const startTime = subscription.connectedAt ?? subscription.timestamp;
  const endTime = subscription.disconnectedAt ?? Date.now();
  const durationMs = endTime - startTime;

  return formatDuration(durationMs);
}

export function renderSubscriptionRow(ctx: SubscriptionRowContext): string {
  const { subscription, isSelected } = ctx;
  const statusClass = getSubscriptionStatusClass(subscription.status);
  const statusIndicator = getSubscriptionStatusIndicator(subscription.status);
  const duration = getSubscriptionDuration(subscription);
  const messageCount = subscription.messageCount;
  const transportBadge = subscription.transport.toUpperCase();
  const { queryParams } = parseQueryKey(subscription.queryKey);

  const rowClass = `spoosh-trace-card subscription${isSelected ? " selected" : ""} status-${statusClass}`;

  return `
    <div class="${rowClass}" data-subscription-id="${subscription.id}">
      <div class="spoosh-trace-card-header">
        <span class="spoosh-trace-method-badge method-sse">${transportBadge}</span>
        <span class="spoosh-trace-path">${escapeHtml(subscription.channel)}${queryParams ? `<span class="spoosh-trace-query">?${escapeHtml(queryParams)}</span>` : ""}</span>
      </div>
      <div class="spoosh-trace-card-footer">
        <span class="spoosh-subscription-status">
          ${statusIndicator}
          <span class="spoosh-subscription-duration">${duration}</span>
        </span>
        <span class="spoosh-subscription-messages">${messageCount} msg${messageCount !== 1 ? "s" : ""}</span>
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

export function renderUnifiedTraceList(
  traces: Trace[],
  selectedId: string | null
): string {
  if (traces.length === 0) {
    return `<div class="spoosh-empty">No requests yet</div>`;
  }

  return `
    <div class="spoosh-traces">
      ${[...traces]
        .reverse()
        .map((trace) => {
          if (trace.type === "subscription") {
            return renderSubscriptionRow({
              subscription: trace,
              isSelected: trace.id === selectedId,
            });
          }

          return renderTraceRow({
            trace,
            isSelected: trace.id === selectedId,
          });
        })
        .join("")}
    </div>
  `;
}

export function renderSubscriptionList(
  subscriptions: SubscriptionTrace[],
  selectedId: string | null
): string {
  if (subscriptions.length === 0) {
    return `<div class="spoosh-empty">No subscriptions yet</div>`;
  }

  return `
    <div class="spoosh-traces">
      ${[...subscriptions]
        .reverse()
        .map((subscription) =>
          renderSubscriptionRow({
            subscription,
            isSelected: subscription.id === selectedId,
          })
        )
        .join("")}
    </div>
  `;
}
