import { type Component } from "solid-js";
import type { ExportedItem } from "@devtool/types";
import type { ViewState } from "../../App";
import { useStore } from "../../store";
import { ImportList } from "./ImportList";
import { ImportDetail } from "./ImportDetail";

type Actions = {
  selectImportedTrace: (id: string | null) => void;
  updateViewState: <K extends keyof ViewState>(
    key: K,
    value: ViewState[K]
  ) => void;
  selectMessage: (messageId: string | null) => void;
  toggleEventType: (eventType: string) => void;
  toggleJsonPath: (contextId: string, path: string) => void;
};

interface ImportViewProps {
  viewState: ViewState;
  actions: Actions;
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

  return (
    <div class="flex h-full">
      <div class="w-[280px] border-r border-spoosh-border flex flex-col">
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

      <div class="flex-1 min-w-0">
        <ImportDetail
          item={selectedItem()}
          viewState={{
            activeTab: props.viewState.activeTab,
            subscriptionTab: props.viewState.subscriptionTab,
            selectedMessageId: props.viewState.selectedMessageId,
            expandedEventTypes: props.viewState.expandedEventTypes,
            collapsedJsonPaths: props.viewState.collapsedJsonPaths,
          }}
          actions={{
            updateViewState: props.actions.updateViewState as <
              K extends string,
            >(
              key: K,
              value: unknown
            ) => void,
            selectMessage: props.actions.selectMessage,
            toggleEventType: props.actions.toggleEventType,
            toggleJsonPath: props.actions.toggleJsonPath,
          }}
        />
      </div>
    </div>
  );
};
