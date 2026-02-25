import type { CacheEntryDisplay } from "../../../types";
import { escapeHtml, parseQueryKey } from "../../utils";

export interface StateListContext {
  entries: CacheEntryDisplay[];
  selectedKey: string | null;
  searchQuery: string;
}

function getDataPreview(data: unknown): string {
  if (data === undefined) return "empty";
  if (data === null) return "null";
  if (Array.isArray(data)) return `Array(${data.length})`;
  if (typeof data === "object") return `Object`;
  if (typeof data === "string")
    return data.length > 20 ? `"${data.slice(0, 20)}..."` : `"${data}"`;
  return String(data);
}

export function renderStateRow(
  entry: CacheEntryDisplay,
  isSelected: boolean
): string {
  const { path, queryParams } = parseQueryKey(
    entry.queryKey,
    entry.resolvedPath
  );
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

  const dataPreview = hasError
    ? "error"
    : getDataPreview(entry.entry.state.data);

  return `
    <div class="spoosh-state-entry ${isSelected ? "selected" : ""}" data-state-key="${escapeHtml(entry.queryKey)}">
      <div class="spoosh-state-status ${statusClass}"></div>
      <div class="spoosh-state-info">
        <div class="spoosh-state-key-row">
          <span class="spoosh-state-path">${escapeHtml(path)}${queryParams ? `<span class="spoosh-state-query">?${escapeHtml(queryParams)}</span>` : ""}</span>
        </div>
        <div class="spoosh-state-preview">${escapeHtml(dataPreview)}</div>
      </div>
      <div class="spoosh-state-meta">
        ${entry.subscriberCount > 0 ? `<span class="spoosh-state-subscribers" title="Active subscribers">${entry.subscriberCount}</span>` : ""}
        ${isStale ? `<span class="spoosh-state-stale-badge">stale</span>` : ""}
      </div>
    </div>
  `;
}

export function renderStateList(ctx: StateListContext): string {
  const { entries, selectedKey } = ctx;

  if (entries.length === 0) {
    return `<div class="spoosh-empty">No state entries</div>`;
  }

  return `
    <div class="spoosh-state-entries">
      ${entries
        .map((entry) => renderStateRow(entry, entry.queryKey === selectedKey))
        .join("")}
    </div>
  `;
}
