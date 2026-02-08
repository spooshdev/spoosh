import type { OperationType, StateManager, EventEmitter } from "@spoosh/core";

import type {
  DevToolStoreInterface,
  DevToolTheme,
  OperationTrace,
  PluginStepEvent,
  DiffLine,
} from "../types";
import { injectStyles, removeStyles } from "./styles/inject";
import { getThemeCSS, resolveTheme } from "./styles/theme";
import { computeDiff } from "../store/diff";

interface DevToolPanelOptions {
  store: DevToolStoreInterface;
  theme: "light" | "dark" | DevToolTheme;
  position: "bottom-right" | "bottom-left" | "top-right" | "top-left";
  stateManager: StateManager;
  eventEmitter: EventEmitter;
}

type DetailTab = "data" | "request" | "plugins";

export class DevToolPanel {
  private fab: HTMLButtonElement | null = null;
  private sidebar: HTMLDivElement | null = null;
  private store: DevToolStoreInterface;
  private theme: DevToolTheme;
  private position: string;
  private isOpen = false;
  private selectedTraceId: string | null = null;
  private activeTab: DetailTab = "data";
  private expandedSteps = new Set<string>();
  private fullDiffViews = new Set<string>();
  private unsubscribe: (() => void) | null = null;
  private traceCount = 0;
  private showPassedPlugins = false;

  constructor(options: DevToolPanelOptions) {
    this.store = options.store;
    this.theme = resolveTheme(options.theme);
    this.position = options.position;
  }

  mount(): void {
    if (typeof document === "undefined") return;

    injectStyles(getThemeCSS(this.theme));

    this.fab = document.createElement("button");
    this.fab.id = "spoosh-devtool-fab";
    this.fab.className = this.position;
    this.fab.innerHTML = "⚡";
    this.fab.onclick = () => this.toggle();
    document.body.appendChild(this.fab);

    this.sidebar = document.createElement("div");
    this.sidebar.id = "spoosh-devtool-sidebar";
    document.body.appendChild(this.sidebar);

    this.unsubscribe = this.store.subscribe(() => {
      const newCount = this.store.getTraces().length;

      if (newCount !== this.traceCount) {
        this.traceCount = newCount;
        this.updateBadge();
      }

      if (this.isOpen) {
        this.render();
      }
    });

    this.render();
  }

  private updateBadge(): void {
    if (!this.fab) return;

    const badge = this.fab.querySelector(".badge");

    if (this.traceCount > 0 && !this.isOpen) {
      if (badge) {
        badge.textContent = String(Math.min(this.traceCount, 99));
      } else {
        const newBadge = document.createElement("span");
        newBadge.className = "badge";
        newBadge.textContent = String(Math.min(this.traceCount, 99));
        this.fab.appendChild(newBadge);
      }
    } else {
      badge?.remove();
    }
  }

  private render(): void {
    if (!this.sidebar) return;

    const traces = this.store.getFilteredTraces();
    const filters = this.store.getFilters();
    const selectedTrace = this.selectedTraceId
      ? traces.find((t) => t.id === this.selectedTraceId)
      : null;

    this.sidebar.innerHTML = `
      <div class="spoosh-panel">
        <div class="spoosh-list-panel">
          ${this.renderHeader(filters)}
          ${this.renderTraceList(traces)}
        </div>
        ${selectedTrace ? this.renderDetailPanel(selectedTrace) : this.renderEmptyDetail()}
      </div>
    `;

    this.attachEvents();
  }

  private renderHeader(filters: {
    operationTypes: Set<OperationType>;
  }): string {
    return `
      <div class="spoosh-header">
        <div class="spoosh-title">
          <span class="spoosh-logo">⚡</span>
          <span>Spoosh</span>
        </div>
        <div class="spoosh-actions">
          <button class="spoosh-icon-btn" data-action="clear" title="Clear">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
            </svg>
          </button>
          <button class="spoosh-icon-btn" data-action="close" title="Close">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
          </button>
        </div>
      </div>
      <div class="spoosh-filters">
        ${(["read", "write", "infiniteRead"] as const)
          .map((type) => {
            const active = filters.operationTypes.has(type);
            const label =
              type === "infiniteRead"
                ? "Infinite"
                : type.charAt(0).toUpperCase() + type.slice(1);
            return `<button class="spoosh-filter ${active ? "active" : ""}" data-filter="${type}">${label}</button>`;
          })
          .join("")}
      </div>
    `;
  }

