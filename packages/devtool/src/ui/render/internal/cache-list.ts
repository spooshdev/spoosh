import type { CacheEntryDisplay } from "../../../types";
import { escapeHtml, formatQueryParams } from "../../utils";

export interface CacheListContext {
  entries: CacheEntryDisplay[];
  selectedKey: string | null;
  searchQuery: string;
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

export function renderCacheRow(
  entry: CacheEntryDisplay,
  isSelected: boolean
): string {
  const { path, method, queryParams } = parseQueryKey(entry.queryKey);
  const hasData = entry.entry.state.data !== undefined;
  const hasError = entry.entry.state.error !== undefined;
  const isStale = entry.entry.stale === true;

  const statusClass = hasError
    ? "error"
    : isStale
      ? "stale"
      : hasData
        ? "success"
        : "empty";

  return `
    <div class="spoosh-cache-entry ${isSelected ? "selected" : ""}" data-cache-key="${escapeHtml(entry.queryKey)}">
      <div class="spoosh-cache-status ${statusClass}"></div>
      <div class="spoosh-cache-info">
        <span class="spoosh-cache-method method-${method}">${method}</span>
        <span class="spoosh-cache-path">${escapeHtml(path)}${queryParams ? `<span class="spoosh-cache-query">?${escapeHtml(queryParams)}</span>` : ""}</span>
      </div>
      <div class="spoosh-cache-meta">
        ${entry.subscriberCount > 0 ? `<span class="spoosh-cache-subscribers">${entry.subscriberCount}</span>` : ""}
        ${isStale ? `<span class="spoosh-cache-stale-badge">stale</span>` : ""}
      </div>
    </div>
  `;
}

export function renderCacheList(ctx: CacheListContext): string {
  const { entries, selectedKey } = ctx;

  if (entries.length === 0) {
    return `<div class="spoosh-empty">No cache entries</div>`;
  }

  return `
    <div class="spoosh-cache-entries">
      ${entries
        .map((entry) => renderCacheRow(entry, entry.queryKey === selectedKey))
        .join("")}
    </div>
  `;
}
