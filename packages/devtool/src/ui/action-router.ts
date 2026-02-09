import type { OperationType } from "@spoosh/core";

import type { DevToolStoreInterface } from "../types";
import type { DetailTab, ViewModel } from "./view-model";

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
  | { type: "copy-query-key"; queryKey: string };

export interface ActionRouterCallbacks {
  onRender: () => void;
  onClose: () => void;
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
  const { onRender, onClose } = callbacks;
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

    if (action === "copy-query-key") {
      const queryKey = target
        .closest("[data-query-key]")
        ?.getAttribute("data-query-key");

      if (queryKey) {
        return { type: "copy-query-key", queryKey };
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

    if (setting) {
      const checkbox = target as HTMLInputElement;
      return { type: "change-setting", setting, value: checkbox.checked };
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

      case "copy-query-key":
        navigator.clipboard.writeText(intent.queryKey);
        return;
    }

    onRender();
  }

  return {
    parseIntent,
    dispatch,
  };
}
