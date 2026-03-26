import type { Component } from "solid-js";
import type { CacheEntryDisplay } from "@devtool/types";
import { parseQueryKey } from "../../utils/format";

function getDataPreview(data: unknown): string {
  if (data === undefined) return "empty";
  if (data === null) return "null";
  if (Array.isArray(data)) return `Array(${data.length})`;
  if (typeof data === "object") return "Object";
  if (typeof data === "string") {
    return data.length > 20 ? `"${data.slice(0, 20)}..."` : `"${data}"`;
  }
  return String(data);
}

interface StateEntryProps {
  entry: CacheEntryDisplay;
  isSelected: boolean;
  onSelect: (key: string) => void;
}

export const StateEntry: Component<StateEntryProps> = (props) => {
  const parsed = () =>
    parseQueryKey(props.entry.queryKey, props.entry.resolvedPath);
  const hasData = () => props.entry.entry.state.data !== undefined;
  const hasError = () => props.entry.entry.state.error !== undefined;
  const isStale = () => props.entry.entry.stale === true;

  const statusClass = () => {
    if (hasError()) return "bg-spoosh-error";
    if (isStale()) return "bg-spoosh-warning";
    if (hasData()) return "bg-spoosh-success";
    return "bg-spoosh-text-muted";
  };

  const dataPreview = () => {
    if (hasError()) return "error";
    return getDataPreview(props.entry.entry.state.data);
  };

  return (
    <div
      class={`flex items-center gap-2 px-3 py-2 cursor-pointer border-b border-spoosh-border hover:bg-spoosh-hover transition-colors ${props.isSelected ? "bg-spoosh-hover" : ""}`}
      onClick={() => props.onSelect(props.entry.queryKey)}
    >
      <div class={`w-2 h-2 rounded-full shrink-0 ${statusClass()}`} />

      <div class="flex-1 min-w-0">
        <div class="flex items-center gap-1">
          <span class="text-xs font-medium text-spoosh-text truncate">
            {parsed().path}
          </span>
          {parsed().queryParams && (
            <span class="text-2xs text-spoosh-text-muted truncate">
              ?{parsed().queryParams}
            </span>
          )}
        </div>
        <div class="text-2xs text-spoosh-text-muted truncate">
          {dataPreview()}
        </div>
      </div>

      <div class="flex items-center gap-1.5 shrink-0">
        {props.entry.subscriberCount > 0 && (
          <span
            class="text-2xs text-spoosh-text-muted"
            title="Active subscribers"
          >
            {props.entry.subscriberCount}
          </span>
        )}
        {isStale() && (
          <span class="text-2xs px-1 py-0.5 rounded bg-spoosh-warning/20 text-spoosh-warning">
            stale
          </span>
        )}
      </div>
    </div>
  );
};
