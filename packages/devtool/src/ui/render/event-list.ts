import type { StandaloneEvent } from "@spoosh/core";

import { escapeHtml } from "../utils";

const COLOR_MAP: Record<string, string> = {
  success: "var(--spoosh-success)",
  warning: "var(--spoosh-warning)",
  error: "var(--spoosh-error)",
  info: "var(--spoosh-primary)",
  muted: "var(--spoosh-text-muted)",
};

function formatQueryKey(queryKey: string): string {
  try {
    const parsed = JSON.parse(queryKey);
    return parsed.path || queryKey.slice(0, 30);
  } catch {
    return queryKey.slice(0, 30);
  }
}

export function renderEventRow(event: StandaloneEvent): string {
  const pluginName = event.plugin.replace("spoosh:", "");
  const time = new Date(event.timestamp).toLocaleTimeString();
  const dotColor = event.color
    ? COLOR_MAP[event.color]
    : "var(--spoosh-primary)";

  return `
    <div class="spoosh-event">
      <div class="spoosh-event-dot" style="background: ${dotColor}"></div>
      <div class="spoosh-event-info">
        <span class="spoosh-event-plugin">${pluginName}</span>
        <span class="spoosh-event-message">${escapeHtml(event.message)}</span>
        ${event.queryKey ? `<span class="spoosh-event-query">${formatQueryKey(event.queryKey)}</span>` : ""}
      </div>
      <span class="spoosh-event-time">${time}</span>
    </div>
  `;
}

export function renderEventList(events: StandaloneEvent[]): string {
  if (events.length === 0) {
    return `<div class="spoosh-empty">No events yet</div>`;
  }

  return `
    <div class="spoosh-events">
      ${[...events]
        .reverse()
        .map((event) => renderEventRow(event))
        .join("")}
    </div>
  `;
}
