import type {
  OperationType,
  StateManager,
  EventEmitter,
  StandaloneEvent,
} from "@spoosh/core";

import type {
  DevToolStoreInterface,
  DevToolTheme,
  OperationTrace,
  PluginStepEvent,
} from "../types";
import { injectStyles, removeStyles } from "./styles/inject";
import { getThemeCSS, resolveTheme } from "./styles/theme";
import {
  computeDiff,
  escapeHtml,
  formatJson,
  formatQueryParams,
  getDiffLinesWithContext,
  renderDiffLines,
} from "./utils";

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
  private resizeHandle: HTMLDivElement | null = null;
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
  private sidebarWidth = 700;
  private listPanelWidth = 280;
  private requestsPanelHeight = 0.6;
  private isResizing = false;
  private isResizingDivider = false;
  private isResizingHorizontal = false;
  private boundHandleMouseMove: (e: MouseEvent) => void;
  private boundHandleMouseUp: () => void;
  private dividerHandle: HTMLDivElement | null = null;
  private horizontalDivider: HTMLDivElement | null = null;

  constructor(options: DevToolPanelOptions) {
    this.store = options.store;
    this.theme = resolveTheme(options.theme);
    this.position = options.position;
    this.boundHandleMouseMove = this.handleMouseMove.bind(this);
    this.boundHandleMouseUp = this.handleMouseUp.bind(this);
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
    this.sidebar.style.width = `${this.sidebarWidth}px`;
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
    const events = this.store.getEvents();
    const filters = this.store.getFilters();
    const selectedTrace = this.selectedTraceId
      ? traces.find((t) => t.id === this.selectedTraceId)
      : null;

    const detailContent = selectedTrace
      ? this.renderDetailPanel(selectedTrace)
      : this.renderEmptyDetail();

    this.sidebar.innerHTML = `
      <div class="spoosh-resize-handle"></div>
      <div class="spoosh-panel">
        <div class="spoosh-list-panel" style="width: ${this.listPanelWidth}px; min-width: ${this.listPanelWidth}px;">
          ${this.renderHeader(filters)}
          <div class="spoosh-list-content">
            <div class="spoosh-requests-section" style="flex: ${this.requestsPanelHeight};">
              <div class="spoosh-section-header">
                <span class="spoosh-section-title">Requests</span>
                <span class="spoosh-section-count">${traces.length}</span>
              </div>
              ${this.renderTraceList(traces)}
            </div>
            <div class="spoosh-horizontal-divider"></div>
            <div class="spoosh-events-section" style="flex: ${1 - this.requestsPanelHeight};">
              <div class="spoosh-section-header">
                <span class="spoosh-section-title">Events</span>
                <span class="spoosh-section-count">${events.length}</span>
              </div>
              ${this.renderEventList(events)}
            </div>
          </div>
        </div>
        <div class="spoosh-divider-handle"></div>
        ${detailContent}
      </div>
    `;

    this.resizeHandle = this.sidebar.querySelector(".spoosh-resize-handle");
    this.dividerHandle = this.sidebar.querySelector(".spoosh-divider-handle");
    this.horizontalDivider = this.sidebar.querySelector(
      ".spoosh-horizontal-divider"
    );
    this.setupResizeHandler();
    this.setupDividerHandler();
    this.setupHorizontalDividerHandler();
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

  private renderEventList(events: StandaloneEvent[]): string {
    if (events.length === 0) {
      return `<div class="spoosh-empty">No events yet</div>`;
    }

    return `
      <div class="spoosh-events">
        ${[...events]
          .reverse()
          .map((event) => this.renderEventRow(event))
          .join("")}
      </div>
    `;
  }

  private renderEventRow(event: StandaloneEvent): string {
    const pluginName = event.plugin.replace("spoosh:", "");
    const time = new Date(event.timestamp).toLocaleTimeString();

    const colorMap: Record<string, string> = {
      success: "var(--spoosh-success)",
      warning: "var(--spoosh-warning)",
      error: "var(--spoosh-error)",
      info: "var(--spoosh-primary)",
      muted: "var(--spoosh-text-muted)",
    };

    const dotColor = event.color
      ? colorMap[event.color]
      : "var(--spoosh-primary)";

    return `
      <div class="spoosh-event">
        <div class="spoosh-event-dot" style="background: ${dotColor}"></div>
        <div class="spoosh-event-info">
          <span class="spoosh-event-plugin">${pluginName}</span>
          <span class="spoosh-event-message">${escapeHtml(event.message)}</span>
          ${event.queryKey ? `<span class="spoosh-event-query">${this.formatQueryKey(event.queryKey)}</span>` : ""}
        </div>
        <span class="spoosh-event-time">${time}</span>
      </div>
    `;
  }

  private formatQueryKey(queryKey: string): string {
    try {
      const parsed = JSON.parse(queryKey);
      return parsed.path || queryKey.slice(0, 30);
    } catch {
      return queryKey.slice(0, 30);
    }
  }

  private renderTraceRow(trace: OperationTrace): string {
    const isSelected = trace.id === this.selectedTraceId;
    const isPending = trace.duration === undefined;
    const hasError = !!trace.response?.error;
    const statusClass = isPending ? "pending" : hasError ? "error" : "success";
    const duration = trace.duration?.toFixed(0) ?? "...";
    const queryParams = formatQueryParams(
      trace.request.query as Record<string, unknown> | undefined
    );

    return `
      <div class="spoosh-trace ${isSelected ? "selected" : ""}" data-trace-id="${trace.id}">
        <div class="spoosh-trace-status ${statusClass}"></div>
        <div class="spoosh-trace-info">
          <span class="spoosh-trace-method method-${trace.method}">${trace.method}</span>
          <span class="spoosh-trace-path">${trace.path}${queryParams ? `<span class="spoosh-trace-query">?${escapeHtml(queryParams)}</span>` : ""}</span>
        </div>
        <span class="spoosh-trace-time">${duration}ms</span>
      </div>
    `;
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
          <pre class="spoosh-json error">${formatJson(response.error)}</pre>
        </div>
      `;
    }

    return `
      <div class="spoosh-data-section">
        <div class="spoosh-data-label">Response Data</div>
        <pre class="spoosh-json">${formatJson(response.data)}</pre>
      </div>
    `;
  }

  private renderRequestTab(trace: OperationTrace): string {
    const { query, body, params, headers } = trace.request;

    return `
      <div class="spoosh-data-section">
        <div class="spoosh-data-label">Tags</div>
        <pre class="spoosh-json">${formatJson(trace.tags)}</pre>
      </div>

      ${
        params && Object.keys(params).length > 0
          ? `
        <div class="spoosh-data-section">
          <div class="spoosh-data-label">Params</div>
          <pre class="spoosh-json">${formatJson(params)}</pre>
        </div>
      `
          : ""
      }

      ${
        query && Object.keys(query).length > 0
          ? `
        <div class="spoosh-data-section">
          <div class="spoosh-data-label">Query</div>
          <pre class="spoosh-json">${formatJson(query)}</pre>
        </div>
      `
          : ""
      }

      ${
        body !== undefined
          ? `
        <div class="spoosh-data-section">
          <div class="spoosh-data-label">Body</div>
          <pre class="spoosh-json">${formatJson(body)}</pre>
        </div>
      `
          : ""
      }

      ${
        headers && Object.keys(headers).length > 0
          ? `
        <div class="spoosh-data-section">
          <div class="spoosh-data-label">Headers</div>
          <pre class="spoosh-json">${formatJson(headers)}</pre>
        </div>
      `
          : ""
      }
    `;
  }

  private renderPluginsTab(trace: OperationTrace): string {
    const knownPlugins = this.store.getKnownPlugins(trace.operationType);
    const sortedSteps = [...trace.steps].sort(
      (a, b) => a.timestamp - b.timestamp
    );

    const fetchStep = sortedSteps.find((s) => s.plugin === "fetch");
    const fetchTimestamp = fetchStep?.timestamp ?? Infinity;

    const beforeFetchSteps = sortedSteps.filter(
      (s) => s.plugin !== "fetch" && s.timestamp < fetchTimestamp
    );
    const afterFetchSteps = sortedSteps.filter(
      (s) => s.plugin !== "fetch" && s.timestamp >= fetchTimestamp
    );

    const beforeFetchByPlugin = new Map<string, PluginStepEvent[]>();

    for (const step of beforeFetchSteps) {
      const existing = beforeFetchByPlugin.get(step.plugin) || [];
      existing.push(step);
      beforeFetchByPlugin.set(step.plugin, existing);
    }

    const pluginsWithBeforeEvents = new Set(
      beforeFetchSteps.map((s) => s.plugin)
    );
    const passedPlugins = knownPlugins.filter(
      (p) => !pluginsWithBeforeEvents.has(p)
    );

    if (sortedSteps.length === 0 && knownPlugins.length === 0) {
      return `<div class="spoosh-empty-tab">No plugin events recorded</div>`;
    }

    const timelineItems: string[] = [];

    for (const pluginName of knownPlugins) {
      const steps = beforeFetchByPlugin.get(pluginName);

      if (steps && steps.length > 0) {
        for (const step of steps) {
          timelineItems.push(this.renderTimelineStep(trace.id, step));
        }
      } else if (this.showPassedPlugins) {
        timelineItems.push(this.renderPassedPlugin(pluginName));
      }
    }

    if (fetchStep) {
      timelineItems.push(this.renderTimelineStep(trace.id, fetchStep));
    }

    for (const step of afterFetchSteps) {
      timelineItems.push(this.renderTimelineStep(trace.id, step));
    }

    return `
      ${
        passedPlugins.length > 0
          ? `
        <div class="spoosh-plugins-header">
          <button class="spoosh-toggle-passed" data-action="toggle-passed">
            ${this.showPassedPlugins ? "Hide" : "Show"} ${passedPlugins.length} passed
          </button>
        </div>
      `
          : ""
      }
      <div class="spoosh-timeline">
        ${timelineItems.join("")}
      </div>
    `;
  }

  private renderPassedPlugin(pluginName: string): string {
    const displayName = pluginName.replace("spoosh:", "");

    return `
      <div class="spoosh-timeline-step skipped">
        <div class="spoosh-timeline-step-header">
          <div class="spoosh-timeline-dot" style="background: var(--spoosh-border)"></div>
          <span class="spoosh-timeline-plugin">${displayName}</span>
        </div>
      </div>
    `;
  }

  private renderTimelineStep(traceId: string, step: PluginStepEvent): string {
    const isFetch = step.plugin === "fetch";
    const isSkip = step.stage === "skip";
    const stepKey = `${traceId}:${step.plugin}:${step.timestamp}`;
    const isExpanded = this.expandedSteps.has(stepKey);
    const hasDiff =
      step.diff &&
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
      fetch: "var(--spoosh-warning)",
    };

    const dotColor = step.color
      ? colorMap[step.color]
      : stageColors[step.stage] || "var(--spoosh-text-muted)";

    const displayName = step.plugin.replace("spoosh:", "");

    if (isFetch) {
      return `
        <div class="spoosh-timeline-fetch">
          <div class="spoosh-fetch-line"></div>
          <div class="spoosh-fetch-label">⚡ Fetch</div>
          <div class="spoosh-fetch-line"></div>
        </div>
      `;
    }

    return `
      <div class="spoosh-timeline-step ${isSkip ? "skipped" : ""} ${isExpanded ? "expanded" : ""}" data-step-key="${stepKey}">
        <div class="spoosh-timeline-step-header" ${hasDiff ? 'data-action="toggle-step"' : ""}>
          <div class="spoosh-timeline-dot" style="background: ${dotColor}"></div>
          <span class="spoosh-timeline-plugin">${displayName}</span>
          <span class="spoosh-timeline-stage">${step.stage}</span>
          ${step.reason ? `<span class="spoosh-timeline-reason">${escapeHtml(step.reason)}</span>` : ""}
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
          <pre class="spoosh-diff-lines">${renderDiffLines(diffLines)}</pre>
        </div>
      `;
    }

    const linesWithContext = getDiffLinesWithContext(diffLines, 2);

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
        <pre class="spoosh-diff-lines">${renderDiffLines(linesWithContext)}</pre>
      </div>
    `;
  }

  private getActivePluginCount(trace: OperationTrace): number {
    const activePlugins = new Set(
      trace.steps
        .filter((step) => step.stage !== "skip")
        .map((step) => step.plugin)
    );
    return activePlugins.size;
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

  private setupResizeHandler(): void {
    if (!this.resizeHandle) return;

    this.resizeHandle.addEventListener("mousedown", (e) => {
      e.preventDefault();
      this.isResizing = true;
      document.body.style.cursor = "ew-resize";
      document.body.style.userSelect = "none";
      document.addEventListener("mousemove", this.boundHandleMouseMove);
      document.addEventListener("mouseup", this.boundHandleMouseUp);
    });
  }

  private setupDividerHandler(): void {
    if (!this.dividerHandle) return;

    this.dividerHandle.addEventListener("mousedown", (e) => {
      e.preventDefault();
      this.isResizingDivider = true;
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
      document.addEventListener("mousemove", this.boundHandleMouseMove);
      document.addEventListener("mouseup", this.boundHandleMouseUp);
    });
  }

  private setupHorizontalDividerHandler(): void {
    if (!this.horizontalDivider) return;

    this.horizontalDivider.addEventListener("mousedown", (e) => {
      e.preventDefault();
      this.isResizingHorizontal = true;
      document.body.style.cursor = "row-resize";
      document.body.style.userSelect = "none";
      document.addEventListener("mousemove", this.boundHandleMouseMove);
      document.addEventListener("mouseup", this.boundHandleMouseUp);
    });
  }

  private handleMouseMove(e: MouseEvent): void {
    if (this.isResizing && this.sidebar) {
      const newWidth = window.innerWidth - e.clientX;
      const minWidth = 400;
      const maxWidth = window.innerWidth - 100;

      this.sidebarWidth = Math.min(Math.max(newWidth, minWidth), maxWidth);
      this.sidebar.style.width = `${this.sidebarWidth}px`;
    }

    if (this.isResizingDivider && this.sidebar) {
      const sidebarRect = this.sidebar.getBoundingClientRect();
      const newListWidth = e.clientX - sidebarRect.left;
      const minWidth = 200;
      const maxWidth = this.sidebarWidth - 200;

      this.listPanelWidth = Math.min(
        Math.max(newListWidth, minWidth),
        maxWidth
      );

      const listPanel = this.sidebar.querySelector(
        ".spoosh-list-panel"
      ) as HTMLElement;

      if (listPanel) {
        listPanel.style.width = `${this.listPanelWidth}px`;
        listPanel.style.minWidth = `${this.listPanelWidth}px`;
      }
    }

    if (this.isResizingHorizontal && this.sidebar) {
      const listContent = this.sidebar.querySelector(
        ".spoosh-list-content"
      ) as HTMLElement;

      if (listContent) {
        const rect = listContent.getBoundingClientRect();
        const relativeY = e.clientY - rect.top;
        const ratio = relativeY / rect.height;
        const minRatio = 0.2;
        const maxRatio = 0.8;

        this.requestsPanelHeight = Math.min(
          Math.max(ratio, minRatio),
          maxRatio
        );

        const requestsSection = this.sidebar.querySelector(
          ".spoosh-requests-section"
        ) as HTMLElement;
        const eventsSection = this.sidebar.querySelector(
          ".spoosh-events-section"
        ) as HTMLElement;

        if (requestsSection && eventsSection) {
          requestsSection.style.flex = String(this.requestsPanelHeight);
          eventsSection.style.flex = String(1 - this.requestsPanelHeight);
        }
      }
    }
  }

  private handleMouseUp(): void {
    this.isResizing = false;
    this.isResizingDivider = false;
    this.isResizingHorizontal = false;
    document.body.style.cursor = "";
    document.body.style.userSelect = "";
    document.removeEventListener("mousemove", this.boundHandleMouseMove);
    document.removeEventListener("mouseup", this.boundHandleMouseUp);
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

    document.removeEventListener("mousemove", this.boundHandleMouseMove);
    document.removeEventListener("mouseup", this.boundHandleMouseUp);

    this.fab?.remove();
    this.sidebar?.remove();
    this.fab = null;
    this.sidebar = null;
    this.resizeHandle = null;
    this.dividerHandle = null;
    removeStyles();
  }
}
