import type { OperationType } from "@spoosh/core";

import type { DevToolFilters, DevToolStoreInterface } from "../types";

export type DetailTab = "data" | "request" | "plugins";

export interface ViewModelState {
  isOpen: boolean;
  showSettings: boolean;
  selectedTraceId: string | null;
  activeTab: DetailTab;
  expandedSteps: ReadonlySet<string>;
  expandedGroups: ReadonlySet<string>;
  fullDiffViews: ReadonlySet<string>;
  showPassedPlugins: boolean;
  sidebarWidth: number;
  listPanelWidth: number;
  requestsPanelHeight: number;
  searchQuery: string;
}

type Listener = () => void;

const STORAGE_KEY = "spoosh-devtool-settings";

const DEFAULT_STATE: ViewModelState = {
  isOpen: false,
  showSettings: false,
  selectedTraceId: null,
  activeTab: "data",
  expandedSteps: new Set(),
  expandedGroups: new Set(),
  fullDiffViews: new Set(),
  showPassedPlugins: false,
  sidebarWidth: 700,
  listPanelWidth: 280,
  requestsPanelHeight: 0.8,
  searchQuery: "",
};

export interface ViewModel {
  getState(): Readonly<ViewModelState>;
  subscribe(listener: Listener): () => void;

  open(): void;
  close(): void;
  toggle(): void;
  toggleSettings(): void;

  selectTrace(traceId: string | null): void;
  setActiveTab(tab: DetailTab): void;

  toggleStep(stepKey: string): void;
  toggleGroup(groupKey: string): void;
  toggleDiffView(diffKey: string): void;
  togglePassedPlugins(): void;

  setSidebarWidth(width: number): void;
  setListPanelWidth(width: number): void;
  setRequestsPanelHeight(ratio: number): void;
  setSearchQuery(query: string): void;

  clearExpanded(): void;
  clearAll(store: DevToolStoreInterface): void;

  toggleFilter(filter: OperationType, store: DevToolStoreInterface): void;
  getFilters(store: DevToolStoreInterface): DevToolFilters;
}

export function createViewModel(): ViewModel {
  let state: ViewModelState = { ...DEFAULT_STATE };
  const listeners = new Set<Listener>();

  const mutableExpandedSteps = new Set<string>();
  const mutableExpandedGroups = new Set<string>();
  const mutableFullDiffViews = new Set<string>();

  state = {
    ...state,
    expandedSteps: mutableExpandedSteps,
    expandedGroups: mutableExpandedGroups,
    fullDiffViews: mutableFullDiffViews,
  };

  loadSettings();

  function loadSettings(): void {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);

      if (saved) {
        const settings = JSON.parse(saved);
        state = {
          ...state,
          showPassedPlugins: settings.showPassedPlugins ?? false,
          sidebarWidth: settings.sidebarWidth ?? DEFAULT_STATE.sidebarWidth,
          listPanelWidth:
            settings.listPanelWidth ?? DEFAULT_STATE.listPanelWidth,
          requestsPanelHeight:
            settings.requestsPanelHeight ?? DEFAULT_STATE.requestsPanelHeight,
        };
      }
    } catch {
      // Ignore localStorage errors
    }
  }

  let saveTimeout: ReturnType<typeof setTimeout> | null = null;

  function saveSettings(): void {
    if (saveTimeout) {
      clearTimeout(saveTimeout);
    }

    saveTimeout = setTimeout(() => {
      try {
        localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({
            showPassedPlugins: state.showPassedPlugins,
            sidebarWidth: state.sidebarWidth,
            listPanelWidth: state.listPanelWidth,
            requestsPanelHeight: state.requestsPanelHeight,
          })
        );
      } catch {
        // Ignore localStorage errors
      }
    }, 300);
  }

  function notify(): void {
    listeners.forEach((fn) => fn());
  }

  function getState(): Readonly<ViewModelState> {
    return state;
  }

  function subscribe(listener: Listener): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
  }

  function open(): void {
    state = { ...state, isOpen: true };
    notify();
  }

  function close(): void {
    state = { ...state, isOpen: false, showSettings: false };
    notify();
  }

  function toggle(): void {
    if (state.isOpen) {
      close();
    } else {
      open();
    }
  }

  function toggleSettings(): void {
    state = { ...state, showSettings: !state.showSettings };
    notify();
  }

  function selectTrace(traceId: string | null): void {
    mutableExpandedSteps.clear();
    state = { ...state, selectedTraceId: traceId, showSettings: false };
    notify();
  }

  function setActiveTab(tab: DetailTab): void {
    state = { ...state, activeTab: tab };
    notify();
  }

  function toggleStep(stepKey: string): void {
    if (mutableExpandedSteps.has(stepKey)) {
      mutableExpandedSteps.delete(stepKey);
    } else {
      mutableExpandedSteps.add(stepKey);
    }

    notify();
  }

  function toggleGroup(groupKey: string): void {
    if (mutableExpandedGroups.has(groupKey)) {
      mutableExpandedGroups.delete(groupKey);
    } else {
      mutableExpandedGroups.add(groupKey);
    }

    notify();
  }

  function toggleDiffView(diffKey: string): void {
    if (mutableFullDiffViews.has(diffKey)) {
      mutableFullDiffViews.delete(diffKey);
    } else {
      mutableFullDiffViews.add(diffKey);
    }

    notify();
  }

  function togglePassedPlugins(): void {
    state = { ...state, showPassedPlugins: !state.showPassedPlugins };
    saveSettings();
    notify();
  }

  function setSidebarWidth(width: number): void {
    state = { ...state, sidebarWidth: width };
    saveSettings();
  }

  function setListPanelWidth(width: number): void {
    state = { ...state, listPanelWidth: width };
    saveSettings();
  }

  function setRequestsPanelHeight(ratio: number): void {
    state = { ...state, requestsPanelHeight: ratio };
    saveSettings();
  }

  function setSearchQuery(query: string): void {
    state = { ...state, searchQuery: query };
    notify();
  }

  function clearExpanded(): void {
    mutableExpandedSteps.clear();
    mutableExpandedGroups.clear();
    mutableFullDiffViews.clear();
  }

  function clearAll(store: DevToolStoreInterface): void {
    store.clear();
    state = { ...state, selectedTraceId: null };
    clearExpanded();
    notify();
  }

  function toggleFilter(
    filter: OperationType,
    store: DevToolStoreInterface
  ): void {
    const filters = store.getFilters();
    const newTypes = new Set(filters.operationTypes);

    if (newTypes.has(filter)) {
      newTypes.delete(filter);
    } else {
      newTypes.add(filter);
    }

    store.setFilter("operationTypes", newTypes);
    notify();
  }

  function getFilters(store: DevToolStoreInterface): DevToolFilters {
    return store.getFilters();
  }

  return {
    getState,
    subscribe,
    open,
    close,
    toggle,
    toggleSettings,
    selectTrace,
    setActiveTab,
    toggleStep,
    toggleGroup,
    toggleDiffView,
    togglePassedPlugins,
    setSidebarWidth,
    setListPanelWidth,
    setRequestsPanelHeight,
    setSearchQuery,
    clearExpanded,
    clearAll,
    toggleFilter,
    getFilters,
  };
}
