import type { Component } from "solid-js";
import { For } from "solid-js";
import type { TraceTypeFilter } from "@devtool/types";

interface TypeFilterProps {
  /** Currently active filter */
  activeFilter: TraceTypeFilter;

  /** Callback when filter changes */
  onFilterChange: (filter: TraceTypeFilter) => void;
}

const TYPE_FILTER_CONFIG: Array<{
  type: TraceTypeFilter;
  label: string;
  icon: string;
}> = [
  {
    type: "all",
    label: "All",
    icon: `<circle cx="12" cy="12" r="10"/>`,
  },
  {
    type: "http",
    label: "HTTP",
    icon: `<path d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.66 0 3-4 3-9s-1.34-9-3-9m0 18c-1.66 0-3-4-3-9s1.34-9 3-9"/>`,
  },
  {
    type: "sse",
    label: "SSE",
    icon: `<path d="M5 12h14M12 5l7 7-7 7"/>`,
  },
];

export const TypeFilter: Component<TypeFilterProps> = (props) => {
  return (
    <div class="flex items-center bg-spoosh-bg border border-spoosh-border rounded overflow-hidden">
      <For each={TYPE_FILTER_CONFIG}>
        {(filter) => (
          <button
            class={`flex items-center gap-1 px-2 py-1 text-2xs border-none cursor-pointer transition-colors ${
              props.activeFilter === filter.type
                ? "bg-spoosh-primary/20 text-spoosh-primary"
                : "bg-transparent text-spoosh-text-muted hover:text-spoosh-text hover:bg-spoosh-border/50"
            }`}
            onClick={() => props.onFilterChange(filter.type)}
            title={filter.label}
          >
            <svg
              class="w-3 h-3"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              innerHTML={filter.icon}
            />
            <span>{filter.label}</span>
          </button>
        )}
      </For>
    </div>
  );
};
