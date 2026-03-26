import {
  createContext,
  useContext,
  onCleanup,
  type ParentComponent,
} from "solid-js";
import { createStore, reconcile } from "solid-js/store";
import type { StandaloneEvent } from "@spoosh/core";
import type {
  DevToolFilters,
  OperationTrace,
  SubscriptionTrace,
  Trace,
  CacheEntryDisplay,
  ExportedItem,
  ImportedSession,
} from "@devtool/types";
import { RemoteStore, type ConnectionState } from "../../devtools/remote-store";

export interface AppState {
  connectionState: ConnectionState;
  traces: OperationTrace[];
  subscriptions: SubscriptionTrace[];
  events: StandaloneEvent[];
  cacheEntries: CacheEntryDisplay[];
  filters: DevToolFilters;
  knownPlugins: string[];
  totalTraceCount: number;
  activeCount: number;
  importedSession: ImportedSession | null;
  stepUpdateOnly: boolean;
}

const initialState: AppState = {
  connectionState: "connecting",
  traces: [],
  subscriptions: [],
  events: [],
  cacheEntries: [],
  filters: {
    operationTypes: new Set(),
    traceTypeFilter: "all",
    showSkipped: true,
    showOnlyWithChanges: false,
  },
  knownPlugins: [],
  totalTraceCount: 0,
  activeCount: 0,
  importedSession: null,
  stepUpdateOnly: false,
};

export interface StoreContextValue {
  state: AppState;
  remoteStore: RemoteStore;

  getAllTraces: (searchQuery?: string) => Trace[];
  getFilteredTraces: (searchQuery?: string) => OperationTrace[];
  getFilteredSubscriptions: (searchQuery?: string) => SubscriptionTrace[];
  getCacheEntries: (searchQuery?: string) => CacheEntryDisplay[];
  getFilteredImportedTraces: (searchQuery?: string) => ExportedItem[];
  getKnownPlugins: () => string[];

  clear: () => void;
  setFilter: <K extends keyof DevToolFilters>(
    key: K,
    value: DevToolFilters[K]
  ) => void;
  setMaxHistory: (value: number) => void;
  refetchStateEntry: (key: string) => void;
  deleteCacheEntry: (key: string) => void;
  clearAllCache: () => void;
  importTraces: (data: ExportedItem[], filename: string) => void;
  clearImportedTraces: () => void;
  exportTraces: () => void;
}

const StoreContext = createContext<StoreContextValue>();

