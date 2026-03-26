import type { Component } from "solid-js";
import type { OperationType } from "@spoosh/core";
import type { DevToolFilters, TraceTypeFilter } from "@devtool/types";

import { SearchInput } from "./SearchInput";
import { FilterButtons } from "./FilterButtons";
import { TypeFilter } from "./TypeFilter";

interface HeaderProps {
  filters: DevToolFilters;
  showSettings: boolean;
  searchQuery: string;
  onSearchChange: (value: string) => void;
  onFilterToggle: (type: OperationType) => void;
  onTypeFilterChange: (filter: TraceTypeFilter) => void;
  onClear: () => void;
  onExport: () => void;
  onSettingsToggle: () => void;
}

export const Header: Component<HeaderProps> = (props) => {
  return (
    <div class="flex flex-col bg-spoosh-surface">
      <div class="flex items-center justify-between px-2.5 py-2 border-b border-spoosh-border">
        <a
          class="flex items-center gap-1.5 text-spoosh-text no-underline hover:underline text-xs font-semibold"
          href="https://spoosh.dev"
          target="_blank"
          rel="noopener noreferrer"
        >
          <svg class="w-4 h-3.5" viewBox="0 0 24 21" fill="currentColor">
            <path d="M12 0L24 21H0L12 0Z" />
          </svg>
          <span>Spoosh</span>
        </a>

        <div class="flex items-center gap-0.5">
          <button
            class={`p-1 rounded border-none cursor-pointer flex items-center justify-center ${
              props.showSettings
                ? "bg-spoosh-primary text-white"
                : "bg-transparent text-spoosh-text-muted hover:text-spoosh-text"
            }`}
            onClick={props.onSettingsToggle}
            title="Settings"
          >
            <svg
              width="14"
              height="14"
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
            class="p-1 rounded border-none cursor-pointer bg-transparent text-spoosh-text-muted hover:text-spoosh-text flex items-center justify-center"
            onClick={props.onExport}
            title="Export traces"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" />
            </svg>
          </button>

          <button
            class="p-1 rounded border-none cursor-pointer bg-transparent text-spoosh-text-muted hover:text-spoosh-text flex items-center justify-center"
            onClick={props.onClear}
            title="Clear"
          >
            <svg
              width="14"
              height="14"
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

      <div class="flex items-center gap-1.5 px-2.5 py-1.5 border-b border-spoosh-border">
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          class="text-spoosh-text-muted flex-shrink-0"
        >
          <circle cx="11" cy="11" r="8" />
          <path d="M21 21l-4.35-4.35" />
        </svg>
        <SearchInput
          value={props.searchQuery}
          onChange={props.onSearchChange}
          placeholder="Search..."
        />
      </div>

      <div class="flex flex-wrap items-center gap-1 px-2.5 py-1.5 border-b border-spoosh-border">
        <TypeFilter
          activeFilter={props.filters.traceTypeFilter}
          onFilterChange={props.onTypeFilterChange}
        />

        <div class="w-px h-4 bg-spoosh-border mx-1" />

        <FilterButtons
          filters={props.filters}
          onToggle={props.onFilterToggle}
        />
      </div>
    </div>
  );
};
