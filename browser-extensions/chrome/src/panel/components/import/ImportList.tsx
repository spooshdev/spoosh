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

  const parsed = () => parseQueryKey(props.trace.queryKey);
  const timestamp = () => formatTime(props.trace.timestamp);

  const cardClasses = () => {
    const base = "px-3 py-2 cursor-pointer border-l-2 transition-all";

    // Error state styling
    if (hasError()) {
      if (props.isSelected) {
        return `${base} bg-spoosh-error/15 border-l-spoosh-error shadow-[inset_0_0_0_1px_rgba(248,81,73,0.3)]`;
      }
      return `${base} bg-spoosh-error/5 border-l-spoosh-error hover:bg-spoosh-error/10`;
    }

    // Aborted state styling
    if (isAborted()) {
      if (props.isSelected) {
        return `${base} bg-spoosh-warning/15 border-l-spoosh-warning shadow-[inset_0_0_0_1px_rgba(210,153,34,0.3)]`;
      }
      return `${base} bg-spoosh-warning/5 border-l-spoosh-warning hover:bg-spoosh-warning/10`;
    }

    // Success/normal state styling
    if (props.isSelected) {
      return `${base} bg-spoosh-primary/15 border-l-spoosh-primary shadow-[inset_0_0_0_1px_rgba(88,166,255,0.3)]`;
    }

    return `${base} border-l-transparent hover:bg-spoosh-surface`;
  };

  return (
    <div class={cardClasses()} onClick={() => props.onSelect(props.trace.id)}>
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
  const duration = () => getSSEDuration(props.sub);
  const timestamp = () => formatTime(props.sub.timestamp);

  const hasError = () => props.sub.status === "error";
  const isConnecting = () => props.sub.status === "connecting";
  const isConnected = () => props.sub.status === "connected";

  const cardClasses = () => {
    const base = "px-3 py-2 cursor-pointer border-l-2 transition-all";

    // Error state styling
    if (hasError()) {
      if (props.isSelected) {
        return `${base} bg-spoosh-error/15 border-l-spoosh-error shadow-[inset_0_0_0_1px_rgba(248,81,73,0.3)]`;
      }
      return `${base} bg-spoosh-error/5 border-l-spoosh-error hover:bg-spoosh-error/10`;
    }

    // Connecting state styling
    if (isConnecting()) {
      if (props.isSelected) {
        return `${base} bg-spoosh-primary/15 border-l-spoosh-primary shadow-[inset_0_0_0_1px_rgba(88,166,255,0.3)]`;
      }
      return `${base} border-l-spoosh-primary hover:bg-spoosh-surface`;
    }

    // Connected state styling (active connections)
    if (isConnected()) {
      if (props.isSelected) {
        return `${base} bg-spoosh-success/15 border-l-spoosh-success shadow-[inset_0_0_0_1px_rgba(63,185,80,0.3)]`;
      }
      return `${base} border-l-spoosh-success hover:bg-spoosh-surface`;
    }

    // Disconnected/normal state styling
    if (props.isSelected) {
      return `${base} bg-spoosh-primary/15 border-l-spoosh-primary shadow-[inset_0_0_0_1px_rgba(88,166,255,0.3)]`;
    }

    return `${base} border-l-transparent hover:bg-spoosh-surface`;
  };

  return (
    <div class={cardClasses()} onClick={() => props.onSelect(props.sub.id)}>
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
        <div class="divide-y divide-spoosh-border">
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
        </div>
      </Show>
    </div>
  );
};
