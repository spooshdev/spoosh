import type { OperationTrace } from "../../types";
import type {
  DetailTab,
  PositionMode,
  SidebarPosition,
  ThemeMode,
} from "../view-model";
import { escapeHtml, formatTime } from "../utils";
import { renderSettings } from "./settings";
import {
  renderDataTab,
  renderRequestTab,
  renderMetaTab,
  renderPluginsTab,
  getMetaCount,
} from "./tabs";

export interface DetailPanelContext {
  trace: OperationTrace | null;
  showSettings: boolean;
  activeTab: DetailTab;
  showPassedPlugins: boolean;
  expandedSteps: ReadonlySet<string>;
  expandedGroups: ReadonlySet<string>;
  fullDiffViews: ReadonlySet<string>;
  knownPlugins: string[];
  theme: ThemeMode;
  position: PositionMode;
  sidebarPosition: SidebarPosition;
  maxHistory: number;
  autoSelectIncoming: boolean;
  sensitiveHeaders: Set<string>;
}

function getActivePluginCount(trace: OperationTrace): number {
  const activePlugins = new Set(
    trace.steps
      .filter((step) => step.stage !== "skip" && step.plugin !== "spoosh:fetch")
      .map((step) => step.plugin)
  );
  return activePlugins.size;
}

function renderTabContent(ctx: DetailPanelContext): string {
  const {
    trace,
    activeTab,
    showPassedPlugins,
    expandedSteps,
    expandedGroups,
    fullDiffViews,
    knownPlugins,
  } = ctx;

  if (!trace) return "";

  switch (activeTab) {
    case "data":
      return renderDataTab(trace);
    case "request":
      return renderRequestTab(trace, ctx.sensitiveHeaders);
    case "meta":
      return renderMetaTab(trace);
    case "plugins":
      return renderPluginsTab({
        trace,
        knownPlugins,
        showPassedPlugins,
        expandedSteps,
        expandedGroups,
        fullDiffViews,
      });
    default:
      return "";
  }
}

export function renderDetailPanel(ctx: DetailPanelContext): string {
  const {
    trace,
    showSettings,
    activeTab,
    showPassedPlugins,
    theme,
    position,
    sidebarPosition,
    maxHistory,
    autoSelectIncoming,
  } = ctx;

  if (showSettings) {
    return renderSettings({
      showPassedPlugins,
      theme,
      position,
      sidebarPosition,
      maxHistory,
      autoSelectIncoming,
    });
  }

  if (!trace) {
    return `
      <div class="spoosh-detail-panel">
        <div class="spoosh-detail-empty">
          <div class="spoosh-detail-empty-icon">📋</div>
          <div>Select a request to view details</div>
        </div>
      </div>
    `;
  }

  const isPending = trace.duration === undefined;
  const hasError = !!trace.response?.error;
  const statusClass = isPending ? "pending" : hasError ? "error" : "success";
  const statusLabel = isPending ? "Pending" : hasError ? "Error" : "Success";
  const pluginCount = getActivePluginCount(trace);

  return `
    <div class="spoosh-detail-panel">
      <div class="spoosh-detail-header">
        <div class="spoosh-detail-title">
          <span class="spoosh-trace-method method-${trace.method}">${trace.method}</span>
          <span class="spoosh-detail-path">${escapeHtml(trace.path)}</span>
        </div>
        <div class="spoosh-detail-meta">
          <span class="spoosh-badge ${statusClass}">${statusLabel}</span>
          <span class="spoosh-badge neutral">${trace.duration?.toFixed(0) ?? "..."}ms</span>
          <span class="spoosh-badge neutral">${formatTime(trace.timestamp)}</span>
        </div>
      </div>

      <div class="spoosh-tabs">
        <button class="spoosh-tab ${activeTab === "data" ? "active" : ""}" data-tab="data">
          ${isPending ? "Fetching" : hasError ? "Error" : "Data"}
        </button>
        <button class="spoosh-tab ${activeTab === "request" ? "active" : ""}" data-tab="request">
          Request
        </button>
        <button class="spoosh-tab ${activeTab === "meta" ? "active" : ""}" data-tab="meta">
          Meta${getMetaCount(trace) > 0 ? ` (${getMetaCount(trace)})` : ""}
        </button>
        <button class="spoosh-tab ${activeTab === "plugins" ? "active" : ""}" data-tab="plugins">
          Plugins ${pluginCount > 0 ? `(${pluginCount})` : ""}
        </button>
      </div>

      <div class="spoosh-tab-content">
        ${renderTabContent(ctx)}
      </div>
    </div>
  `;
}

export function renderEmptyDetail(
  showSettings: boolean,
  showPassedPlugins: boolean,
  theme: ThemeMode,
  position: PositionMode,
  sidebarPosition: SidebarPosition,
  maxHistory: number,
  autoSelectIncoming: boolean
): string {
  if (showSettings) {
    return renderSettings({
      showPassedPlugins,
      theme,
      position,
      sidebarPosition,
      maxHistory,
      autoSelectIncoming,
    });
  }

  return `
    <div class="spoosh-detail-panel">
      <div class="spoosh-detail-empty">
        <div class="spoosh-detail-empty-icon">📋</div>
        <div>Select a request to view details</div>
      </div>
    </div>
  `;
}