export const StoreProvider: ParentComponent = (props) => {
  const tabId = chrome.devtools.inspectedWindow.tabId;
  const remoteStore = new RemoteStore(tabId);
  const [state, setState] = createStore<AppState>({ ...initialState });

  remoteStore.connect();

  const syncFromRemote = () => {
    // Create shallow copies to ensure reconcile detects changes
    // RemoteStore mutates traces in place, so we need new object references
    const traces = remoteStore
      .getTraces()
      .map((t) => ({ ...t, steps: [...t.steps] }));
    const subscriptions = remoteStore.getSubscriptions().map((s) => ({
      ...s,
      steps: [...s.steps],
      messages: [...s.messages],
    }));

    setState(
      reconcile({
        connectionState: remoteStore.state,
        traces,
        subscriptions,
        events: [...remoteStore.getEvents()],
        cacheEntries: remoteStore.getCacheEntries(),
        filters: remoteStore.getFilters(),
        knownPlugins: remoteStore.getKnownPlugins(),
        totalTraceCount: remoteStore.getTotalTraceCount(),
        activeCount: remoteStore.getActiveCount(),
        importedSession: remoteStore.getImportedSession(),
        stepUpdateOnly: remoteStore.isStepUpdateOnly(),
      })
    );
  };

  const unsubscribe = remoteStore.subscribe(syncFromRemote);

  onCleanup(() => {
    unsubscribe();
    remoteStore.disconnect();
  });

  const matchesSearch = (trace: Trace, query: string): boolean => {
    if (!query) return true;
    const lowerQuery = query.toLowerCase();

    if (trace.type === "subscription") {
      return (
        trace.channel.toLowerCase().includes(lowerQuery) ||
        trace.queryKey.toLowerCase().includes(lowerQuery)
      );
    }

    return (
      trace.path.toLowerCase().includes(lowerQuery) ||
      trace.queryKey.toLowerCase().includes(lowerQuery) ||
      trace.method.toLowerCase().includes(lowerQuery)
    );
  };

  const matchesFilters = (trace: Trace): boolean => {
    const filters = state.filters;

    if (filters.traceTypeFilter === "http" && trace.type === "subscription") {
      return false;
    }

    if (filters.traceTypeFilter === "sse" && trace.type !== "subscription") {
      return false;
    }

    if (trace.type !== "subscription" && filters.operationTypes.size > 0) {
      if (!filters.operationTypes.has(trace.operationType)) {
        return false;
      }
    }

    return true;
  };

  const getAllTraces = (searchQuery?: string): Trace[] => {
    const traces = state.traces as Trace[];
    const subscriptions = state.subscriptions as Trace[];
    const allTraces = [...traces, ...subscriptions];

    allTraces.sort((a, b) => b.timestamp - a.timestamp);

    return allTraces.filter(
      (t) => matchesFilters(t) && matchesSearch(t, searchQuery ?? "")
    );
  };

  const getFilteredTraces = (searchQuery?: string): OperationTrace[] => {
    return state.traces.filter(
      (t) => matchesFilters(t) && matchesSearch(t, searchQuery ?? "")
    );
  };

  const getFilteredSubscriptions = (
    searchQuery?: string
  ): SubscriptionTrace[] => {
    return state.subscriptions.filter(
      (t) => matchesFilters(t) && matchesSearch(t, searchQuery ?? "")
    );
  };

  const getCacheEntries = (searchQuery?: string): CacheEntryDisplay[] => {
    if (!searchQuery) return state.cacheEntries;

    const lowerQuery = searchQuery.toLowerCase();

    return state.cacheEntries.filter(
      (e) =>
        e.queryKey.toLowerCase().includes(lowerQuery) ||
        (e.resolvedPath && e.resolvedPath.toLowerCase().includes(lowerQuery))
    );
  };

  const getFilteredImportedTraces = (searchQuery?: string): ExportedItem[] => {
    const session = state.importedSession;
    if (!session) return [];

    if (!searchQuery) return session.items;

    const lowerQuery = searchQuery.toLowerCase();

    return session.items.filter((item) => {
      if (item.type === "sse") {
        return (
          item.channel.toLowerCase().includes(lowerQuery) ||
          item.queryKey.toLowerCase().includes(lowerQuery)
        );
      }

      return (
        item.path.toLowerCase().includes(lowerQuery) ||
        item.queryKey.toLowerCase().includes(lowerQuery)
      );
    });
  };

  const getKnownPlugins = (): string[] => {
    return state.knownPlugins;
  };

  const clear = () => {
    remoteStore.clear();
  };

  const setFilter = <K extends keyof DevToolFilters>(
    key: K,
    value: DevToolFilters[K]
  ) => {
    remoteStore.setFilter(key, value);
  };

  const setMaxHistory = (value: number) => {
    remoteStore.setMaxHistory(value);
  };

  const refetchStateEntry = (key: string) => {
    remoteStore.refetchStateEntry(key);
  };

  const deleteCacheEntry = (key: string) => {
    remoteStore.deleteCacheEntry(key);
  };

  const clearAllCache = () => {
    remoteStore.clearAllCache();
  };

  const importTraces = (data: ExportedItem[], filename: string) => {
    remoteStore.importTraces(data, filename);
  };

  const clearImportedTraces = () => {
    remoteStore.clearImportedTraces();
  };

  const exportTraces = () => {
    remoteStore.exportTraces();
  };

  const contextValue: StoreContextValue = {
    state,
    remoteStore,
    getAllTraces,
    getFilteredTraces,
    getFilteredSubscriptions,
    getCacheEntries,
    getFilteredImportedTraces,
    getKnownPlugins,
    clear,
    setFilter,
    setMaxHistory,
    refetchStateEntry,
    deleteCacheEntry,
    clearAllCache,
    importTraces,
    clearImportedTraces,
    exportTraces,
  };

  return (
    <StoreContext.Provider value={contextValue}>
      {props.children}
    </StoreContext.Provider>
  );
};

export const useStore = () => {
  const context = useContext(StoreContext);

  if (!context) {
    throw new Error("useStore must be used within a StoreProvider");
  }

  return context;
};
