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
  | { type: "switch-view"; view: PanelView }
  | { type: "select-cache-entry"; key: string }
  | { type: "select-internal-tab"; tab: InternalTab }
  | { type: "invalidate-cache"; key: string }
  | { type: "delete-cache"; key: string }
  | { type: "clear-all-cache" };

export interface ActionRouterCallbacks {
  onRender: () => void;
  onPartialRender: () => void;
  onClose: () => void;
  onThemeChange: (theme: ThemeMode) => void;
  onPositionChange: (position: PositionMode) => void;
  onSidebarPositionChange: (position: SidebarPosition) => void;
  onInvalidateCache?: (key: string) => void;
  onDeleteCache?: (key: string) => void;
  onClearAllCache?: () => void;
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
    onThemeChange,
    onPositionChange,
    onSidebarPositionChange,
    onInvalidateCache,
    onDeleteCache,
    onClearAllCache,
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

    const cacheKey = target
      .closest("[data-cache-key]")
      ?.getAttribute("data-cache-key");

    if (action === "invalidate-cache" && cacheKey) {
      return { type: "invalidate-cache", key: cacheKey };
    }

    if (action === "delete-cache" && cacheKey) {
      return { type: "delete-cache", key: cacheKey };
    }

    if (action === "clear-all-cache") {
      return { type: "clear-all-cache" };
    }

    if (cacheKey && !action) {
      return { type: "select-cache-entry", key: cacheKey };
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

    const sidebarAction = target
      .closest("[data-sidebar-position]")
      ?.getAttribute("data-sidebar-position");

    if (sidebarAction) {
      return {
        type: "change-sidebar-position",
        position: sidebarAction as SidebarPosition,
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
        return;

      case "change-position":
        viewModel.setPosition(intent.position);
        onPositionChange(intent.position);
        return;

      case "change-sidebar-position":
        viewModel.setSidebarPosition(intent.position);
        onSidebarPositionChange(intent.position);
        break;

      case "switch-view":
        viewModel.setActiveView(intent.view);
        break;

      case "select-cache-entry":
        viewModel.selectCacheEntry(intent.key);
        break;

      case "select-internal-tab":
        viewModel.setInternalTab(intent.tab);
        break;

      case "invalidate-cache":
        onInvalidateCache?.(intent.key);
        break;

      case "delete-cache":
        onDeleteCache?.(intent.key);
        break;

      case "clear-all-cache":
        onClearAllCache?.();
        break;
    }

    onRender();
  }

  return {
    parseIntent,
    dispatch,
  };
}
