import type { CacheEntryDisplay } from "../../../types";
import type { InternalTab } from "../../view-model";
import {
  escapeHtml,
  formatJson,
  formatTime,
  formatQueryParams,
} from "../../utils";
import { renderStateTabs } from "./state-tabs";

const copyIcon = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
  <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
  <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/>
</svg>`;

function renderDataSection(
  label: string,
  data: unknown,
  isError = false
): string {
  const jsonStr = JSON.stringify(data, null, 2);

  return `
    <div class="spoosh-tab-section">
      <div class="spoosh-data-label">${label}</div>
      <div class="spoosh-code-block">
        <button class="spoosh-code-copy-btn" data-action="copy" data-copy-content="${escapeHtml(jsonStr)}" title="Copy">
          ${copyIcon}
        </button>
        <pre class="spoosh-json${isError ? " error" : ""}">${formatJson(data)}</pre>
      </div>
    </div>
  `;
}

export interface StateDetailContext {
  entry: CacheEntryDisplay | null;
  activeTab: InternalTab;
}

interface ParsedQueryKey {
  path: string;
  method: string;
  queryParams: string | null;
}

function parseQueryKey(queryKey: string): ParsedQueryKey {
  try {
    const parsed = JSON.parse(queryKey) as {
      path?: string;
      method?: string;
      options?: { query?: Record<string, unknown> };
    };

    const queryParams = parsed.options?.query
      ? formatQueryParams(parsed.options.query)
      : null;

    return {
      path: parsed.path ?? queryKey,
      method: parsed.method ?? "GET",
      queryParams,
    };
  } catch {
    return { path: queryKey, method: "GET", queryParams: null };
  }
}

function renderDataTab(entry: CacheEntryDisplay): string {
  const { state } = entry.entry;

  if (state.error) {
    return renderDataSection("Error", state.error, true);
  }

  if (state.data === undefined) {
    return `<div class="spoosh-empty">No data in state</div>`;
  }

  return `
    ${renderDataSection("Cached Data", state.data)}
    ${entry.entry.previousData !== undefined ? renderDataSection("Previous Data", entry.entry.previousData) : ""}
  `;
}

function renderMetaTab(entry: CacheEntryDisplay): string {
  const { entry: stateEntry } = entry;
  const metaEntries = Array.from(stateEntry.meta.entries());

  const info = [
    {
      label: "Tags",
      value: stateEntry.tags.length > 0 ? stateEntry.tags.join(", ") : "(none)",
    },
    { label: "Self Tag", value: stateEntry.selfTag ?? "(none)" },
    { label: "Stale", value: stateEntry.stale ? "Yes" : "No" },
    { label: "Subscribers", value: String(entry.subscriberCount) },
    {
      label: "Timestamp",
      value: stateEntry.state.timestamp
        ? formatTime(stateEntry.state.timestamp)
        : "(none)",
    },
  ];

  return `
    <div class="spoosh-state-info-list">
      ${info
        .map(
          (item) => `
        <div class="spoosh-state-info-row">
          <span class="spoosh-state-info-label">${item.label}</span>
          <span class="spoosh-state-info-value">${escapeHtml(item.value)}</span>
        </div>
      `
        )
        .join("")}
    </div>
    ${metaEntries.length > 0 ? renderDataSection("Plugin Metadata", Object.fromEntries(metaEntries)) : ""}
  `;
}

function renderRawTab(entry: CacheEntryDisplay): string {
  const raw = {
    queryKey: entry.queryKey,
    state: entry.entry.state,
    tags: entry.entry.tags,
    selfTag: entry.entry.selfTag,
    stale: entry.entry.stale,
    meta: Object.fromEntries(entry.entry.meta),
    previousData: entry.entry.previousData,
    subscriberCount: entry.subscriberCount,
  };

  return renderDataSection("Raw State Entry", raw);
}

function renderTabContent(
  entry: CacheEntryDisplay,
  activeTab: InternalTab
): string {
  switch (activeTab) {
    case "data":
      return renderDataTab(entry);
    case "meta":
      return renderMetaTab(entry);
    case "raw":
      return renderRawTab(entry);
  }
}

export function renderStateDetail(ctx: StateDetailContext): string {
  const { entry, activeTab } = ctx;

  if (!entry) {
    return `
      <div class="spoosh-detail-panel">
        <div class="spoosh-detail-empty">
          <div class="spoosh-detail-empty-icon">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
              <line x1="3" y1="9" x2="21" y2="9"/>
              <line x1="9" y1="21" x2="9" y2="9"/>
            </svg>
          </div>
          <div class="spoosh-detail-empty-text">Select a state entry to inspect</div>
        </div>
      </div>
    `;
  }

  const { path, method, queryParams } = parseQueryKey(entry.queryKey);
  const hasError = entry.entry.state.error !== undefined;
  const isStale = entry.entry.stale === true;
  const fullPath = queryParams ? `${path}?${queryParams}` : path;

  return `
    <div class="spoosh-detail-panel">
      <div class="spoosh-detail-header">
        <div class="spoosh-detail-title">
          <span class="spoosh-trace-method method-${method}">${method}</span>
          <span class="spoosh-detail-path">${escapeHtml(fullPath)}</span>
        </div>
        <div class="spoosh-detail-meta">
          <span class="spoosh-badge ${hasError ? "error" : isStale ? "warning" : "success"}">
            ${hasError ? "Error" : isStale ? "Stale" : "Fresh"}
          </span>
          <span class="spoosh-badge neutral">${entry.subscriberCount} subscriber${entry.subscriberCount !== 1 ? "s" : ""}</span>
        </div>
      </div>

      ${renderStateTabs({ activeTab })}

      <div class="spoosh-tab-content">
        ${renderTabContent(entry, activeTab)}
      </div>

      <div class="spoosh-state-actions">
        <button class="spoosh-state-action-btn" data-action="refetch-state" data-state-key="${escapeHtml(entry.queryKey)}">
          Refetch
        </button>
        <button class="spoosh-state-action-btn danger" data-action="delete-state" data-state-key="${escapeHtml(entry.queryKey)}">
          Delete
        </button>
      </div>
    </div>
  `;
}
