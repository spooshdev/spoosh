import type { Component } from "solid-js";
import type { SubscriptionTrace } from "@devtool/types";
import { Badge } from "../shared/Badge";
import { formatDuration, parseQueryKey } from "../../utils/format";

interface SubscriptionCardProps {
  subscription: SubscriptionTrace;
  selected: boolean;
  onClick: () => void;
}

function getStatusBadgeVariant(
  status: SubscriptionTrace["status"]
): "success" | "error" | "warning" | "pending" | "neutral" {
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

function getStatusIndicator(status: SubscriptionTrace["status"]): {
  symbol: string;
  class: string;
  title: string;
} {
  switch (status) {
    case "connecting":
      return {
        symbol: "◌",
        class: "text-spoosh-primary animate-pulse",
        title: "Connecting",
      };
    case "connected":
      return { symbol: "●", class: "text-spoosh-success", title: "Connected" };
    case "disconnected":
      return {
        symbol: "○",
        class: "text-spoosh-text-muted",
        title: "Disconnected",
      };
    case "error":
      return { symbol: "●", class: "text-spoosh-error", title: "Error" };
    default:
      return { symbol: "", class: "", title: "" };
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

export const SubscriptionCard: Component<SubscriptionCardProps> = (props) => {
  const { queryParams } = parseQueryKey(props.subscription.queryKey);
  const transportBadge = () => props.subscription.transport.toUpperCase();
  const duration = () => getSubscriptionDuration(props.subscription);
  const messageCount = () => props.subscription.messageCount;
  const statusIndicator = () => getStatusIndicator(props.subscription.status);

  const hasError = () => props.subscription.status === "error";
  const isConnecting = () => props.subscription.status === "connecting";
  const isConnected = () => props.subscription.status === "connected";

  const cardClasses = () => {
    const base = "px-3 py-2 cursor-pointer transition-all border-l-2";

    // Error state styling
    if (hasError()) {
      if (props.selected) {
        return `${base} bg-spoosh-error/15 border-l-spoosh-error shadow-[inset_0_0_0_1px_rgba(248,81,73,0.3)]`;
      }
      return `${base} bg-spoosh-error/5 border-l-spoosh-error hover:bg-spoosh-error/10`;
    }

    // Connecting state styling
    if (isConnecting()) {
      if (props.selected) {
        return `${base} bg-spoosh-primary/15 border-l-spoosh-primary shadow-[inset_0_0_0_1px_rgba(88,166,255,0.3)]`;
      }
      return `${base} border-l-spoosh-primary hover:bg-spoosh-surface`;
    }

    // Connected state styling
    if (isConnected()) {
      if (props.selected) {
        return `${base} bg-spoosh-success/15 border-l-spoosh-success shadow-[inset_0_0_0_1px_rgba(63,185,80,0.3)]`;
      }
      return `${base} border-l-spoosh-success hover:bg-spoosh-surface`;
    }

    // Disconnected/normal state styling
    if (props.selected) {
      return `${base} bg-spoosh-primary/15 border-l-spoosh-primary shadow-[inset_0_0_0_1px_rgba(88,166,255,0.3)]`;
    }

    return `${base} border-l-transparent hover:bg-spoosh-surface`;
  };

  return (
    <div class={cardClasses()} onClick={props.onClick}>
      <div class="flex items-center gap-2 mb-1">
        <Badge variant={getStatusBadgeVariant(props.subscription.status)}>
          {transportBadge()}
        </Badge>
        <span class="text-sm text-spoosh-text truncate flex-1">
          {props.subscription.channel}
          {queryParams && (
            <span class="text-spoosh-text-muted">?{queryParams}</span>
          )}
        </span>
      </div>

      <div class="flex items-center justify-between text-2xs">
        <span class="flex items-center gap-1.5">
          <span class={statusIndicator().class} title={statusIndicator().title}>
            {statusIndicator().symbol}
          </span>
          <span class="text-spoosh-text-muted">{duration()}</span>
        </span>
        <span class="text-spoosh-text-muted ml-2">
          {messageCount()} msg{messageCount() !== 1 ? "s" : ""}
        </span>
      </div>
    </div>
  );
};
