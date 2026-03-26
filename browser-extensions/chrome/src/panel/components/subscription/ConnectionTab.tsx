import { Show, type Component, type JSX } from "solid-js";
import type { SubscriptionTrace } from "@devtool/types";
import { Badge, CopyButton } from "../shared";
import { formatTime, formatDuration } from "../../utils/format";

interface ConnectionTabProps {
  subscription: SubscriptionTrace;
}

type StatusVariant = "success" | "error" | "warning" | "pending" | "neutral";

function getStatusVariant(status: SubscriptionTrace["status"]): StatusVariant {
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

interface ConnectionRowProps {
  label: string;
  value?: string | number;
  children?: JSX.Element;
  valueClass?: string;
}

const ConnectionRow: Component<ConnectionRowProps> = (props) => {
  return (
    <div class="flex items-start py-2 border-b border-spoosh-border last:border-b-0">
      <span class="text-xs text-spoosh-text-muted w-36 flex-shrink-0">
        {props.label}
      </span>

      <Show
        when={props.children}
        fallback={
          <span
            class={`text-xs text-spoosh-text break-all ${props.valueClass ?? ""}`}
          >
            {props.value}
          </span>
        }
      >
        {props.children}
      </Show>
    </div>
  );
};

export const ConnectionTab: Component<ConnectionTabProps> = (props) => {
  const statusVariant = () => getStatusVariant(props.subscription.status);

  const connectedDuration = () => {
    if (!props.subscription.connectedAt) return "N/A";

    const endTime = props.subscription.disconnectedAt ?? Date.now();

    return formatDuration(endTime - props.subscription.connectedAt);
  };

  const connectedAtStr = () =>
    props.subscription.connectedAt
      ? formatTime(props.subscription.connectedAt)
      : undefined;

  const disconnectedAtStr = () =>
    props.subscription.disconnectedAt
      ? formatTime(props.subscription.disconnectedAt)
      : undefined;

  return (
    <div class="p-4 overflow-auto">
      <div class="bg-spoosh-surface rounded border border-spoosh-border p-4">
        <ConnectionRow label="Status">
          <Badge variant={statusVariant()}>{props.subscription.status}</Badge>
        </ConnectionRow>

        <ConnectionRow
          label="Transport"
          value={props.subscription.transport.toUpperCase()}
        />

        <ConnectionRow label="Channel" value={props.subscription.channel} />

        <ConnectionRow label="URL">
          <div class="flex items-center gap-2 min-w-0 flex-1">
            <span class="text-xs text-spoosh-text break-all">
              {props.subscription.connectionUrl}
            </span>
            <CopyButton
              text={props.subscription.connectionUrl}
              class="flex-shrink-0"
            />
          </div>
        </ConnectionRow>

        <ConnectionRow label="Connected Duration" value={connectedDuration()} />

        <ConnectionRow
          label="Messages"
          value={props.subscription.messageCount}
        />

        <ConnectionRow
          label="Retry Count"
          value={props.subscription.retryCount}
        />

        <Show when={props.subscription.error}>
          <ConnectionRow
            label="Error"
            value={props.subscription.error?.message}
            valueClass="text-spoosh-error"
          />
        </Show>

        <Show when={connectedAtStr()}>
          <ConnectionRow label="Connected At" value={connectedAtStr()} />
        </Show>

        <Show when={disconnectedAtStr()}>
          <ConnectionRow label="Disconnected At" value={disconnectedAtStr()} />
        </Show>

        <Show
          when={
            props.subscription.listenedEvents &&
            props.subscription.listenedEvents.length > 0
          }
        >
          <ConnectionRow
            label="Listened Events"
            value={props.subscription.listenedEvents?.join(", ")}
          />
        </Show>
      </div>
    </div>
  );
};
