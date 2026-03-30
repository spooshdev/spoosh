import { onMount, onCleanup, type Accessor } from "solid-js";
import type { ViewState } from "../App";
import type { StoreContextValue } from "../store";
import type { ThemeMode } from "../types";

interface UseKeyboardShortcutsProps {
  viewState: Accessor<ViewState>;
  actions: {
    updateViewState: <K extends keyof ViewState>(
      key: K,
      value: ViewState[K]
    ) => void;
    selectTrace: (traceId: string | null) => void;
    selectSubscription: (subscriptionId: string | null) => void;
    selectStateEntry: (key: string | null) => void;
    selectImportedTrace: (traceId: string | null) => void;
    clearAll: () => void;
    handleExport: () => void;
    setTheme: (theme: ThemeMode) => void;
  };
  store: StoreContextValue;
}

export function useKeyboardShortcuts({
  viewState,
  actions,
  store,
}: UseKeyboardShortcutsProps) {
  let searchInputRef: HTMLInputElement | null = null;

  const handleKeyDown = (e: KeyboardEvent) => {
    const isMod = e.metaKey || e.ctrlKey;
    const target = e.target as HTMLElement;
    const isInputFocused =
      target.tagName === "INPUT" || target.tagName === "TEXTAREA";

    if (isMod && e.key === "k") {
      e.preventDefault();
      searchInputRef = document.querySelector(".search-input");
      searchInputRef?.focus();
      return;
    }

    if (isMod && e.key === "e") {
      e.preventDefault();
      actions.handleExport();
      return;
    }

    if (isMod && e.key === "l") {
      e.preventDefault();
      actions.clearAll();
      return;
    }

    if (e.key === "1" && !isInputFocused) {
      e.preventDefault();
      actions.updateViewState("activeView", "requests");
      return;
    }

    if (e.key === "2" && !isInputFocused) {
      e.preventDefault();
      actions.updateViewState("activeView", "state");
      return;
    }

    if (e.key === "3" && !isInputFocused) {
      e.preventDefault();
      actions.updateViewState("activeView", "import");
      return;
    }

    if (isInputFocused) return;

    if (e.key === "ArrowUp" || e.key === "ArrowDown") {
      e.preventDefault();
      navigateItems(e.key === "ArrowUp" ? -1 : 1);
      return;
    }
  };

  const navigateItems = (direction: -1 | 1) => {
    const state = viewState();

    if (state.activeView === "requests") {
      const allTraces = store.getAllTraces(state.searchQuery);

      if (allTraces.length === 0) return;

      const currentIndex = state.selectedTraceId
        ? allTraces.findIndex(
            (t: { id: string }) => t.id === state.selectedTraceId
          )
        : -1;

      let newIndex = currentIndex + direction;

      if (newIndex < 0) newIndex = 0;
      if (newIndex >= allTraces.length) newIndex = allTraces.length - 1;

      const trace = allTraces[newIndex];

      if (trace) {
        if (trace.type === "subscription") {
          actions.selectSubscription(trace.id);
        } else {
          actions.selectTrace(trace.id);
        }

        scrollToSelected(".trace-card.selected");
      }
    } else if (state.activeView === "state") {
      const entries = store.getCacheEntries(state.searchQuery);

      if (entries.length === 0) return;

      const currentIndex = state.selectedStateKey
        ? entries.findIndex(
            (e: { queryKey: string }) => e.queryKey === state.selectedStateKey
          )
        : -1;

      let newIndex = currentIndex + direction;

      if (newIndex < 0) newIndex = 0;
      if (newIndex >= entries.length) newIndex = entries.length - 1;

      const entry = entries[newIndex];

      if (entry) {
        actions.selectStateEntry(entry.queryKey);
        scrollToSelected(".state-entry.selected");
      }
    } else if (state.activeView === "import") {
      const traces = store.getFilteredImportedTraces(state.importedSearchQuery);

      if (traces.length === 0) return;

      const currentIndex = state.selectedImportedTraceId
        ? traces.findIndex(
            (t: { id: string }) => t.id === state.selectedImportedTraceId
          )
        : -1;

      let newIndex = currentIndex + direction;

      if (newIndex < 0) newIndex = 0;
      if (newIndex >= traces.length) newIndex = traces.length - 1;

      const trace = traces[newIndex];

      if (trace) {
        actions.selectImportedTrace(trace.id);
        scrollToSelected(".trace-card.selected");
      }
    }
  };

  const scrollToSelected = (selector: string) => {
    requestAnimationFrame(() => {
      const selected = document.querySelector(selector);
      selected?.scrollIntoView({ block: "nearest" });
    });
  };

  onMount(() => {
    document.addEventListener("keydown", handleKeyDown);
  });

  onCleanup(() => {
    document.removeEventListener("keydown", handleKeyDown);
  });
}
