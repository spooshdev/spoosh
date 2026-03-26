import type { Component } from "solid-js";
import { For } from "solid-js";
import type { OperationType } from "@spoosh/core";
import type { DevToolFilters } from "@devtool/types";

interface FilterButtonsProps {
  filters: DevToolFilters;
  onToggle: (type: OperationType) => void;
}

const FILTER_CONFIG: Array<{
  type: OperationType;
  label: string;
  icon: string;
}> = [
  {
    type: "read",
    label: "Read",
    icon: `<path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2z"/><path d="M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z"/>`,
  },
  {
    type: "write",
    label: "Write",
    icon: `<path d="M12 20h9M16.5 3.5a2.12 2.12 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/>`,
  },
  {
    type: "pages",
    label: "Pages",
    icon: `<rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/>`,
  },
  {
    type: "queue",
    label: "Queue",
    icon: `<line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>`,
  },
];

export const FilterButtons: Component<FilterButtonsProps> = (props) => {
  const isActive = (type: OperationType) =>
    props.filters.operationTypes.has(type);

  return (
    <div class="flex items-center gap-1">
      <For each={FILTER_CONFIG}>
        {(filter) => (
          <button
            class={`inline-flex items-center justify-center px-1.5 py-1 rounded border-none cursor-pointer transition-all relative group ${
              isActive(filter.type)
                ? "bg-spoosh-primary/15 text-spoosh-primary"
                : "bg-transparent text-spoosh-text-muted hover:text-spoosh-text hover:bg-spoosh-border"
            }`}
            onClick={() => props.onToggle(filter.type)}
            title={filter.label}
          >
            <svg
              width="10"
              height="10"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2.5"
              innerHTML={filter.icon}
            />
          </button>
        )}
      </For>
    </div>
  );
};
