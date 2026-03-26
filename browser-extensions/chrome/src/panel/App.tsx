import { createSignal, createEffect, Show, type Component } from "solid-js";
import { useStore } from "./store";
import { useChromeStorage } from "./hooks/useChromeStorage";
import { useKeyboardShortcuts } from "./hooks/useKeyboardShortcuts";
import { Panel } from "./components/layout/Panel";
import { BottomBar } from "./components/layout/BottomBar";
import { NotDetected } from "./components/shared/NotDetected";
import { Connecting } from "./components/shared/Connecting";
import type {
  PanelView,
  DetailTab,
  InternalTab,
  TraceTypeFilter,
} from "@devtool/types";
import type { SubscriptionDetailTab, ThemeMode } from "./types";

export interface ViewState {
  activeView: PanelView;
  selectedTraceId: string | null;
  selectedSubscriptionId: string | null;
  selectedStateKey: string | null;
  selectedImportedTraceId: string | null;
  selectedMessageId: string | null;
  activeTab: DetailTab;
  subscriptionTab: SubscriptionDetailTab;
  internalTab: InternalTab;
  searchQuery: string;
  importedSearchQuery: string;
  showSettings: boolean;
  showPassedPlugins: boolean;
  expandedSteps: Set<string>;
  expandedGroups: Set<string>;
  fullDiffViews: Set<string>;
  expandedEventTypes: Set<string>;
  showUnlistenedEvents: boolean;
  collapsedJsonPaths: Map<string, Set<string>>;
  listPanelWidth: number;
  requestsPanelHeight: number;
  traceTypeFilter: TraceTypeFilter;
  autoSelectIncoming: boolean;
}

const DEFAULT_VIEW_STATE: ViewState = {
  activeView: "requests",
  selectedTraceId: null,
  selectedSubscriptionId: null,
  selectedStateKey: null,
  selectedImportedTraceId: null,
  selectedMessageId: null,
  activeTab: "data",
  subscriptionTab: "messages",
  internalTab: "data",
  searchQuery: "",
  importedSearchQuery: "",
  showSettings: false,
  showPassedPlugins: false,
  expandedSteps: new Set(),
  expandedGroups: new Set(),
  fullDiffViews: new Set(),
  expandedEventTypes: new Set(),
  showUnlistenedEvents: false,
  collapsedJsonPaths: new Map(),
  listPanelWidth: 280,
  requestsPanelHeight: 0.8,
  traceTypeFilter: "all",
  autoSelectIncoming: false,
};

