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
