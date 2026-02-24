import type { OperationType } from "@spoosh/core";

import type { TraceTypeFilter } from "../../types";
import { escapeHtml, getLogo } from "../utils";

export interface HeaderRenderContext {
  filters: {
    operationTypes: Set<OperationType>;
    traceTypeFilter: TraceTypeFilter;
  };
  showSettings: boolean;
  searchQuery: string;
  hideFilters?: boolean;
  hideClear?: boolean;
  hideTypeFilter?: boolean;
}

const TYPE_FILTER_ICONS: Record<string, string> = {
  all: `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/></svg>`,
  http: `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.66 0 3-4 3-9s-1.34-9-3-9m0 18c-1.66 0-3-4-3-9s1.34-9 3-9"/></svg>`,
  sse: `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>`,
  ws: `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M19 12l-7 7M19 12l-7-7M5 12l7-7M5 12l7 7"/></svg>`,
};

const OP_FILTER_ICONS: Record<string, string> = {
  read: `<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2z"/><path d="M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z"/></svg>`,
  write: `<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 20h9M16.5 3.5a2.12 2.12 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>`,
  pages: `<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>`,
  queue: `<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>`,
};

export function renderHeader(ctx: HeaderRenderContext): string {
  const {
    filters,
    showSettings,
    searchQuery,
    hideFilters,
    hideClear,
    hideTypeFilter,
  } = ctx;

  const typeFilters = (["all", "http", "sse", "ws"] as const)
    .map((type) => {
      const active = filters.traceTypeFilter === type;
      const label = type === "all" ? "All" : type.toUpperCase();
      const icon = TYPE_FILTER_ICONS[type];
      return `<button class="spoosh-chip ${active ? "active" : ""}" data-type-filter="${type}" title="${label}">${icon}<span>${label}</span></button>`;
    })
    .join("");

  const opFilters = (["read", "write", "pages", "queue"] as const)
    .map((type) => {
      const active = filters.operationTypes.has(type);
      const label = type.charAt(0).toUpperCase() + type.slice(1);
      const icon = OP_FILTER_ICONS[type];
      return `<button class="spoosh-chip-icon ${active ? "active" : ""}" data-filter="${type}" title="${label}">${icon}</button>`;
    })
    .join("");

  const filtersHtml =
    hideFilters && hideTypeFilter
      ? ""
      : `
    <div class="spoosh-filter-bar">
      ${hideTypeFilter ? "" : typeFilters}
      ${hideFilters || hideTypeFilter ? "" : `<div class="spoosh-filter-divider"></div>`}
      ${hideFilters ? "" : opFilters}
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