  private renderTraceList(traces: OperationTrace[]): string {
    if (traces.length === 0) {
      return `<div class="spoosh-empty">No requests yet</div>`;
    }

    return `
      <div class="spoosh-traces">
        ${[...traces]
          .reverse()
          .map((trace) => this.renderTraceRow(trace))
          .join("")}
      </div>
    `;
  }

  private renderTraceRow(trace: OperationTrace): string {
    const isSelected = trace.id === this.selectedTraceId;
    const isPending = trace.duration === undefined;
    const hasError = !!trace.response?.error;
    const statusClass = isPending ? "pending" : hasError ? "error" : "success";
    const duration = trace.duration?.toFixed(0) ?? "...";
    const queryParams = this.formatQueryParams(
      trace.request.query as Record<string, unknown> | undefined
    );

    return `
      <div class="spoosh-trace ${isSelected ? "selected" : ""}" data-trace-id="${trace.id}">
        <div class="spoosh-trace-status ${statusClass}"></div>
        <div class="spoosh-trace-info">
          <span class="spoosh-trace-method method-${trace.method}">${trace.method}</span>
          <span class="spoosh-trace-path">${trace.path}${queryParams ? `<span class="spoosh-trace-query">?${this.escapeHtml(queryParams)}</span>` : ""}</span>
        </div>
        <span class="spoosh-trace-time">${duration}ms</span>
      </div>
    `;
  }

  private formatQueryParams(query?: Record<string, unknown>): string | null {
    if (!query) return null;

    const entries = Object.entries(query);

    if (entries.length === 0) return null;

    return entries.map(([k, v]) => `${k}=${v ?? ""}`).join("&");
  }

  private renderEmptyDetail(): string {
    return `
      <div class="spoosh-detail-panel">
        <div class="spoosh-detail-empty">
          <div class="spoosh-detail-empty-icon">📋</div>
          <div>Select a request to view details</div>
        </div>
      </div>
    `;
  }

