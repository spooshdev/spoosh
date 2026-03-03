import type { SubscriptionTrace } from "../../types";
import { escapeHtml, formatDuration } from "../utils";
import {
  renderSubscriptionTabs,
  type SubscriptionTab,
} from "./internal/subscription-tabs";
import { renderPluginsTab } from "./tabs/plugins-tab";

export interface SubscriptionDetailContext {
  subscription: SubscriptionTrace | null;
  activeTab: SubscriptionTab | "plugins";
  selectedMessageId: string | null;
  expandedEventTypes: ReadonlySet<string>;
  showPassedPlugins: boolean;
  showUnlistenedEvents: boolean;
  expandedSteps: ReadonlySet<string>;
  expandedGroups: ReadonlySet<string>;
  fullDiffViews: ReadonlySet<string>;
  knownPlugins: string[];
  collapsedJsonPaths: ReadonlyMap<string, ReadonlySet<string>>;
}

function getStatusIndicator(status: SubscriptionTrace["status"]): string {
  switch (status) {
    case "connecting":
      return `<span class="spoosh-status-indicator connecting">◌</span>`;
    case "connected":
      return `<span class="spoosh-status-indicator connected">●</span>`;
    case "disconnected":
      return `<span class="spoosh-status-indicator disconnected">○</span>`;
    case "error":
      return `<span class="spoosh-status-indicator error">●</span>`;
    default:
      return "";
  }
}

function getStatusClass(status: SubscriptionTrace["status"]): string {
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

function getConnectionDuration(subscription: SubscriptionTrace): string {
  if (subscription.status === "connecting") {
    return "connecting...";
  }

  const startTime = subscription.connectedAt ?? subscription.timestamp;
  const endTime = subscription.disconnectedAt ?? Date.now();

  return formatDuration(endTime - startTime);
}

function renderTabContent(ctx: SubscriptionDetailContext): string {
  const {
    subscription,
    activeTab,
    selectedMessageId,
    expandedEventTypes,
    showPassedPlugins,
    showUnlistenedEvents,
    expandedSteps,
    expandedGroups,
    fullDiffViews,
    knownPlugins,
    collapsedJsonPaths,
  } = ctx;

  if (!subscription) return "";

  if (activeTab === "plugins") {
    return renderPluginsTab({
      trace: {
        id: subscription.id,
        steps: subscription.steps,
        operationType: "subscription",
      },
      knownPlugins,
      showPassedPlugins,
      expandedSteps,
      expandedGroups,
      fullDiffViews,
      collapsedJsonPaths,
    });
  }

  return renderSubscriptionTabs({
    subscription,
    activeTab,
    selectedMessageId,
    expandedEventTypes,
    showUnlistenedEvents,
  });
}

export function renderSubscriptionDetail(
  ctx: SubscriptionDetailContext
): string {
  const { subscription, activeTab } = ctx;

  if (!subscription) {
    return `
      <div class="spoosh-detail-panel">
        <div class="spoosh-detail-empty">
          <div class="spoosh-detail-empty-icon">📡</div>
          <div>Select a subscription to view details</div>
        </div>
      </div>
    `;
  }

  const statusClass = getStatusClass(subscription.status);
  const statusIndicator = getStatusIndicator(subscription.status);
  const duration = getConnectionDuration(subscription);
  const activePluginCount = new Set(
    subscription.steps
      .filter((step) => step.stage !== "skip")
      .map((step) => step.plugin)
  ).size;

  return `
    <div class="spoosh-detail-panel subscription">
      <div class="spoosh-detail-header">
        <div class="spoosh-detail-title">
          <span class="spoosh-trace-method method-sse">${subscription.transport.toUpperCase()}</span>
          <span class="spoosh-detail-path">${escapeHtml(subscription.channel)}</span>
        </div>
        <div class="spoosh-detail-meta">
          ${statusIndicator}
          <span class="spoosh-badge ${statusClass}">${subscription.status}</span>
          <span class="spoosh-badge neutral">${duration}</span>
          <span class="spoosh-badge neutral">${subscription.messageCount} msgs</span>
        </div>
      </div>

      <div class="spoosh-tabs">
        <button class="spoosh-tab ${activeTab === "messages" ? "active" : ""}" data-subscription-tab="messages">
          Messages (${subscription.messages.length})
        </button>
        <button class="spoosh-tab ${activeTab === "accumulated" ? "active" : ""}" data-subscription-tab="accumulated">
          Accumulated
        </button>
        <button class="spoosh-tab ${activeTab === "connection" ? "active" : ""}" data-subscription-tab="connection">
          Connection
        </button>
        <button class="spoosh-tab ${activeTab === "plugins" ? "active" : ""}" data-subscription-tab="plugins">
          Plugins ${activePluginCount > 0 ? `(${activePluginCount})` : ""}
        </button>
      </div>

      <div class="spoosh-tab-content">
        ${renderTabContent(ctx)}
      </div>
    </div>
  `;
}
