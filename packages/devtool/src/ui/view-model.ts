import type { OperationType } from "@spoosh/core";

import type { DevToolFilters, DevToolStoreInterface } from "../types";

export type DetailTab = "data" | "request" | "meta" | "plugins";
export type ThemeMode = "light" | "dark";
export type PositionMode =
  | "bottom-right"
  | "bottom-left"
  | "top-right"
  | "top-left";
export type PanelView = "requests" | "state" | "import";
export type InternalTab = "data" | "meta" | "raw";
export type SidebarPosition = "left" | "right" | "bottom";

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
  sidebarHeight: number;
  listPanelWidth: number;
  requestsPanelHeight: number;
  searchQuery: string;
  theme: ThemeMode;
  position: PositionMode;
  sidebarPosition: SidebarPosition;
  activeView: PanelView;
  selectedStateKey: string | null;
  internalTab: InternalTab;
  maxHistory: number;
  selectedImportedTraceId: string | null;
  importedSearchQuery: string;
  autoSelectIncoming: boolean;
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
  sidebarHeight: 400,
  listPanelWidth: 280,
  requestsPanelHeight: 0.8,
  searchQuery: "",
  theme: "dark",
  position: "bottom-right",
  sidebarPosition: "right",
  activeView: "requests",
  selectedStateKey: null,
  internalTab: "data",
  maxHistory: 50,
  selectedImportedTraceId: null,
  importedSearchQuery: "",
  autoSelectIncoming: false,
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
  setTheme(theme: ThemeMode): void;
  setPosition(position: PositionMode): void;
  setSidebarPosition(position: SidebarPosition): void;

  setSidebarWidth(width: number): void;
  setSidebarHeight(height: number): void;
  setListPanelWidth(width: number): void;
  setRequestsPanelHeight(ratio: number): void;
  setSearchQuery(query: string): void;

  clearExpanded(): void;
  clearAll(store: DevToolStoreInterface): void;

  toggleFilter(filter: OperationType, store: DevToolStoreInterface): void;
  getFilters(store: DevToolStoreInterface): DevToolFilters;

  setActiveView(view: PanelView): void;
  selectStateEntry(key: string | null): void;
  setInternalTab(tab: InternalTab): void;
  setMaxHistory(value: number): void;
  getMaxHistory(): number;
  selectImportedTrace(traceId: string | null): void;
  setImportedSearchQuery(query: string): void;
  toggleAutoSelectIncoming(): void;
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
          sidebarHeight: settings.sidebarHeight ?? DEFAULT_STATE.sidebarHeight,
          listPanelWidth:
            settings.listPanelWidth ?? DEFAULT_STATE.listPanelWidth,
          requestsPanelHeight:
            settings.requestsPanelHeight ?? DEFAULT_STATE.requestsPanelHeight,
          theme: settings.theme ?? DEFAULT_STATE.theme,
          position: settings.position ?? DEFAULT_STATE.position,
          sidebarPosition:
            settings.sidebarPosition ?? DEFAULT_STATE.sidebarPosition,
          maxHistory: settings.maxHistory ?? DEFAULT_STATE.maxHistory,
          autoSelectIncoming:
            settings.autoSelectIncoming ?? DEFAULT_STATE.autoSelectIncoming,
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
            sidebarHeight: state.sidebarHeight,
            listPanelWidth: state.listPanelWidth,
            requestsPanelHeight: state.requestsPanelHeight,
            theme: state.theme,
            position: state.position,
            sidebarPosition: state.sidebarPosition,
            maxHistory: state.maxHistory,
            autoSelectIncoming: state.autoSelectIncoming,
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

  function setSidebarHeight(height: number): void {
    state = { ...state, sidebarHeight: height };
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

  function setTheme(theme: ThemeMode): void {
    state = { ...state, theme };
    saveSettings();
    notify();
  }

  function setPosition(position: PositionMode): void {
    state = { ...state, position };
    saveSettings();
    notify();
  }

  function setSidebarPosition(position: SidebarPosition): void {
    state = { ...state, sidebarPosition: position };
    saveSettings();
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

  function setActiveView(view: PanelView): void {
    state = { ...state, activeView: view };
    notify();
  }

  function selectStateEntry(key: string | null): void {
    state = { ...state, selectedStateKey: key };
    notify();
  }

  function setInternalTab(tab: InternalTab): void {
    state = { ...state, internalTab: tab };
    notify();
  }

  function setMaxHistory(value: number): void {
    state = { ...state, maxHistory: value };
    saveSettings();
    notify();
  }

  function getMaxHistory(): number {
    return state.maxHistory;
  }

  function selectImportedTrace(traceId: string | null): void {
    state = { ...state, selectedImportedTraceId: traceId };
    notify();
  }

  function setImportedSearchQuery(query: string): void {
    state = { ...state, importedSearchQuery: query };
    notify();
  }

  function toggleAutoSelectIncoming(): void {
    state = { ...state, autoSelectIncoming: !state.autoSelectIncoming };
    saveSettings();
    notify();
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
    setTheme,
    setPosition,
    setSidebarPosition,
    setSidebarWidth,
    setSidebarHeight,
    setListPanelWidth,
    setRequestsPanelHeight,
    setSearchQuery,
    clearExpanded,
    clearAll,
    toggleFilter,
    getFilters,
    setActiveView,
    selectStateEntry,
    setInternalTab,
    setMaxHistory,
    getMaxHistory,
    selectImportedTrace,
    setImportedSearchQuery,
    toggleAutoSelectIncoming,
  };
}
