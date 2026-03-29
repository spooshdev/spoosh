import { Show, type Component } from "solid-js";
import type {
  ExportedItem,
  ExportedTrace,
  ExportedSubscription,
  OperationTrace,
  SubscriptionTrace,
} from "@devtool/types";
import type { ViewState } from "../../App";
import type { PanelActions } from "../layout/Panel";
import { useStore } from "../../store";
import { ImportList } from "./ImportList";
import { TraceDetail } from "../detail/TraceDetail";
import { SubscriptionDetail } from "../subscription/SubscriptionDetail";
import { ResizeHandle } from "../layout/ResizeHandle";

interface ImportViewProps {
  viewState: ViewState;
  actions: PanelActions;
}

const DEFAULT_SENSITIVE_HEADERS = new Set([
  "authorization",
  "proxy-authorization",
  "cookie",
  "set-cookie",
  "x-api-key",
]);

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

export const ImportView: Component<ImportViewProps> = (props) => {
  const store = useStore();

  const items = (): ExportedItem[] =>
    store.getFilteredImportedTraces(props.viewState.importedSearchQuery);
  const session = () => store.state.importedSession;

  const selectedItem = () => {
    if (!props.viewState.selectedImportedTraceId) return null;

    return (
      items().find(
        (item) => item.id === props.viewState.selectedImportedTraceId
      ) ?? null
    );
  };

  const selectedTrace = (): OperationTrace | null => {
    const item = selectedItem();

    if (!item || item.type !== "request") return null;

    return toOperationTrace(item);
  };

  const selectedSubscription = (): SubscriptionTrace | null => {
    const item = selectedItem();

    if (!item || item.type !== "subscription") return null;

    return toSubscriptionTrace(item);
  };

  const handleSelect = (id: string) => {
    props.actions.selectImportedTrace(id);
  };

  const handleImportFile = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";

    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];

      if (!file) return;

      try {
        const text = await file.text();
        const data = JSON.parse(text) as ExportedItem[];
        store.importTraces(data, file.name);
      } catch {
        console.error("Failed to import file");
      }
    };

    input.click();
  };

  const handleResize = (delta: number) => {
    const currentWidth = props.viewState.listPanelWidth;
    const newWidth = Math.max(
      200,
      Math.min(currentWidth + delta, window.innerWidth / 2)
    );
    props.actions.updateViewState("listPanelWidth", newWidth);
  };

  return (
    <div class="flex h-full w-full">
      <div
        class="shrink-0 border-r border-spoosh-border flex flex-col"
        style={{ width: `${props.viewState.listPanelWidth}px` }}
      >
        <div class="px-3 py-2 text-xs font-medium text-spoosh-text-muted border-b border-spoosh-border bg-spoosh-surface/50 flex items-center justify-between">
          <span>Imported Traces</span>
          {session() && (
            <button
              class="text-2xs text-spoosh-primary hover:text-spoosh-primary/80"
              onClick={handleImportFile}
            >
              Import
            </button>
          )}
        </div>
        <ImportList
          items={items()}
          selectedId={props.viewState.selectedImportedTraceId}
          onSelect={handleSelect}
          onImportFile={handleImportFile}
        />
      </div>

      <ResizeHandle onResize={handleResize} />

      <div class="flex-1 min-w-0">
        <Show
          when={selectedItem()}
          fallback={
            <div class="flex flex-col items-center justify-center h-full text-spoosh-text-muted">
              <span class="text-2xl mb-2">&#x1F4CB;</span>
              <span class="text-sm">Select an imported trace to inspect</span>
            </div>
          }
        >
          <Show when={selectedSubscription()}>
            <SubscriptionDetail
              subscription={selectedSubscription()!}
              viewState={props.viewState}
              actions={props.actions}
              knownPlugins={store.state.knownPlugins}
            />
          </Show>

          <Show when={!selectedSubscription() && selectedTrace()}>
            <TraceDetail
              trace={selectedTrace()!}
              viewState={props.viewState}
              actions={props.actions}
              knownPlugins={store.state.knownPlugins}
              sensitiveHeaders={DEFAULT_SENSITIVE_HEADERS}
            />
          </Show>
        </Show>
      </div>
    </div>
  );
};
