import { Show, Switch, Match, type Component } from "solid-js";
import type { SubscriptionTrace } from "@devtool/types";
import type { SubscriptionDetailTab } from "../../types";
import type { ViewState } from "../../App";
import { Badge } from "../shared";
import { formatDuration } from "../../utils/format";
import { SubscriptionTabs } from "./SubscriptionTabs";
import { MessagesTab } from "./MessagesTab";
import { AccumulatedTab } from "./AccumulatedTab";
import { ConnectionTab } from "./ConnectionTab";

interface SubscriptionDetailActions {
  updateViewState: <K extends keyof ViewState>(
    key: K,
    value: ViewState[K]
  ) => void;
  selectMessage: (messageId: string) => void;
  toggleEventType: (eventType: string) => void;
  toggleJsonPath: (contextId: string, path: string) => void;
}

interface SubscriptionDetailProps {
  subscription: SubscriptionTrace;
  viewState: ViewState;
  actions: SubscriptionDetailActions;
  knownPlugins: string[];
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

function getStatusIndicator(status: SubscriptionTrace["status"]): {
  symbol: string;
  class: string;
} {
  switch (status) {
    case "connecting":
      return { symbol: "◌", class: "text-spoosh-primary animate-pulse" };
    case "connected":
      return { symbol: "●", class: "text-spoosh-success" };
    case "disconnected":
      return { symbol: "○", class: "text-spoosh-text-muted" };
    case "error":
      return { symbol: "●", class: "text-spoosh-error" };
    default:
      return { symbol: "", class: "" };
  }
}

function getConnectionDuration(subscription: SubscriptionTrace): string {
  if (subscription.status === "connecting") {
    return "connecting...";
  }

  const startTime = subscription.connectedAt ?? subscription.timestamp;
  const endTime = subscription.disconnectedAt ?? Date.now();

  return formatDuration(endTime - startTime);
}

export const SubscriptionDetail: Component<SubscriptionDetailProps> = (
  props
) => {
  const statusVariant = () => getStatusVariant(props.subscription.status);
  const statusIndicator = () => getStatusIndicator(props.subscription.status);
  const duration = () => getConnectionDuration(props.subscription);

  const handleTabChange = (tab: SubscriptionDetailTab) => {
    props.actions.updateViewState("subscriptionTab", tab);
  };

  const handleToggleUnlistenedEvents = () => {
    props.actions.updateViewState(
      "showUnlistenedEvents",
      !props.viewState.showUnlistenedEvents
    );
  };

  return (
    <div class="flex flex-col h-full">
      <div class="px-4 py-3 border-b border-spoosh-border bg-spoosh-surface">
        <div class="flex items-center gap-2 mb-2">
          <Badge variant={statusVariant()}>
            {props.subscription.transport.toUpperCase()}
          </Badge>
          <span class="text-sm font-medium text-spoosh-text truncate">
            {props.subscription.channel}
          </span>
        </div>

        <div class="flex items-center gap-2 text-2xs">
          <span class={statusIndicator().class}>
            {statusIndicator().symbol}
          </span>
          <Badge variant={statusVariant()}>{props.subscription.status}</Badge>
          <Badge variant="neutral">{duration()}</Badge>
          <Badge variant="neutral">
            {props.subscription.messageCount} msgs
          </Badge>
        </div>
      </div>

      <SubscriptionTabs
        activeTab={props.viewState.subscriptionTab}
        onTabChange={handleTabChange}
        subscription={props.subscription}
      />

      <div class="flex-1 min-h-0 overflow-hidden">
        <Switch>
          <Match when={props.viewState.subscriptionTab === "messages"}>
            <MessagesTab
              subscription={props.subscription}
              selectedMessageId={props.viewState.selectedMessageId}
              expandedEventTypes={props.viewState.expandedEventTypes}
              showUnlistenedEvents={props.viewState.showUnlistenedEvents}
              onSelectMessage={props.actions.selectMessage}
              onToggleEventType={props.actions.toggleEventType}
              onToggleUnlistenedEvents={handleToggleUnlistenedEvents}
              collapsedJsonPaths={props.viewState.collapsedJsonPaths}
              onToggleJsonPath={props.actions.toggleJsonPath}
            />
          </Match>

          <Match when={props.viewState.subscriptionTab === "accumulated"}>
            <AccumulatedTab
              subscription={props.subscription}
              collapsedJsonPaths={props.viewState.collapsedJsonPaths}
              onToggleJsonPath={props.actions.toggleJsonPath}
            />
          </Match>

          <Match when={props.viewState.subscriptionTab === "connection"}>
            <ConnectionTab subscription={props.subscription} />
          </Match>

          <Match when={props.viewState.subscriptionTab === "plugins"}>
            <PluginsTabPlaceholder
              subscription={props.subscription}
              knownPlugins={props.knownPlugins}
            />
          </Match>
        </Switch>
      </div>
    </div>
  );
};

interface PluginsTabPlaceholderProps {
  subscription: SubscriptionTrace;
  knownPlugins: string[];
}

const PluginsTabPlaceholder: Component<PluginsTabPlaceholderProps> = (
  props
) => {
  const activePlugins = () => {
    const uniquePlugins = new Set(
      props.subscription.steps
        .filter((step) => step.stage !== "skip")
        .map((step) => step.plugin)
    );

    return Array.from(uniquePlugins);
  };

  const hasPlugins = () => props.subscription.steps.length > 0;

  return (
    <div class="p-4 overflow-auto">
      <Show
        when={hasPlugins()}
        fallback={
          <div class="flex items-center justify-center h-32 text-spoosh-text-muted text-sm">
            No plugin activity recorded
          </div>
        }
      >
        <div class="space-y-2">
          <div class="text-sm text-spoosh-text-muted mb-3">
            Active plugins: {activePlugins().join(", ") || "None"}
          </div>

          <div class="text-xs text-spoosh-text-muted">
            {props.subscription.steps.length} plugin steps recorded
          </div>
        </div>
      </Show>
    </div>
  );
};
