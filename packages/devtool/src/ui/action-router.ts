import type { OperationType } from "@spoosh/core";

import type { DevToolStoreInterface } from "../types";
import type {
  DetailTab,
  InternalTab,
  PanelView,
  PositionMode,
  SidebarPosition,
  ThemeMode,
  ViewModel,
} from "./view-model";

export type ActionIntent =
  | { type: "close" }
  | { type: "settings" }
  | { type: "clear" }
  | { type: "export" }
  | { type: "select-trace"; traceId: string }
  | { type: "select-tab"; tab: DetailTab }
  | { type: "toggle-filter"; filter: OperationType }
  | { type: "toggle-step"; stepKey: string }
  | { type: "toggle-group"; groupKey: string }
  | { type: "toggle-diff-view"; diffKey: string }
  | { type: "toggle-passed" }
  | { type: "change-setting"; setting: string; value: boolean }
  | { type: "dismiss-settings" }
  | { type: "copy"; content: string }
  | { type: "search"; query: string }
  | { type: "change-theme"; theme: ThemeMode }
  | { type: "change-position"; position: PositionMode }
  | { type: "change-sidebar-position"; position: SidebarPosition }
  | { type: "change-max-history"; value: number }
  | { type: "switch-view"; view: PanelView }
  | { type: "select-state-entry"; key: string }
  | { type: "select-internal-tab"; tab: InternalTab }
  | { type: "refetch-state"; key: string }
  | { type: "delete-state"; key: string }
  | { type: "clear-all-state" }
  | { type: "import-file" }
  | { type: "select-imported-trace"; traceId: string }
  | { type: "clear-imports" }
  | { type: "import-search"; query: string };

export interface ActionRouterCallbacks {
  onRender: () => void;
  onPartialRender: () => void;
  onClose: () => void;
  onExport: () => void;
  onThemeChange: (theme: ThemeMode) => void;
  onPositionChange: (position: PositionMode) => void;
  onSidebarPositionChange: (position: SidebarPosition) => void;
  onMaxHistoryChange: (value: number) => void;
  onRefetchState?: (key: string) => void;
  onDeleteState?: (key: string) => void;
  onClearAllState?: () => void;
  onImportFile?: () => void;
  onClearImports?: () => void;
}

export interface ActionRouter {
  parseIntent(event: MouseEvent | Event): ActionIntent | null;
  dispatch(intent: ActionIntent): void;
}

