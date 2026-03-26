import { For, Show, type Component } from "solid-js";
import type { ExportedItem, ExportedTrace, ExportedSSE } from "@devtool/types";
import { formatTime, formatDuration, parseQueryKey } from "../../utils/format";

interface ImportListProps {
  items: ExportedItem[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onImportFile: () => void;
}

const UploadIcon = () => (
  <svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
  >
    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12" />
  </svg>
);

function getSSEStatusClass(status: ExportedSSE["status"]): string {
  switch (status) {
    case "connected":
      return "success";
    case "error":
      return "error";
    case "connecting":
      return "pending";
    case "disconnected":
    default:
      return "neutral";
  }
}

function getSSEDuration(sub: ExportedSSE): string {
  if (sub.status === "connecting") return "connecting...";

  const startTime = sub.connectedAt ?? sub.timestamp;
  const endTime = sub.disconnectedAt ?? sub.timestamp;

  return formatDuration(endTime - startTime);
}

const ImportTraceRow: Component<{
  trace: ExportedTrace;
  isSelected: boolean;
  onSelect: (id: string) => void;
}> = (props) => {
  const duration = () => props.trace.duration?.toFixed(0) ?? "...";
  const response = () =>
    props.trace.response as Record<string, unknown> | undefined;
  const isAborted = () => !!response()?.aborted;
  const hasError = () => !!response()?.error && !isAborted();

  const statusClass = () => {
    if (isAborted()) return "aborted";
    if (hasError()) return "error";
    return "success";
  };

  const parsed = () => parseQueryKey(props.trace.queryKey);
  const timestamp = () => formatTime(props.trace.timestamp);

  const statusBorderClass = () => {
    const cls = statusClass();
    if (cls === "error") return "border-l-spoosh-error";
    if (cls === "aborted") return "border-l-spoosh-warning";
    return "border-l-spoosh-success";
  };

  return (
    <div
      class={`px-3 py-2 cursor-pointer border-b border-spoosh-border border-l-2 hover:bg-spoosh-hover transition-colors ${statusBorderClass()} ${props.isSelected ? "bg-spoosh-hover" : ""}`}
      onClick={() => props.onSelect(props.trace.id)}
    >
      <div class="flex items-center gap-2 mb-1">
        <span
          class={`px-1.5 py-0.5 text-2xs font-semibold rounded uppercase method-${props.trace.method}`}
        >
          {props.trace.method}
        </span>
        <span class="text-xs text-spoosh-text truncate flex-1">
          {props.trace.path}
          {parsed().queryParams && (
            <span class="text-spoosh-text-muted">?{parsed().queryParams}</span>
          )}
        </span>
      </div>
      <div class="flex items-center justify-between text-2xs text-spoosh-text-muted">
        <span>{timestamp()}</span>
        <span
          class={`${hasError() ? "text-spoosh-error" : isAborted() ? "text-spoosh-warning" : ""}`}
        >
          {duration()}ms
        </span>
      </div>
    </div>
  );
};

const ImportSSERow: Component<{
  sub: ExportedSSE;
  isSelected: boolean;
  onSelect: (id: string) => void;
}> = (props) => {
  const statusClass = () => getSSEStatusClass(props.sub.status);
  const duration = () => getSSEDuration(props.sub);
  const timestamp = () => formatTime(props.sub.timestamp);

  const statusBorderClass = () => {
    const cls = statusClass();
    if (cls === "error") return "border-l-spoosh-error";
    if (cls === "pending") return "border-l-spoosh-primary";
    if (cls === "success") return "border-l-spoosh-success";
    return "border-l-spoosh-text-muted";
  };

  return (
    <div
      class={`px-3 py-2 cursor-pointer border-b border-spoosh-border border-l-2 hover:bg-spoosh-hover transition-colors ${statusBorderClass()} ${props.isSelected ? "bg-spoosh-hover" : ""}`}
      onClick={() => props.onSelect(props.sub.id)}
    >
      <div class="flex items-center gap-2 mb-1">
        <span class="px-1.5 py-0.5 text-2xs font-semibold rounded uppercase method-sse">
          SSE
        </span>
        <span class="text-xs text-spoosh-text truncate flex-1">
          {props.sub.channel}
        </span>
      </div>
      <div class="flex items-center justify-between text-2xs text-spoosh-text-muted">
        <span>{timestamp()}</span>
        <span>
          {props.sub.messageCount} msgs &middot; {duration()}
        </span>
      </div>
    </div>
  );
};

export const ImportList: Component<ImportListProps> = (props) => {
  const hasItems = () => props.items.length > 0;

  const reversedItems = () => [...props.items].reverse();

  return (
    <div class="flex-1 overflow-y-auto">
      <Show
        when={hasItems()}
        fallback={
          <div class="flex flex-col items-center justify-center h-full p-8 text-center">
            <div class="text-spoosh-text-muted mb-4">
              <UploadIcon />
            </div>
            <p class="text-sm text-spoosh-text mb-1">
              Import previously exported traces
            </p>
            <p class="text-xs text-spoosh-text-muted mb-4">
              Load a JSON file exported from Spoosh DevTool
            </p>
            <button
              class="px-4 py-2 text-sm font-medium rounded bg-spoosh-primary text-white hover:bg-spoosh-primary/80 transition-colors"
              onClick={props.onImportFile}
            >
              Import File
            </button>
          </div>
        }
      >
        <For each={reversedItems()}>
          {(item) => (
            <Show
              when={item.type === "sse"}
              fallback={
                <ImportTraceRow
                  trace={item as ExportedTrace}
                  isSelected={item.id === props.selectedId}
                  onSelect={props.onSelect}
                />
              }
            >
              <ImportSSERow
                sub={item as ExportedSSE}
                isSelected={item.id === props.selectedId}
                onSelect={props.onSelect}
              />
            </Show>
          )}
        </For>
      </Show>
    </div>
  );
};
