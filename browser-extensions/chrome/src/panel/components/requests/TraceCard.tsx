import type { Component } from "solid-js";
import type { OperationTrace } from "@devtool/types";
import { Badge } from "../shared/Badge";
import { formatQueryParams } from "../../utils/format";

interface TraceCardProps {
  trace: OperationTrace;
  selected: boolean;
  onClick: () => void;
}

function getResponsePreview(trace: OperationTrace): string {
  if (trace.duration === undefined) {
    return "pending...";
  }

  if (trace.response?.aborted) {
    return "aborted";
  }

  if (trace.response?.error) {
    const status = trace.response.status;
    return status ? `${status}` : "error";
  }

  const data = trace.response?.data;

  if (data === undefined) {
    return "no data";
  }

  if (data === null) {
    return "null";
  }

  if (Array.isArray(data)) {
    return `Array(${data.length})`;
  }

  if (typeof data === "object") {
    return "Object";
  }

  if (typeof data === "string") {
    return data.length > 20 ? `"${data.slice(0, 20)}..."` : `"${data}"`;
  }

  return String(data);
}

function getMethodBadgeVariant(
  method: string
): "success" | "error" | "warning" | "pending" | "neutral" | "primary" {
  switch (method.toUpperCase()) {
    case "GET":
      return "success";
    case "POST":
      return "primary";
    case "PUT":
    case "PATCH":
      return "warning";
    case "DELETE":
      return "error";
    default:
      return "neutral";
  }
}

function getStatusVariant(
  trace: OperationTrace
): "success" | "error" | "warning" | "pending" | "neutral" {
  if (trace.duration === undefined) {
    return "pending";
  }

  if (trace.response?.aborted) {
    return "warning";
  }

  if (trace.response?.error) {
    return "error";
  }

  return "success";
}

export const TraceCard: Component<TraceCardProps> = (props) => {
  const queryParams = () =>
    formatQueryParams(
      props.trace.request.query as Record<string, unknown> | undefined
    );
  const duration = () => props.trace.duration?.toFixed(0) ?? "...";
  const preview = () => getResponsePreview(props.trace);
  const statusVariant = () => getStatusVariant(props.trace);

  const cardClasses = () => {
    const base = "px-3 py-2 cursor-pointer transition-colors border-l-2";
    const selected = props.selected
      ? "bg-spoosh-primary/10 border-l-spoosh-primary"
      : "border-l-transparent hover:bg-spoosh-surface";

    return `${base} ${selected}`;
  };

  return (
    <div class={cardClasses()} onClick={props.onClick}>
      <div class="flex items-center gap-2 mb-1">
        <Badge variant={getMethodBadgeVariant(props.trace.method)}>
          {props.trace.method}
        </Badge>
        <span class="text-sm text-spoosh-text truncate flex-1">
          {props.trace.path}
          {queryParams() && (
            <span class="text-spoosh-text-muted">?{queryParams()}</span>
          )}
        </span>
      </div>

      <div class="flex items-center justify-between text-2xs">
        <span class="text-spoosh-text-muted truncate">{preview()}</span>
        <span
          class={`ml-2 shrink-0 ${
            statusVariant() === "pending"
              ? "text-spoosh-primary"
              : statusVariant() === "error"
                ? "text-spoosh-error"
                : statusVariant() === "warning"
                  ? "text-spoosh-warning"
                  : "text-spoosh-text-muted"
          }`}
        >
          {duration()}ms
        </span>
      </div>
    </div>
  );
};