export function createActionRouter(
  viewModel: ViewModel,
  store: DevToolStoreInterface,
  callbacks: ActionRouterCallbacks
): ActionRouter {
  const {
    onRender,
    onPartialRender,
    onClose,
    onExport,
    onThemeChange,
    onPositionChange,
    onSidebarPositionChange,
    onMaxHistoryChange,
    onRefetchState,
    onDeleteState,
    onClearAllState,
    onImportFile,
    onClearImports,
  } = callbacks;

  function parseIntent(event: MouseEvent | Event): ActionIntent | null {
    const target = event.target as HTMLElement;

    const action = target.closest("[data-action]")?.getAttribute("data-action");
    const filter = target.closest("[data-filter]")?.getAttribute("data-filter");
    const traceId = target
      .closest("[data-trace-id]")
      ?.getAttribute("data-trace-id");
    const stepKey = target
      .closest("[data-step-key]")
      ?.getAttribute("data-step-key");
    const groupKey = target
      .closest("[data-group-key]")
      ?.getAttribute("data-group-key");
    const tab = target.closest("[data-tab]")?.getAttribute("data-tab");
    const setting = target
      .closest("[data-setting]")
      ?.getAttribute("data-setting");

    if (action === "close") {
      return { type: "close" };
    }

    if (action === "settings") {
      return { type: "settings" };
    }

    if (action === "clear") {
      return { type: "clear" };
    }

    if (action === "export") {
      return { type: "export" };
    }

    if (action === "toggle-sensitive-header") {
      const wrap = target.closest(".spoosh-header-value-wrap");
      if (wrap) {
        wrap.classList.toggle("revealed");
      }
      return null;
    }

    if (action === "copy") {
      const content = target
        .closest("[data-copy-content]")
        ?.getAttribute("data-copy-content");

      if (content) {
        return { type: "copy", content };
      }
    }

    if (action === "toggle-step" && stepKey) {
      return { type: "toggle-step", stepKey };
    }

    if (action === "toggle-passed") {
      return { type: "toggle-passed" };
    }

    if (action === "toggle-group" && groupKey) {
      return { type: "toggle-group", groupKey };
    }

    if (action === "toggle-diff-view") {
      const diffKey = target
        .closest("[data-diff-key]")
        ?.getAttribute("data-diff-key");

      if (diffKey) {
        return { type: "toggle-diff-view", diffKey };
      }
    }

    const panelView = target.closest("[data-view]")?.getAttribute("data-view");

    if (panelView) {
      return { type: "switch-view", view: panelView as PanelView };
    }

    const stateKey = target
      .closest("[data-state-key]")
      ?.getAttribute("data-state-key");

    if (action === "refetch-state" && stateKey) {
      return { type: "refetch-state", key: stateKey };
    }

    if (action === "delete-state" && stateKey) {
      return { type: "delete-state", key: stateKey };
    }

    if (action === "clear-all-state") {
      return { type: "clear-all-state" };
    }

    if (action === "import-file") {
      return { type: "import-file" };
    }

    if (action === "clear-imports") {
      return { type: "clear-imports" };
    }

    const importedTraceId = target
      .closest("[data-imported-trace-id]")
      ?.getAttribute("data-imported-trace-id");

    if (importedTraceId) {
      return { type: "select-imported-trace", traceId: importedTraceId };
    }

    if (stateKey && !action) {
      return { type: "select-state-entry", key: stateKey };
    }

    const internalTab = target
      .closest("[data-internal-tab]")
      ?.getAttribute("data-internal-tab");

    if (internalTab) {
      return { type: "select-internal-tab", tab: internalTab as InternalTab };
    }

    if (tab) {
      return { type: "select-tab", tab: tab as DetailTab };
    }

    if (traceId && !action) {
      return { type: "select-trace", traceId };
    }

    if (filter) {
      return { type: "toggle-filter", filter: filter as OperationType };
    }

    const isInListPanel = target.closest(".spoosh-list-panel");
    const isOnSectionHeader = target.closest(".spoosh-section-header");

    if (
      isInListPanel &&
      isOnSectionHeader &&
      viewModel.getState().showSettings
    ) {
      return { type: "dismiss-settings" };
    }

    const isChangeEvent = event.type === "change";

    if (setting === "theme" && isChangeEvent) {
      const select = target as HTMLSelectElement;
      return { type: "change-theme", theme: select.value as ThemeMode };
    }

    if (setting === "position" && isChangeEvent) {
      const select = target as HTMLSelectElement;
      return {
        type: "change-position",
        position: select.value as PositionMode,
      };
    }

    if (setting === "sidebarPosition" && isChangeEvent) {
      const select = target as HTMLSelectElement;
      return {
        type: "change-sidebar-position",
        position: select.value as SidebarPosition,
      };
    }

    if (setting === "maxHistory" && isChangeEvent) {
      const select = target as HTMLSelectElement;
      return {
        type: "change-max-history",
        value: parseInt(select.value, 10),
      };
    }

    const sidebarAction = target
      .closest("[data-sidebar-position]")
      ?.getAttribute("data-sidebar-position");

    if (sidebarAction) {
      return {
        type: "change-sidebar-position",
        position: sidebarAction as SidebarPosition,
      };
    }

    const themeAction = target
      .closest("[data-theme]")
      ?.getAttribute("data-theme");

    if (themeAction) {
      return {
        type: "change-theme",
        theme: themeAction as ThemeMode,
      };
    }

    if (setting === "view" && isChangeEvent) {
      const select = target as HTMLSelectElement;
      return { type: "switch-view", view: select.value as PanelView };
    }

    if (setting && isChangeEvent) {
      const checkbox = target as HTMLInputElement;
      return { type: "change-setting", setting, value: checkbox.checked };
    }

    if (
      target.classList.contains("spoosh-search-input") &&
      event.type === "input"
    ) {
      const input = target as HTMLInputElement;

      if (viewModel.getState().activeView === "import") {
        return { type: "import-search", query: input.value };
      }

      return { type: "search", query: input.value };
    }

    return null;
  }

  function dispatch(intent: ActionIntent): void {
    switch (intent.type) {
      case "close":
        onClose();
        return;

      case "settings":
        viewModel.toggleSettings();
        break;

      case "clear":
        viewModel.clearAll(store);
        break;

      case "export":
        onExport();
        return;

      case "select-trace":
        viewModel.selectTrace(intent.traceId);
        break;

      case "select-tab":
        viewModel.setActiveTab(intent.tab);
        break;

      case "toggle-filter":
        viewModel.toggleFilter(intent.filter, store);
        break;

      case "toggle-step":
        viewModel.toggleStep(intent.stepKey);
        break;

      case "toggle-group":
        viewModel.toggleGroup(intent.groupKey);
        break;

      case "toggle-diff-view":
        viewModel.toggleDiffView(intent.diffKey);
        break;

      case "toggle-passed":
        viewModel.togglePassedPlugins();
        break;

      case "change-setting":
        if (intent.setting === "showPassedPlugins") {
          if (intent.value !== viewModel.getState().showPassedPlugins) {
            viewModel.togglePassedPlugins();
          }
        }

        if (intent.setting === "autoSelectIncoming") {
          if (intent.value !== viewModel.getState().autoSelectIncoming) {
            viewModel.toggleAutoSelectIncoming();
          }
        }

        break;

      case "dismiss-settings":
        if (viewModel.getState().showSettings) {
          viewModel.toggleSettings();
        }
        break;

      case "copy":
        navigator.clipboard.writeText(intent.content);
        return;

      case "search":
        viewModel.setSearchQuery(intent.query);
        onPartialRender();
        return;

      case "change-theme":
        viewModel.setTheme(intent.theme);
        onThemeChange(intent.theme);
        break;

      case "change-position":
        viewModel.setPosition(intent.position);
        onPositionChange(intent.position);
        return;

      case "change-sidebar-position":
        viewModel.setSidebarPosition(intent.position);
        onSidebarPositionChange(intent.position);
        break;

      case "change-max-history":
        viewModel.setMaxHistory(intent.value);
        onMaxHistoryChange(intent.value);
        break;

      case "switch-view":
        viewModel.setActiveView(intent.view);
        break;

      case "select-state-entry":
        viewModel.selectStateEntry(intent.key);
        break;

      case "select-internal-tab":
        viewModel.setInternalTab(intent.tab);
        break;

      case "refetch-state":
        onRefetchState?.(intent.key);
        break;

      case "delete-state":
        onDeleteState?.(intent.key);
        break;

      case "clear-all-state":
        onClearAllState?.();
        break;

      case "import-file":
        onImportFile?.();
        return;

      case "select-imported-trace":
        viewModel.selectImportedTrace(intent.traceId);
        break;

      case "clear-imports":
        onClearImports?.();
        break;

      case "import-search":
        viewModel.setImportedSearchQuery(intent.query);
        onPartialRender();
        return;
    }

    onRender();
  }

  return {
    parseIntent,
    dispatch,
  };
}