export const App: Component = () => {
  const store = useStore();
  const [theme, setTheme] = useChromeStorage<ThemeMode>("theme", "dark");
  const [maxHistory, setMaxHistory] = useChromeStorage<number>(
    "maxHistory",
    50
  );
  const [savedShowPassedPlugins, setSavedShowPassedPlugins] =
    useChromeStorage<boolean>("showPassedPlugins", false);
  const [savedAutoSelectIncoming, setSavedAutoSelectIncoming] =
    useChromeStorage<boolean>("autoSelectIncoming", false);
  const [savedListPanelWidth, setSavedListPanelWidth] =
    useChromeStorage<number>("listPanelWidth", 280);
  const [savedRequestsPanelHeight, setSavedRequestsPanelHeight] =
    useChromeStorage<number>("requestsPanelHeight", 0.8);

  const [viewState, setViewState] = createSignal<ViewState>({
    ...DEFAULT_VIEW_STATE,
  });

  createEffect(() => {
    const showPassedPlugins = savedShowPassedPlugins();
    const autoSelectIncoming = savedAutoSelectIncoming();
    const listPanelWidth = savedListPanelWidth();
    const requestsPanelHeight = savedRequestsPanelHeight();

    if (showPassedPlugins !== undefined) {
      setViewState((s) => ({ ...s, showPassedPlugins }));
    }

    if (autoSelectIncoming !== undefined) {
      setViewState((s) => ({ ...s, autoSelectIncoming }));
    }

    if (listPanelWidth !== undefined) {
      setViewState((s) => ({ ...s, listPanelWidth }));
    }

    if (requestsPanelHeight !== undefined) {
      setViewState((s) => ({ ...s, requestsPanelHeight }));
    }
  });

  createEffect(() => {
    const currentTheme = theme();

    if (currentTheme === "light") {
      document.documentElement.classList.add("light");
    } else {
      document.documentElement.classList.remove("light");
    }
  });

  createEffect(() => {
    const max = maxHistory();

    if (max !== undefined) {
      store.setMaxHistory(max);
    }
  });

  const updateViewState = <K extends keyof ViewState>(
    key: K,
    value: ViewState[K]
  ) => {
    setViewState((s) => ({ ...s, [key]: value }));

    if (key === "showPassedPlugins") {
      setSavedShowPassedPlugins(value as boolean);
    } else if (key === "autoSelectIncoming") {
      setSavedAutoSelectIncoming(value as boolean);
    } else if (key === "listPanelWidth") {
      setSavedListPanelWidth(value as number);
    } else if (key === "requestsPanelHeight") {
      setSavedRequestsPanelHeight(value as number);
    }
  };

  const selectTrace = (traceId: string | null) => {
    setViewState((s) => ({
      ...s,
      selectedTraceId: traceId,
      selectedSubscriptionId: null,
      showSettings: false,
      expandedSteps: new Set(),
    }));
  };

  const selectSubscription = (subscriptionId: string | null) => {
    setViewState((s) => ({
      ...s,
      selectedSubscriptionId: subscriptionId,
      selectedTraceId: subscriptionId,
      selectedMessageId: null,
      showSettings: false,
      expandedSteps: new Set(),
      expandedEventTypes: new Set(),
    }));
  };

  const selectStateEntry = (key: string | null) => {
    setViewState((s) => ({ ...s, selectedStateKey: key }));
  };

  const selectImportedTrace = (traceId: string | null) => {
    setViewState((s) => ({ ...s, selectedImportedTraceId: traceId }));
  };

  const selectMessage = (messageId: string | null) => {
    const current = viewState().selectedMessageId;
    setViewState((s) => ({
      ...s,
      selectedMessageId: current === messageId ? null : messageId,
    }));
  };

  const toggleStep = (stepKey: string) => {
    setViewState((s) => {
      const newSet = new Set(s.expandedSteps);

      if (newSet.has(stepKey)) {
        newSet.delete(stepKey);
      } else {
        newSet.add(stepKey);
      }

      return { ...s, expandedSteps: newSet };
    });
  };

  const toggleGroup = (groupKey: string) => {
    setViewState((s) => {
      const newSet = new Set(s.expandedGroups);

      if (newSet.has(groupKey)) {
        newSet.delete(groupKey);
      } else {
        newSet.add(groupKey);
      }

      return { ...s, expandedGroups: newSet };
    });
  };

  const toggleDiffView = (diffKey: string) => {
    setViewState((s) => {
      const newSet = new Set(s.fullDiffViews);

      if (newSet.has(diffKey)) {
        newSet.delete(diffKey);
      } else {
        newSet.add(diffKey);
      }

      return { ...s, fullDiffViews: newSet };
    });
  };

  const toggleEventType = (eventType: string) => {
    setViewState((s) => {
      const newSet = new Set(s.expandedEventTypes);

      if (newSet.has(eventType)) {
        newSet.delete(eventType);
      } else {
        newSet.add(eventType);
      }

      return { ...s, expandedEventTypes: newSet };
    });
  };

  const toggleJsonPath = (contextId: string, path: string) => {
    setViewState((s) => {
      const newMap = new Map(s.collapsedJsonPaths);

      if (!newMap.has(contextId)) {
        newMap.set(contextId, new Set());
      }

      const paths = newMap.get(contextId)!;

      if (paths.has(path)) {
        paths.delete(path);
      } else {
        paths.add(path);
      }

      return { ...s, collapsedJsonPaths: newMap };
    });
  };

  const clearAll = () => {
    store.clear();
    setViewState((s) => ({
      ...s,
      selectedTraceId: null,
      selectedSubscriptionId: null,
      expandedSteps: new Set(),
      expandedGroups: new Set(),
      fullDiffViews: new Set(),
    }));
  };

  const handleExport = () => {
    store.exportTraces();
  };

  const actions = {
    updateViewState,
    selectTrace,
    selectSubscription,
    selectStateEntry,
    selectImportedTrace,
    selectMessage,
    toggleStep,
    toggleGroup,
    toggleDiffView,
    toggleEventType,
    toggleJsonPath,
    clearAll,
    handleExport,
    setTheme,
    setMaxHistory,
  };

  useKeyboardShortcuts({
    viewState,
    actions,
    store,
  });

  const connectionState = () => store.state.connectionState;
  const state = viewState;

  return (
    <>
      <Show
        when={
          connectionState() === "not_detected" &&
          state().activeView !== "import"
        }
      >
        <NotDetected
          onGoImport={() => updateViewState("activeView", "import")}
        />
        <BottomBar
          activeView={state().activeView}
          theme={theme()}
          onViewChange={(v) => updateViewState("activeView", v)}
          onThemeChange={setTheme}
        />
      </Show>

      <Show
        when={
          connectionState() === "connecting" && state().activeView !== "import"
        }
      >
        <Connecting />
        <BottomBar
          activeView={state().activeView}
          theme={theme()}
          onViewChange={(v) => updateViewState("activeView", v)}
          onThemeChange={setTheme}
        />
      </Show>

      <Show
        when={
          connectionState() === "connected" || state().activeView === "import"
        }
      >
        <Panel
          viewState={state()}
          actions={actions}
          theme={theme()}
          maxHistory={maxHistory()}
        />
        <BottomBar
          activeView={state().activeView}
          theme={theme()}
          onViewChange={(v) => updateViewState("activeView", v)}
          onThemeChange={setTheme}
        />
      </Show>
    </>
  );
};
