import { type Component } from "solid-js";
import type { CacheEntryDisplay, InternalTab } from "@devtool/types";
import type { ViewState } from "../../App";
import { useStore } from "../../store";
import { StateList } from "./StateList";
import { StateDetail } from "./StateDetail";
import { ResizeHandle } from "../layout/ResizeHandle";

type Actions = {
  selectStateEntry: (key: string | null) => void;
  updateViewState: <K extends keyof ViewState>(
    key: K,
    value: ViewState[K]
  ) => void;
  toggleJsonPath: (contextId: string, path: string) => void;
};

interface StateViewProps {
  viewState: ViewState;
  actions: Actions;
}

export const StateView: Component<StateViewProps> = (props) => {
  const store = useStore();

  const entries = (): CacheEntryDisplay[] =>
    store.getCacheEntries(props.viewState.searchQuery);

  const selectedEntry = () => {
    if (!props.viewState.selectedStateKey) return null;
    return (
      entries().find((e) => e.queryKey === props.viewState.selectedStateKey) ??
      null
    );
  };

  const handleSelect = (key: string) => {
    props.actions.selectStateEntry(key);
  };

  const handleTabChange = (tab: InternalTab) => {
    props.actions.updateViewState("internalTab", tab);
  };

  const handleRefetch = (key: string) => {
    store.refetchStateEntry(key);
  };

  const handleDelete = (key: string) => {
    store.deleteCacheEntry(key);
    props.actions.selectStateEntry(null);
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
        <div
          class="px-3 py-2 text-xs font-medium text-spoosh-text-muted border-b border-spoosh-border border-l-2 border-l-[#14b8a6]"
          style={{
            background:
              "linear-gradient(90deg, rgba(20, 184, 166, 0.1) 0%, transparent 100%)",
          }}
        >
          Cache State
        </div>
        <StateList
          entries={entries()}
          selectedKey={props.viewState.selectedStateKey}
          onSelect={handleSelect}
        />
      </div>

      <ResizeHandle onResize={handleResize} />

      <div class="flex-1 min-w-0 h-full">
        <StateDetail
          entry={selectedEntry()}
          activeTab={props.viewState.internalTab}
          onTabChange={handleTabChange}
          collapsedJsonPaths={props.viewState.collapsedJsonPaths}
          onToggleJsonPath={props.actions.toggleJsonPath}
          onRefetch={handleRefetch}
          onDelete={handleDelete}
        />
      </div>
    </div>
  );
};
