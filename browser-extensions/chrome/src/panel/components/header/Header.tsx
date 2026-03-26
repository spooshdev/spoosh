import type { Component } from "solid-js";
import type { OperationType } from "@spoosh/core";
import type { DevToolFilters, TraceTypeFilter } from "@devtool/types";

import { SearchInput } from "./SearchInput";
import { FilterButtons } from "./FilterButtons";
import { TypeFilter } from "./TypeFilter";

interface HeaderProps {
  /** Current filter state */
  filters: DevToolFilters;

  /** Whether settings panel is shown */
  showSettings: boolean;

  /** Current search query */
  searchQuery: string;

  /** Callback when search query changes */
  onSearchChange: (value: string) => void;

  /** Callback when an operation type filter is toggled */
  onFilterToggle: (type: OperationType) => void;

  /** Callback when type filter changes */
  onTypeFilterChange: (filter: TraceTypeFilter) => void;

  /** Callback to clear all traces */
  onClear: () => void;

  /** Callback to export traces */
  onExport: () => void;

  /** Callback to toggle settings panel */
  onSettingsToggle: () => void;
}

export const Header: Component<HeaderProps> = (props) => {
  return (
    <div class="bg-spoosh-surface border-b border-spoosh-border p-2 flex flex-col gap-2">
      <div class="flex items-center justify-between gap-2">
        <a
          class="flex items-center gap-1.5 text-spoosh-text no-underline hover:text-spoosh-primary transition-colors"
          href="https://spoosh.dev"
          target="_blank"
          rel="noopener noreferrer"
        >
          <svg class="w-4 h-3.5" viewBox="0 0 24 21" fill="currentColor">
            <path d="M12 0L24 21H0L12 0Z" />
          </svg>
          <span class="text-xs font-semibold">Spoosh</span>
        </a>

        <div class="flex items-center gap-1">
          <button
            class={`flex items-center justify-center w-7 h-7 rounded border-none cursor-pointer transition-colors ${
              props.showSettings
                ? "bg-spoosh-primary/20 text-spoosh-primary"
                : "bg-transparent text-spoosh-text-muted hover:text-spoosh-text hover:bg-spoosh-border/50"
            }`}
            onClick={props.onSettingsToggle}
            title="Settings"
          >
            <svg
              class="w-3.5 h-3.5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
          </button>

          <button
            class="flex items-center justify-center w-7 h-7 rounded border-none cursor-pointer transition-colors bg-transparent text-spoosh-text-muted hover:text-spoosh-text hover:bg-spoosh-border/50"
            onClick={props.onExport}
            title="Export traces"
          >
            <svg
              class="w-3.5 h-3.5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" />
            </svg>
          </button>

          <button
            class="flex items-center justify-center w-7 h-7 rounded border-none cursor-pointer transition-colors bg-transparent text-spoosh-text-muted hover:text-spoosh-text hover:bg-spoosh-border/50"
            onClick={props.onClear}
            title="Clear"
          >
            <svg
              class="w-3.5 h-3.5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
            </svg>
          </button>
        </div>
      </div>

      <SearchInput
        value={props.searchQuery}
        onChange={props.onSearchChange}
        placeholder="Search..."
      />

      <div class="flex items-center gap-2">
        <TypeFilter
          activeFilter={props.filters.traceTypeFilter}
          onFilterChange={props.onTypeFilterChange}
        />

        <div class="w-px h-4 bg-spoosh-border" />

        <FilterButtons
          filters={props.filters}
          onToggle={props.onFilterToggle}
        />
      </div>
    </div>
  );
};
