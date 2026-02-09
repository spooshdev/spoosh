import type { OperationTrace } from "../../types";
import type { DetailTab, PositionMode, ThemeMode } from "../view-model";
import { escapeHtml, formatTime } from "../utils";
import { renderSettings } from "./settings";
import { renderDataTab, renderRequestTab, renderPluginsTab } from "./tabs";

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
}

function getActivePluginCount(trace: OperationTrace): number {
  const activePlugins = new Set(
    trace.steps
      .filter((step) => step.stage !== "skip" && step.plugin !== "fetch")
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
      return renderRequestTab(trace);
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
  const { trace, showSettings, activeTab, showPassedPlugins, theme, position } =
    ctx;

  if (showSettings) {
    return renderSettings({ showPassedPlugins, theme, position });
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
          <span class="spoosh-detail-path">${trace.path}</span>
        </div>
        <div class="spoosh-detail-meta">
          <span class="spoosh-badge ${statusClass}">${statusLabel}</span>
          <span class="spoosh-badge neutral">${trace.duration?.toFixed(0) ?? "..."}ms</span>
          <span class="spoosh-badge neutral">${formatTime(trace.timestamp)}</span>
          <button class="spoosh-copy-btn" data-action="copy-query-key" data-query-key="${escapeHtml(trace.queryKey)}" title="Copy queryKey">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
              <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/>
            </svg>
          </button>
        </div>
      </div>

      <div class="spoosh-tabs">
        <button class="spoosh-tab ${activeTab === "data" ? "active" : ""}" data-tab="data">
          ${isPending ? "Fetching" : hasError ? "Error" : "Data"}
        </button>
        <button class="spoosh-tab ${activeTab === "request" ? "active" : ""}" data-tab="request">
          Request
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
  position: PositionMode
): string {
  if (showSettings) {
    return renderSettings({ showPassedPlugins, theme, position });
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
