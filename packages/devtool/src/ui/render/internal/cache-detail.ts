import type { CacheEntryDisplay } from "../../../types";
import type { InternalTab } from "../../view-model";
import {
  escapeHtml,
  formatJson,
  formatTime,
  formatQueryParams,
} from "../../utils";
import { renderCacheTabs } from "./cache-tabs";

export interface CacheDetailContext {
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
    return `
      <div class="spoosh-tab-section">
        <div class="spoosh-data-label">Error</div>
        <pre class="spoosh-json error">${formatJson(state.error)}</pre>
      </div>
    `;
  }

  if (state.data === undefined) {
    return `<div class="spoosh-empty">No data cached</div>`;
  }

  return `
    <div class="spoosh-tab-section">
      <div class="spoosh-data-label">Cached Data</div>
      <pre class="spoosh-json">${formatJson(state.data)}</pre>
    </div>
    ${
      entry.entry.previousData !== undefined
        ? `
      <div class="spoosh-tab-section">
        <div class="spoosh-data-label">Previous Data</div>
        <pre class="spoosh-json">${formatJson(entry.entry.previousData)}</pre>
      </div>
    `
        : ""
    }
  `;
}

function renderMetaTab(entry: CacheEntryDisplay): string {
  const { entry: cacheEntry } = entry;
  const metaEntries = Array.from(cacheEntry.meta.entries());

  const info = [
    {
      label: "Tags",
      value: cacheEntry.tags.length > 0 ? cacheEntry.tags.join(", ") : "(none)",
    },
    { label: "Self Tag", value: cacheEntry.selfTag ?? "(none)" },
    { label: "Stale", value: cacheEntry.stale ? "Yes" : "No" },
    { label: "Subscribers", value: String(entry.subscriberCount) },
    {
      label: "Timestamp",
      value: cacheEntry.state.timestamp
        ? formatTime(cacheEntry.state.timestamp)
        : "(none)",
    },
  ];

  return `
    <div class="spoosh-cache-info-list">
      ${info
        .map(
          (item) => `
        <div class="spoosh-cache-info-row">
          <span class="spoosh-cache-info-label">${item.label}</span>
          <span class="spoosh-cache-info-value">${escapeHtml(item.value)}</span>
        </div>
      `
        )
        .join("")}
    </div>
    ${
      metaEntries.length > 0
        ? `
      <div class="spoosh-tab-section">
        <div class="spoosh-data-label">Plugin Metadata</div>
        <pre class="spoosh-json">${formatJson(Object.fromEntries(metaEntries))}</pre>
      </div>
    `
        : ""
    }
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

  return `
    <div class="spoosh-tab-section">
      <pre class="spoosh-json">${formatJson(raw)}</pre>
    </div>
  `;
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

export function renderCacheDetail(ctx: CacheDetailContext): string {
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
          <div class="spoosh-detail-empty-text">Select a cache entry to inspect</div>
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

      ${renderCacheTabs({ activeTab })}

      <div class="spoosh-tab-content">
        ${renderTabContent(entry, activeTab)}
      </div>

      <div class="spoosh-cache-actions">
        <button class="spoosh-cache-action-btn" data-action="invalidate-cache" data-cache-key="${escapeHtml(entry.queryKey)}">
          Invalidate
        </button>
        <button class="spoosh-cache-action-btn danger" data-action="delete-cache" data-cache-key="${escapeHtml(entry.queryKey)}">
          Delete
        </button>
      </div>
    </div>
  `;
}
