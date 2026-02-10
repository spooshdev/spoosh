import type { OperationType } from "@spoosh/core";

import { escapeHtml, getLogo } from "../utils";

export interface HeaderRenderContext {
  filters: { operationTypes: Set<OperationType> };
  showSettings: boolean;
  searchQuery: string;
  hideFilters?: boolean;
  hideClear?: boolean;
}

export function renderHeader(ctx: HeaderRenderContext): string {
  const { filters, showSettings, searchQuery, hideFilters, hideClear } = ctx;

  const filtersHtml = hideFilters
    ? ""
    : `
    <div class="spoosh-filters">
      ${(["read", "write", "infiniteRead"] as const)
        .map((type) => {
          const active = filters.operationTypes.has(type);
          const label =
            type === "infiniteRead"
              ? "Infinite"
              : type.charAt(0).toUpperCase() + type.slice(1);
          return `<button class="spoosh-filter ${active ? "active" : ""}" data-filter="${type}">${label}</button>`;
        })
        .join("")}
    </div>
  `;

  return `
    <div class="spoosh-header">
      <a class="spoosh-title" href="https://spoosh.dev" target="_blank" rel="noopener noreferrer">
        <span class="spoosh-logo">${getLogo(16, 14)}</span>
        <span>Spoosh</span>
      </a>
      <div class="spoosh-actions">
        <button class="spoosh-icon-btn ${showSettings ? "active" : ""}" data-action="settings" title="Settings">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="3"/>
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
          </svg>
        </button>
        ${
          hideClear
            ? ""
            : `<button class="spoosh-icon-btn" data-action="export" title="Export traces">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/>
                </svg>
              </button>
              <button class="spoosh-icon-btn" data-action="clear" title="Clear">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
                </svg>
              </button>`
        }
        <button class="spoosh-icon-btn" data-action="close" title="Close">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M18 6L6 18M6 6l12 12"/>
          </svg>
        </button>
      </div>
    </div>
    <div class="spoosh-search">
      <svg class="spoosh-search-icon" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="11" cy="11" r="8"/>
        <path d="M21 21l-4.35-4.35"/>
      </svg>
      <input type="text" class="spoosh-search-input" placeholder="Search..." value="${escapeHtml(searchQuery)}">
    </div>
    ${filtersHtml}
  `;
}
