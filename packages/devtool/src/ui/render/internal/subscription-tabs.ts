import type { SubscriptionTrace, SubscriptionMessage } from "../../../types";
import {
  escapeHtml,
  formatJson,
  formatTime,
  formatDuration,
} from "../../utils";

const copyIcon = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
  <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
  <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/>
</svg>`;

export type SubscriptionTab = "messages" | "accumulated" | "connection";

export interface SubscriptionTabsContext {
  subscription: SubscriptionTrace;
  activeTab: SubscriptionTab;
  selectedMessageId: string | null;
  expandedEventTypes: ReadonlySet<string>;
  showUnlistenedEvents: boolean;
}

function isEventListened(
  eventType: string,
  listenedEvents?: string[]
): boolean {
  if (!listenedEvents || listenedEvents.length === 0) return true;
  if (listenedEvents.includes("*")) return true;

  return listenedEvents.includes(eventType);
}

function parseRawData(rawData: unknown): unknown {
  if (typeof rawData === "string") {
    try {
      return JSON.parse(rawData);
    } catch {
      return rawData;
    }
  }

  return rawData;
}

function renderMessageRow(
  message: SubscriptionMessage,
  isExpanded: boolean,
  isListened: boolean
): string {
  const time = formatTime(message.timestamp);
  const eventClass = `spoosh-message-event-${message.eventType}`;
  const rowClass = `spoosh-message-row${isExpanded ? " expanded" : ""}${!isListened ? " muted" : ""}`;

  const parsedData = parseRawData(message.rawData);
  let preview = "...";

  try {
    const dataStr = JSON.stringify(parsedData);
    preview = dataStr.length > 60 ? dataStr.slice(0, 60) + "..." : dataStr;
  } catch {
    preview = String(parsedData);
  }

  const expandIcon = isExpanded ? "▼" : "▶";
  const jsonStr = JSON.stringify(parsedData, null, 2);

  return `
    <div class="${rowClass}">
      <div class="spoosh-message-header" data-message-id="${message.id}">
        <span class="spoosh-message-expand">${expandIcon}</span>
        <span class="spoosh-message-time">${time}</span>
        <span class="spoosh-message-event ${eventClass}">${escapeHtml(message.eventType)}</span>
        <span class="spoosh-message-preview">${escapeHtml(preview)}</span>
      </div>
      ${
        isExpanded
          ? `
        <div class="spoosh-message-content">
          <div class="spoosh-code-block">
            <button class="spoosh-code-copy-btn" data-action="copy" data-copy-content="${escapeHtml(jsonStr)}" title="Copy">
              ${copyIcon}
            </button>
            <pre class="spoosh-json">${formatJson(parsedData)}</pre>
          </div>
        </div>
      `
          : ""
      }
    </div>
  `;
}

function countUnlistenedMessages(subscription: SubscriptionTrace): number {
  if (
    !subscription.listenedEvents ||
    subscription.listenedEvents.length === 0
  ) {
    return 0;
  }

  return subscription.messages.filter(
    (msg) => !isEventListened(msg.eventType, subscription.listenedEvents)
  ).length;
}

export function renderMessagesTab(
  subscription: SubscriptionTrace,
  selectedMessageId: string | null,
  showUnlistenedEvents: boolean
): string {
  if (subscription.messages.length === 0) {
    return `
      <div class="spoosh-empty">
        No messages received yet
      </div>
    `;
  }

  const unlistenedCount = countUnlistenedMessages(subscription);
  const hasUnlistened = unlistenedCount > 0;

  const filteredMessages = showUnlistenedEvents
    ? subscription.messages
    : subscription.messages.filter((msg) =>
        isEventListened(msg.eventType, subscription.listenedEvents)
      );

  const listenedEventsLabel = subscription.listenedEvents?.length
    ? subscription.listenedEvents.join(", ")
    : "subscribed events";

  return `
    ${
      hasUnlistened
        ? `
      <div class="spoosh-plugins-header">
        <button class="spoosh-toggle-passed" data-action="toggle-unlistened">
          ${showUnlistenedEvents ? "Hide" : "Show"} ${unlistenedCount} unlistened
        </button>
      </div>
    `
        : ""
    }
    ${
      filteredMessages.length === 0
        ? `
      <div class="spoosh-empty">
        Waiting for ${listenedEventsLabel}...
      </div>
    `
        : `
      <div class="spoosh-messages-list">
        ${[...filteredMessages]
          .reverse()
          .map((msg) =>
            renderMessageRow(
              msg,
              msg.id === selectedMessageId,
              isEventListened(msg.eventType, subscription.listenedEvents)
            )
          )
          .join("")}
      </div>
    `
    }
  `;
}

interface EventTypeStats {
  eventType: string;
  updateCount: number;
  lastUpdatedAt: number;
  data: unknown;
}

function getEventTypeStats(subscription: SubscriptionTrace): EventTypeStats[] {
  const statsMap = new Map<string, { count: number; lastUpdatedAt: number }>();

  for (const msg of subscription.messages) {
    const existing = statsMap.get(msg.eventType);

    if (existing) {
      existing.count++;
      existing.lastUpdatedAt = Math.max(existing.lastUpdatedAt, msg.timestamp);
    } else {
      statsMap.set(msg.eventType, { count: 1, lastUpdatedAt: msg.timestamp });
    }
  }

  const eventTypes = Object.keys(subscription.accumulatedData);

  return eventTypes
    .map((eventType) => {
      const stats = statsMap.get(eventType) || { count: 0, lastUpdatedAt: 0 };

      return {
        eventType,
        updateCount: stats.count,
        lastUpdatedAt: stats.lastUpdatedAt,
        data: subscription.accumulatedData[eventType],
      };
    })
    .sort((a, b) => a.eventType.localeCompare(b.eventType));
}

function renderEventTypeSection(
  stats: EventTypeStats,
  isExpanded: boolean,
  isListened: boolean
): string {
  const expandIcon = isExpanded ? "▼" : "▶";
  const timeStr = stats.lastUpdatedAt ? formatTime(stats.lastUpdatedAt) : "—";
  const updateLabel = stats.updateCount === 1 ? "update" : "updates";
  const mutedClass = !isListened ? " muted" : "";
  const jsonStr = JSON.stringify(stats.data, null, 2);

  return `
    <div class="spoosh-event-section ${isExpanded ? "expanded" : ""}${mutedClass}">
      <div class="spoosh-event-header" data-event-type="${escapeHtml(stats.eventType)}">
        <span class="spoosh-event-expand">${expandIcon}</span>
        <span class="spoosh-event-name">${escapeHtml(stats.eventType)}</span>
        <span class="spoosh-event-stats">
          <span class="spoosh-event-count">${stats.updateCount} ${updateLabel}</span>
          <span class="spoosh-event-time">${timeStr}</span>
        </span>
      </div>
      ${
        isExpanded
          ? `
        <div class="spoosh-event-content">
          <div class="spoosh-code-block">
            <button class="spoosh-code-copy-btn" data-action="copy" data-copy-content="${escapeHtml(jsonStr)}" title="Copy">
              ${copyIcon}
            </button>
            <pre class="spoosh-json">${formatJson(stats.data)}</pre>
          </div>
        </div>
      `
          : ""
      }
    </div>
  `;
}

export function renderAccumulatedTab(
  subscription: SubscriptionTrace,
  expandedEventTypes: Set<string> = new Set(),
  showUnlistenedEvents: boolean = false
): string {
  const hasData = Object.keys(subscription.accumulatedData).length > 0;

  if (!hasData) {
    return `
      <div class="spoosh-empty">
        No accumulated data yet
      </div>
    `;
  }

  const eventStats = getEventTypeStats(subscription);
  const listenedEvents = subscription.listenedEvents;

  const unlistenedCount = eventStats.filter(
    (s) => !isEventListened(s.eventType, listenedEvents)
  ).length;
  const hasUnlistened = unlistenedCount > 0;

  const sortedStats = [...eventStats].sort((a, b) => {
    const aListened = isEventListened(a.eventType, listenedEvents);
    const bListened = isEventListened(b.eventType, listenedEvents);

    if (aListened && !bListened) return -1;
    if (!aListened && bListened) return 1;

    return a.eventType.localeCompare(b.eventType);
  });

  const filteredStats = showUnlistenedEvents
    ? sortedStats
    : sortedStats.filter((s) => isEventListened(s.eventType, listenedEvents));

  const listenedEventsLabel = listenedEvents?.length
    ? listenedEvents.join(", ")
    : "subscribed events";

  return `
    <div class="spoosh-accumulated-container">
      ${
        hasUnlistened
          ? `
        <div class="spoosh-plugins-header">
          <button class="spoosh-toggle-passed" data-action="toggle-unlistened">
            ${showUnlistenedEvents ? "Hide" : "Show"} ${unlistenedCount} unlistened
          </button>
        </div>
      `
          : ""
      }
      <div class="spoosh-accumulated-summary">
        <span class="spoosh-badge neutral">${eventStats.length} event types</span>
        <span class="spoosh-badge neutral">${subscription.messageCount} total messages</span>
      </div>
      ${
        filteredStats.length === 0
          ? `
        <div class="spoosh-empty">
          Waiting for ${listenedEventsLabel}...
        </div>
      `
          : `
        <div class="spoosh-event-list">
          ${filteredStats
            .map((stats) =>
              renderEventTypeSection(
                stats,
                expandedEventTypes.has(stats.eventType),
                isEventListened(stats.eventType, listenedEvents)
              )
            )
            .join("")}
        </div>
      `
      }
    </div>
  `;
}

export function renderConnectionTab(subscription: SubscriptionTrace): string {
  const statusClass =
    subscription.status === "connected"
      ? "success"
      : subscription.status === "error"
        ? "error"
        : subscription.status === "connecting"
          ? "pending"
          : "neutral";

  const connectedDuration = subscription.connectedAt
    ? formatDuration(
        (subscription.disconnectedAt ?? Date.now()) - subscription.connectedAt
      )
    : "N/A";

  return `
    <div class="spoosh-connection-container">
      <div class="spoosh-connection-info">
        <div class="spoosh-connection-row">
          <span class="spoosh-connection-label">Status</span>
          <span class="spoosh-badge ${statusClass}">${subscription.status}</span>
        </div>

        <div class="spoosh-connection-row">
          <span class="spoosh-connection-label">Transport</span>
          <span class="spoosh-connection-value">${subscription.transport.toUpperCase()}</span>
        </div>

        <div class="spoosh-connection-row">
          <span class="spoosh-connection-label">Channel</span>
          <span class="spoosh-connection-value">${escapeHtml(subscription.channel)}</span>
        </div>

        <div class="spoosh-connection-row">
          <span class="spoosh-connection-label">URL</span>
          <span class="spoosh-connection-value spoosh-connection-url">${escapeHtml(subscription.connectionUrl)}</span>
        </div>

        <div class="spoosh-connection-row">
          <span class="spoosh-connection-label">Connected Duration</span>
          <span class="spoosh-connection-value">${connectedDuration}</span>
        </div>

        <div class="spoosh-connection-row">
          <span class="spoosh-connection-label">Messages</span>
          <span class="spoosh-connection-value">${subscription.messageCount}</span>
        </div>

        <div class="spoosh-connection-row">
          <span class="spoosh-connection-label">Retry Count</span>
          <span class="spoosh-connection-value">${subscription.retryCount}</span>
        </div>

        ${
          subscription.error
            ? `
          <div class="spoosh-connection-row">
            <span class="spoosh-connection-label">Error</span>
            <span class="spoosh-connection-value error">${escapeHtml(subscription.error.message)}</span>
          </div>
        `
            : ""
        }

        ${
          subscription.connectedAt
            ? `
          <div class="spoosh-connection-row">
            <span class="spoosh-connection-label">Connected At</span>
            <span class="spoosh-connection-value">${formatTime(subscription.connectedAt)}</span>
          </div>
        `
            : ""
        }

        ${
          subscription.disconnectedAt
            ? `
          <div class="spoosh-connection-row">
            <span class="spoosh-connection-label">Disconnected At</span>
            <span class="spoosh-connection-value">${formatTime(subscription.disconnectedAt)}</span>
          </div>
        `
            : ""
        }
      </div>
    </div>
  `;
}

export function renderSubscriptionTabs(ctx: SubscriptionTabsContext): string {
  const {
    subscription,
    activeTab,
    selectedMessageId,
    expandedEventTypes,
    showUnlistenedEvents,
  } = ctx;

  let content = "";

  switch (activeTab) {
    case "messages":
      content = renderMessagesTab(
        subscription,
        selectedMessageId,
        showUnlistenedEvents
      );
      break;
    case "accumulated":
      content = renderAccumulatedTab(
        subscription,
        new Set(expandedEventTypes),
        showUnlistenedEvents
      );
      break;
    case "connection":
      content = renderConnectionTab(subscription);
      break;
  }

  return content;
}
