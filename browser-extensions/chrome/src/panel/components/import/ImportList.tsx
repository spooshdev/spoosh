import { For, Show, type Component } from "solid-js";
import type {
  ExportedItem,
  ExportedTrace,
  ExportedSubscription,
  OperationTrace,
  SubscriptionTrace,
} from "@devtool/types";
import { TraceCard } from "../requests/TraceCard";
import { SubscriptionCard } from "../requests/SubscriptionCard";

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

function toOperationTrace(exported: ExportedTrace): OperationTrace {
  return { ...exported, addStep: () => {} } as unknown as OperationTrace;
}

function toSubscriptionTrace(
  exported: ExportedSubscription
): SubscriptionTrace {
  return {
    ...exported,
    error: exported.error ? new Error(exported.error.message) : undefined,
  };
}

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
                when={item.type === "subscription"}
                fallback={
                  <TraceCard
                    trace={toOperationTrace(item as ExportedTrace)}
                    selected={item.id === props.selectedId}
                    onClick={() => props.onSelect(item.id)}
                  />
                }
              >
                <SubscriptionCard
                  subscription={toSubscriptionTrace(
                    item as ExportedSubscription
                  )}
                  selected={item.id === props.selectedId}
                  onClick={() => props.onSelect(item.id)}
                />
              </Show>
            )}
          </For>
        </div>
      </Show>
    </div>
  );
};