  private renderDetailPanel(trace: OperationTrace): string {
    const isPending = trace.duration === undefined;
    const hasError = !!trace.response?.error;
    const statusClass = isPending ? "pending" : hasError ? "error" : "success";
    const statusLabel = isPending ? "Pending" : hasError ? "Error" : "Success";

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
          </div>
        </div>

        <div class="spoosh-tabs">
          <button class="spoosh-tab ${this.activeTab === "data" ? "active" : ""}" data-tab="data">
            ${isPending ? "Fetching" : hasError ? "Error" : "Data"}
          </button>
          <button class="spoosh-tab ${this.activeTab === "request" ? "active" : ""}" data-tab="request">
            Request
          </button>
          <button class="spoosh-tab ${this.activeTab === "plugins" ? "active" : ""}" data-tab="plugins">
            Plugins ${this.getActivePluginCount(trace) > 0 ? `(${this.getActivePluginCount(trace)})` : ""}
          </button>
        </div>

        <div class="spoosh-tab-content">
          ${this.renderTabContent(trace)}
        </div>
      </div>
    `;
  }

  private renderTabContent(trace: OperationTrace): string {
    switch (this.activeTab) {
      case "data":
        return this.renderDataTab(trace);
      case "request":
        return this.renderRequestTab(trace);
      case "plugins":
        return this.renderPluginsTab(trace);
      default:
        return "";
    }
  }

  private renderDataTab(trace: OperationTrace): string {
    const isPending = trace.duration === undefined;

    if (isPending) {
      return `
        <div class="spoosh-empty-tab spoosh-pending-tab">
          <div class="spoosh-spinner"></div>
          <div>Fetching...</div>
        </div>
      `;
    }

    const response = trace.response;

    if (!response) {
      return `<div class="spoosh-empty-tab">No response data</div>`;
    }

    if (response.error) {
      return `
        <div class="spoosh-data-section">
          <div class="spoosh-data-label">Error</div>
          <pre class="spoosh-json error">${this.formatJson(response.error)}</pre>
        </div>
      `;
    }

    return `
      <div class="spoosh-data-section">
        <div class="spoosh-data-label">Response Data</div>
        <pre class="spoosh-json">${this.formatJson(response.data)}</pre>
      </div>
    `;
  }

  private renderRequestTab(trace: OperationTrace): string {
    const { query, body, params, headers } = trace.request;

    return `
      <div class="spoosh-data-section">
        <div class="spoosh-data-label">Tags</div>
        <pre class="spoosh-json">${this.formatJson(trace.tags)}</pre>
      </div>

      ${
        params && Object.keys(params).length > 0
          ? `
        <div class="spoosh-data-section">
          <div class="spoosh-data-label">Params</div>
          <pre class="spoosh-json">${this.formatJson(params)}</pre>
        </div>
      `
          : ""
      }

      ${
        query && Object.keys(query).length > 0
          ? `
        <div class="spoosh-data-section">
          <div class="spoosh-data-label">Query</div>
          <pre class="spoosh-json">${this.formatJson(query)}</pre>
        </div>
      `
          : ""
      }

      ${
        body !== undefined
          ? `
        <div class="spoosh-data-section">
          <div class="spoosh-data-label">Body</div>
          <pre class="spoosh-json">${this.formatJson(body)}</pre>
        </div>
      `
          : ""
      }

      ${
        headers && Object.keys(headers).length > 0
          ? `
        <div class="spoosh-data-section">
          <div class="spoosh-data-label">Headers</div>
          <pre class="spoosh-json">${this.formatJson(headers)}</pre>
        </div>
      `
          : ""
      }
    `;
  }

  private renderPluginsTab(trace: OperationTrace): string {
    const knownPlugins = this.store.getKnownPlugins(trace.operationType);

    if (knownPlugins.length === 0 && trace.steps.length === 0) {
      return `<div class="spoosh-empty-tab">No plugin events recorded</div>`;
    }

    const stepsByPlugin = new Map<string, PluginStepEvent>();

    for (const step of trace.steps) {
      stepsByPlugin.set(step.plugin, step);
    }

    const allPlugins =
      knownPlugins.length > 0 ? knownPlugins : trace.steps.map((s) => s.plugin);

    const isPassedPlugin = (name: string): boolean => {
      const step = stepsByPlugin.get(name);
      return !step || step.stage === "skip";
    };

    const activePlugins = allPlugins.filter((name) => !isPassedPlugin(name));
    const passedPlugins = allPlugins.filter((name) => isPassedPlugin(name));
    const passedCount = passedPlugins.length;

    const pluginsToShow = this.showPassedPlugins ? allPlugins : activePlugins;

    if (pluginsToShow.length === 0 && !this.showPassedPlugins) {
      return `
        <div class="spoosh-plugins-header">
          <button class="spoosh-toggle-passed" data-action="toggle-passed">
            Show ${passedCount} passed
          </button>
        </div>
        <div class="spoosh-empty-tab">No plugins ran</div>
      `;
    }

    return `
      ${
        passedCount > 0
          ? `
        <div class="spoosh-plugins-header">
          <button class="spoosh-toggle-passed" data-action="toggle-passed">
            ${this.showPassedPlugins ? "Hide" : "Show"} ${passedCount} passed
          </button>
        </div>
      `
          : ""
      }
      <div class="spoosh-plugins-list">
        ${pluginsToShow
          .map((pluginName) => {
            const step = stepsByPlugin.get(pluginName);
            const isPassed = isPassedPlugin(pluginName);
            return this.renderPluginStep(trace.id, pluginName, step, isPassed);
          })
          .join("")}
      </div>
    `;
  }

  private renderPluginStep(
    traceId: string,
    pluginName: string,
    step: PluginStepEvent | undefined,
    isPassed: boolean
  ): string {
    const hasNoStep = !step;
    const stepKey = step
      ? `${traceId}:${step.plugin}:${step.timestamp}`
      : `${traceId}:${pluginName}:passed`;
    const isExpanded = this.expandedSteps.has(stepKey);
    const hasDiff =
      !!step?.diff &&
      JSON.stringify(step.diff.before) !== JSON.stringify(step.diff.after);

    const colorMap: Record<string, string> = {
      success: "var(--spoosh-success)",
      warning: "var(--spoosh-warning)",
      error: "var(--spoosh-error)",
      info: "var(--spoosh-primary)",
      muted: "var(--spoosh-text-muted)",
    };

    const stageColors: Record<string, string> = {
      return: "var(--spoosh-success)",
      log: "var(--spoosh-primary)",
      skip: "var(--spoosh-text-muted)",
    };

    const dotColor = hasNoStep
      ? "var(--spoosh-border)"
      : step?.color
        ? colorMap[step.color]
        : stageColors[step?.stage || "log"] || "var(--spoosh-text-muted)";

    const displayName = pluginName.replace("spoosh:", "");

    if (hasNoStep) {
      return `
        <div class="spoosh-plugin-item passed">
          <div class="spoosh-plugin-header">
            <div class="spoosh-plugin-status" style="background: ${dotColor}"></div>
            <div class="spoosh-plugin-info">
              <span class="spoosh-plugin-name">${displayName}</span>
            </div>
          </div>
        </div>
      `;
    }

    return `
      <div class="spoosh-plugin-item ${isPassed ? "passed" : ""} ${isExpanded ? "expanded" : ""}" data-step-key="${stepKey}">
        <div class="spoosh-plugin-header" ${hasDiff ? 'data-action="toggle-step"' : ""}>
          <div class="spoosh-plugin-status" style="background: ${dotColor}"></div>
          <div class="spoosh-plugin-info">
            <span class="spoosh-plugin-name">${displayName}</span>
            <span class="spoosh-plugin-stage">${step.stage}</span>
          </div>
          ${step.reason ? `<span class="spoosh-plugin-reason">${this.escapeHtml(step.reason)}</span>` : ""}
          ${hasDiff ? `<span class="spoosh-plugin-expand">${isExpanded ? "▼" : "▶"}</span>` : ""}
        </div>
        ${isExpanded && step.diff ? this.renderPluginDiff(stepKey, step.diff) : ""}
      </div>
    `;
  }

  private renderPluginDiff(
    stepKey: string,
    diff: { before: unknown; after: unknown }
  ): string {
    const showFull = this.fullDiffViews.has(stepKey);

    const diffLines = computeDiff(diff.before, diff.after);

    if (showFull) {
      return `
        <div class="spoosh-plugin-diff">
          <div class="spoosh-diff-header">
            <button class="spoosh-diff-toggle" data-action="toggle-diff-view" data-diff-key="${stepKey}">
              Show changes only
            </button>
          </div>
          <pre class="spoosh-diff-lines">${this.renderDiffLines(diffLines)}</pre>
        </div>
      `;
    }

    const linesWithContext = this.getDiffLinesWithContext(diffLines, 2);

    if (linesWithContext.length === 0) {
      return `<div class="spoosh-plugin-diff"><div class="spoosh-empty-tab">No changes</div></div>`;
    }

    return `
      <div class="spoosh-plugin-diff">
        <div class="spoosh-diff-header">
          <button class="spoosh-diff-toggle" data-action="toggle-diff-view" data-diff-key="${stepKey}">
            Show full
          </button>
        </div>
        <pre class="spoosh-diff-lines">${this.renderDiffLines(linesWithContext)}</pre>
      </div>
    `;
  }

  private getDiffLinesWithContext(
    lines: DiffLine[],
    contextSize: number
  ): DiffLine[] {
    const result: DiffLine[] = [];
    const includeIndices = new Set<number>();

    lines.forEach((line, i) => {
      if (line.type !== "unchanged") {
        for (
          let j = Math.max(0, i - contextSize);
          j <= Math.min(lines.length - 1, i + contextSize);
          j++
        ) {
          includeIndices.add(j);
        }
      }
    });

    let lastIncluded = -2;
    const sortedIndices = Array.from(includeIndices).sort((a, b) => a - b);

    for (const i of sortedIndices) {
      if (lastIncluded >= 0 && i > lastIncluded + 1) {
        result.push({ type: "unchanged", content: "···" });
      }
      const line = lines[i];
      if (line) result.push(line);
      lastIncluded = i;
    }

    return result;
  }

  private renderDiffLines(lines: DiffLine[]): string {
    return lines
      .map((line) => {
        const prefix =
          line.type === "added" ? "+" : line.type === "removed" ? "-" : " ";
        const className = `spoosh-diff-line-${line.type}`;
        return `<div class="${className}"><span class="spoosh-diff-prefix">${prefix}</span>${this.highlightJson(line.content)}</div>`;
      })
      .join("");
  }

  private getActivePluginCount(trace: OperationTrace): number {
    return trace.steps.filter((step) => step.stage !== "skip").length;
  }

  private formatJson(data: unknown): string {
    if (data === undefined)
      return '<span class="spoosh-syn-null">undefined</span>';
    if (data === null) return '<span class="spoosh-syn-null">null</span>';

    try {
      const json = JSON.stringify(data, null, 2);
      return this.highlightJson(json);
    } catch {
      return this.escapeHtml(String(data));
    }
  }

  private highlightJson(json: string): string {
    return json.replace(
      /("(?:\\.|[^"\\])*")\s*:|("(?:\\.|[^"\\])*")|(\b\d+\.?\d*\b)|(\btrue\b|\bfalse\b)|(\bnull\b)/g,
      (match, key, str, num, bool, nil) => {
        if (key)
          return `<span class="spoosh-syn-key">${this.escapeHtml(key)}</span>:`;
        if (str)
          return `<span class="spoosh-syn-str">${this.escapeHtml(str)}</span>`;
        if (num) return `<span class="spoosh-syn-num">${num}</span>`;
        if (bool) return `<span class="spoosh-syn-bool">${bool}</span>`;
        if (nil) return `<span class="spoosh-syn-null">${nil}</span>`;
        return match;
      }
    );
  }

  private escapeHtml(str: string): string {
    return str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  private attachEvents(): void {
    if (!this.sidebar) return;

    this.sidebar.onclick = (e) => {
      const target = e.target as HTMLElement;

      const action = target
        .closest("[data-action]")
        ?.getAttribute("data-action");
      const filter = target
        .closest("[data-filter]")
        ?.getAttribute("data-filter");
      const traceId = target
        .closest("[data-trace-id]")
        ?.getAttribute("data-trace-id");
      const tab = target.closest("[data-tab]")?.getAttribute("data-tab");
      const stepKey = target
        .closest("[data-step-key]")
        ?.getAttribute("data-step-key");

      if (action === "close") {
        this.close();
      } else if (action === "clear") {
        this.store.clear();
        this.selectedTraceId = null;
        this.expandedSteps.clear();
        this.render();
      } else if (action === "toggle-step" && stepKey) {
        if (this.expandedSteps.has(stepKey)) {
          this.expandedSteps.delete(stepKey);
        } else {
          this.expandedSteps.add(stepKey);
        }
        this.render();
      } else if (action === "toggle-passed") {
        this.showPassedPlugins = !this.showPassedPlugins;
        this.render();
      } else if (action === "toggle-diff-view") {
        const diffKey = target
          .closest("[data-diff-key]")
          ?.getAttribute("data-diff-key");
        if (diffKey) {
          if (this.fullDiffViews.has(diffKey)) {
            this.fullDiffViews.delete(diffKey);
          } else {
            this.fullDiffViews.add(diffKey);
          }
          this.render();
        }
      } else if (traceId && !action) {
        this.selectedTraceId = traceId;
        this.activeTab = "data";
        this.expandedSteps.clear();
        this.render();
      } else if (tab) {
        this.activeTab = tab as DetailTab;
        this.render();
      } else if (filter) {
        const filters = this.store.getFilters();
        const newTypes = new Set(filters.operationTypes);

        if (newTypes.has(filter as OperationType)) {
          newTypes.delete(filter as OperationType);
        } else {
          newTypes.add(filter as OperationType);
        }

        this.store.setFilter("operationTypes", newTypes);
        this.render();
      }
    };
  }

  open(): void {
    this.isOpen = true;
    this.sidebar?.classList.add("open");
    this.updateBadge();
    this.render();
  }

  close(): void {
    this.isOpen = false;
    this.sidebar?.classList.remove("open");
  }

  toggle(): void {
    if (this.isOpen) {
      this.close();
    } else {
      this.open();
    }
  }

  setVisible(visible: boolean): void {
    if (this.fab) {
      this.fab.style.display = visible ? "flex" : "none";
    }

    if (!visible) {
      this.close();
    }
  }

  setTheme(theme: "light" | "dark" | DevToolTheme): void {
    this.theme = resolveTheme(theme);
    injectStyles(getThemeCSS(this.theme));
  }

  unmount(): void {
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }

    this.fab?.remove();
    this.sidebar?.remove();
    this.fab = null;
    this.sidebar = null;
    removeStyles();
  }
}
