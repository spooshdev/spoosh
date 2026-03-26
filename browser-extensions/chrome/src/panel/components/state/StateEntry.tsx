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

  const statusColor = () => {
    if (hasError()) return "var(--spoosh-error)";
    if (isStale()) return "var(--spoosh-warning)";
    if (hasData()) return "var(--spoosh-success)";
    return "var(--spoosh-border)";
  };

  const dataPreview = () => {
    if (hasError()) return "error";
    return getDataPreview(props.entry.entry.state.data);
  };

  return (
    <div
      class={`flex items-center gap-2.5 px-3 py-2.5 mx-1.5 my-1 cursor-pointer rounded-md border bg-spoosh-surface transition-all ${
        props.isSelected
          ? "border-[#14b8a6] bg-[rgba(20,184,166,0.08)] shadow-[0_0_0_1px_rgba(20,184,166,0.3)]"
          : "border-spoosh-border hover:border-[#14b8a6] hover:bg-[rgba(20,184,166,0.05)]"
      }`}
      onClick={() => props.onSelect(props.entry.queryKey)}
    >
      <div
        class="w-2.5 h-2.5 rounded-full shrink-0 border-2 border-spoosh-surface"
        style={{
          background: statusColor(),
          color: statusColor(),
          "box-shadow": `0 0 0 2px currentColor`,
        }}
      />

      <div class="flex-1 min-w-0 flex flex-col gap-0.5">
        <div class="flex items-center gap-1.5">
          <span class="text-[11px] font-medium text-spoosh-text truncate">
            {parsed().path}
          </span>
          {parsed().queryParams && (
            <span class="text-[10px] text-[#14b8a6] truncate">
              ?{parsed().queryParams}
            </span>
          )}
        </div>
        <div class="text-[10px] text-spoosh-text-muted font-mono truncate pl-px">
          {dataPreview()}
        </div>
      </div>

      <div class="flex flex-col items-end gap-1 shrink-0">
        {props.entry.subscriberCount > 0 && (
          <span
            class="text-[9px] px-1.5 py-0.5 rounded-full bg-[#14b8a6] text-white font-semibold"
            title="Active subscribers"
          >
            {props.entry.subscriberCount}
          </span>
        )}
        {isStale() && (
          <span class="text-[9px] px-1.5 py-0.5 rounded bg-spoosh-warning/15 text-spoosh-warning font-medium">
            stale
          </span>
        )}
      </div>
    </div>
  );
};
