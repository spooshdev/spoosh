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
  getLogo,
  renderDiffLines,
} from "./utils";

interface DevToolPanelOptions {
  store: DevToolStoreInterface;
  theme: "light" | "dark" | DevToolTheme;
  position: "bottom-right" | "bottom-left" | "top-right" | "top-left";
  stateManager: StateManager;
  eventEmitter: EventEmitter;
  showFloatingIcon: boolean;
}

type DetailTab = "data" | "request" | "plugins";

export class DevToolPanel {
  private shadowHost: HTMLDivElement | null = null;
  private shadowRoot: ShadowRoot | null = null;
  private fab: HTMLButtonElement | null = null;
  private sidebar: HTMLDivElement | null = null;
  private resizeHandle: HTMLDivElement | null = null;
  private store: DevToolStoreInterface;
  private theme: DevToolTheme;
  private position: string;
  private showFloatingIcon: boolean;
  private isOpen = false;
  private showSettings = false;
  private selectedTraceId: string | null = null;
  private activeTab: DetailTab = "data";
  private expandedSteps = new Set<string>();
  private expandedGroups = new Set<string>();
  private fullDiffViews = new Set<string>();
  private unsubscribe: (() => void) | null = null;
  private traceCount = 0;
  private showPassedPlugins = false;
  private sidebarWidth = 700;
  private listPanelWidth = 280;
  private requestsPanelHeight = 0.8;
  private isResizing = false;
  private isResizingDivider = false;
  private isResizingHorizontal = false;
  private boundHandleMouseMove: (e: MouseEvent) => void;
  private boundHandleMouseUp: () => void;
  private dividerHandle: HTMLDivElement | null = null;
  private horizontalDivider: HTMLDivElement | null = null;
  private renderScheduled = false;
  private renderRAF: number | null = null;
  private lastRenderTime = 0;
  private pendingRenderTimeout: ReturnType<typeof setTimeout> | null = null;

  constructor(options: DevToolPanelOptions) {
    this.store = options.store;
    this.theme = resolveTheme(options.theme);
    this.position = options.position;
    this.showFloatingIcon = options.showFloatingIcon;
    this.boundHandleMouseMove = this.handleMouseMove.bind(this);
    this.boundHandleMouseUp = this.handleMouseUp.bind(this);
    this.loadSettings();
  }

  private loadSettings(): void {
    try {
      const saved = localStorage.getItem("spoosh-devtool-settings");

      if (saved) {
        const settings = JSON.parse(saved);
        this.showPassedPlugins = settings.showPassedPlugins ?? false;
      }
    } catch {
      // Ignore localStorage errors
    }
  }

  private saveSettings(): void {
    try {
      localStorage.setItem(
        "spoosh-devtool-settings",
        JSON.stringify({
          showPassedPlugins: this.showPassedPlugins,
        })
      );
    } catch {
      // Ignore localStorage errors
    }
  }

  mount(): void {
    if (typeof document === "undefined") return;

    this.shadowHost = document.createElement("div");
    this.shadowHost.id = "spoosh-devtool-host";
    document.body.appendChild(this.shadowHost);

    this.shadowRoot = this.shadowHost.attachShadow({ mode: "closed" });

    injectStyles(getThemeCSS(this.theme), this.shadowRoot);

    if (this.showFloatingIcon) {
      this.fab = document.createElement("button");
      this.fab.id = "spoosh-devtool-fab";
      this.fab.className = this.position;
      this.fab.innerHTML = getLogo(20, 18);
      this.fab.onclick = () => this.toggle();
      this.shadowRoot.appendChild(this.fab);
    }

    this.sidebar = document.createElement("div");
    this.sidebar.id = "spoosh-devtool-sidebar";
    this.sidebar.style.width = `${this.sidebarWidth}px`;
    this.shadowRoot.appendChild(this.sidebar);

    this.unsubscribe = this.store.subscribe(() => {
      const newCount = this.store.getTraces().length;

      if (newCount !== this.traceCount) {
        this.traceCount = newCount;
        this.updateBadge();
      }

      if (this.isOpen) {
        this.scheduleRender();
      }
    });

    this.render();
  }

  private scheduleRender(): void {
    if (this.renderScheduled) return;

    const now = performance.now();
    const elapsed = now - this.lastRenderTime;
    const minInterval = 150;

    if (elapsed >= minInterval) {
      this.renderScheduled = true;
      this.renderRAF = requestAnimationFrame(() => {
        this.renderScheduled = false;
        this.renderRAF = null;
        this.lastRenderTime = performance.now();
        this.partialUpdate();
      });
    } else {
      this.renderScheduled = true;
      this.pendingRenderTimeout = setTimeout(() => {
        this.renderScheduled = false;
        this.pendingRenderTimeout = null;
        this.lastRenderTime = performance.now();
        this.partialUpdate();
      }, minInterval - elapsed);
    }
  }

  private renderImmediate(): void {
    if (this.renderRAF !== null) {
      cancelAnimationFrame(this.renderRAF);
      this.renderRAF = null;
    }

    if (this.pendingRenderTimeout !== null) {
      clearTimeout(this.pendingRenderTimeout);
      this.pendingRenderTimeout = null;
    }

    this.renderScheduled = false;
    this.lastRenderTime = performance.now();
    this.render();
  }

  private partialUpdate(): void {
    if (!this.sidebar) return;

    const traces = this.store.getFilteredTraces();
    const events = this.store.getEvents();
    const selectedTrace = this.selectedTraceId
      ? traces.find((t) => t.id === this.selectedTraceId)
      : null;

    const requestsSection = this.sidebar.querySelector(".spoosh-requests-section");
    if (requestsSection) {
      const header = requestsSection.querySelector(".spoosh-section-header");
      if (header) {
        const countEl = header.querySelector(".spoosh-section-count");
        if (countEl) {
          countEl.textContent = String(traces.length);
        }
      }

      const existingList = requestsSection.querySelector(".spoosh-traces, .spoosh-empty");
      if (existingList) {
        if (traces.length === 0) {
          existingList.outerHTML = `<div class="spoosh-empty">No requests yet</div>`;
        } else {
          existingList.outerHTML = `
            <div class="spoosh-traces">
              ${[...traces]
                .reverse()
                .map((trace) => this.renderTraceRow(trace))
                .join("")}
            </div>
          `;
        }
      }
    }

    const eventsSection = this.sidebar.querySelector(".spoosh-events-section");
    if (eventsSection) {
      const header = eventsSection.querySelector(".spoosh-section-header");
      if (header) {
        const countEl = header.querySelector(".spoosh-section-count");
        if (countEl) {
          countEl.textContent = String(events.length);
        }
      }

      const existingList = eventsSection.querySelector(".spoosh-events, .spoosh-empty");
      if (existingList) {
        if (events.length === 0) {
          existingList.outerHTML = `<div class="spoosh-empty">No events yet</div>`;
        } else {
          existingList.outerHTML = `
            <div class="spoosh-events">
              ${[...events]
                .reverse()
                .map((event) => this.renderEventRow(event))
                .join("")}
            </div>
          `;
        }
      }
    }

    if (selectedTrace) {
      const isPending = selectedTrace.duration === undefined;
      const hasError = !!selectedTrace.response?.error;
      const tabContent = this.sidebar.querySelector(".spoosh-tab-content");
      const savedScrollTop = tabContent?.scrollTop ?? 0;

      const statusBadge = this.sidebar.querySelector(
        ".spoosh-detail-meta .spoosh-badge:not(.neutral)"
      );
      if (statusBadge) {
        const statusClass = isPending ? "pending" : hasError ? "error" : "success";
        const statusLabel = isPending ? "Pending" : hasError ? "Error" : "Success";
        statusBadge.className = `spoosh-badge ${statusClass}`;
        statusBadge.textContent = statusLabel;
      }

      const durationBadge = this.sidebar.querySelector(
        ".spoosh-detail-meta .spoosh-badge.neutral"
      );
      if (durationBadge) {
        durationBadge.textContent = `${selectedTrace.duration?.toFixed(0) ?? "..."}ms`;
      }

      const dataTabBtn = this.sidebar.querySelector('[data-tab="data"]');
      if (dataTabBtn) {
        dataTabBtn.textContent = isPending ? "Fetching" : hasError ? "Error" : "Data";
      }

      const pluginCountMatch = this.getActivePluginCount(selectedTrace);
      const pluginsTabBtn = this.sidebar.querySelector('[data-tab="plugins"]');
      if (pluginsTabBtn) {
        pluginsTabBtn.textContent = `Plugins ${pluginCountMatch > 0 ? `(${pluginCountMatch})` : ""}`;
      }

      if (tabContent) {
        if (this.activeTab === "plugins") {
          tabContent.innerHTML = this.renderPluginsTab(selectedTrace);
        } else if (this.activeTab === "data") {
          const currentlyShowingSpinner = tabContent.querySelector(".spoosh-spinner");
          if (currentlyShowingSpinner && !isPending) {
            tabContent.innerHTML = this.renderDataTab(selectedTrace);
          }
        }

        if (savedScrollTop > 0) {
          tabContent.scrollTop = savedScrollTop;
        }
      }
    }
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

    const tabContent = this.sidebar.querySelector(".spoosh-tab-content");
    const savedScrollTop = tabContent?.scrollTop ?? 0;

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

    if (savedScrollTop > 0) {
      const newTabContent = this.sidebar.querySelector(".spoosh-tab-content");

      if (newTabContent) {
        newTabContent.scrollTop = savedScrollTop;
      }
    }
  }

  private renderHeader(filters: {
    operationTypes: Set<OperationType>;
  }): string {
    return `
      <div class="spoosh-header">
        <div class="spoosh-title">
          <span class="spoosh-logo">${getLogo(16, 14)}</span>
          <span>Spoosh</span>
        </div>
        <div class="spoosh-actions">
          <button class="spoosh-icon-btn ${this.showSettings ? "active" : ""}" data-action="settings" title="Settings">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="3"/>
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
            </svg>
          </button>
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
    if (this.showSettings) {
      return this.renderSettings();
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

  private renderSettings(): string {
    return `
      <div class="spoosh-detail-panel">
        <div class="spoosh-settings-header">
          <span class="spoosh-settings-title">Settings</span>
        </div>
        <div class="spoosh-settings-content">
          <div class="spoosh-settings-section">
            <div class="spoosh-settings-section-title">Display</div>
            <label class="spoosh-settings-toggle">
              <input type="checkbox" data-setting="showPassedPlugins" ${this.showPassedPlugins ? "checked" : ""} />
              <span class="spoosh-toggle-slider"></span>
              <span class="spoosh-settings-label">Show passed plugins in timeline</span>
            </label>
          </div>
        </div>
      </div>
    `;
  }

  private renderDetailPanel(trace: OperationTrace): string {
    if (this.showSettings) {
      return this.renderSettings();
    }

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
    const isReadOperation = trace.method === "GET";

    const hasTags = isReadOperation && trace.tags.length > 0;
    const hasParams = params && Object.keys(params).length > 0;
    const hasQuery = query && Object.keys(query).length > 0;
    const hasBody = body !== undefined;
    const hasHeaders = headers && Object.keys(headers).length > 0;

    if (!hasTags && !hasParams && !hasQuery && !hasBody && !hasHeaders) {
      return `<div class="spoosh-empty-tab">No request data</div>`;
    }

    return `
      ${
        hasTags
          ? `
        <div class="spoosh-data-section">
          <div class="spoosh-data-label">Tags</div>
          <pre class="spoosh-json">${formatJson(trace.tags)}</pre>
        </div>
      `
          : ""
      }

      ${
        hasParams
          ? `
        <div class="spoosh-data-section">
          <div class="spoosh-data-label">Params</div>
          <pre class="spoosh-json">${formatJson(params)}</pre>
        </div>
      `
          : ""
      }

      ${
        hasQuery
          ? `
        <div class="spoosh-data-section">
          <div class="spoosh-data-label">Query</div>
          <pre class="spoosh-json">${formatJson(query)}</pre>
        </div>
      `
          : ""
      }

      ${hasBody ? this.renderBody(body) : ""}

      ${
        hasHeaders
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

  private renderBody(body: unknown): string {
    const spooshBody = body as {
      __spooshBody?: boolean;
      kind?: "form" | "json" | "urlencoded";
      value?: unknown;
    };

    if (
      spooshBody?.__spooshBody &&
      spooshBody.kind &&
      spooshBody.value !== undefined
    ) {
      const { kind, value } = spooshBody;

      return `
        <div class="spoosh-data-section">
          <div class="spoosh-data-label">Body <span class="spoosh-body-type ${kind}">${kind}</span></div>
          <pre class="spoosh-json">${formatJson(value)}</pre>
        </div>
      `;
    }

    return `
      <div class="spoosh-data-section">
        <div class="spoosh-data-label">Body <span class="spoosh-body-type json">json</span></div>
        <pre class="spoosh-json">${formatJson(body)}</pre>
      </div>
    `;
  }

  private renderPluginsTab(trace: OperationTrace): string {
    const knownPlugins = this.store.getKnownPlugins(trace.operationType);
    const steps = trace.steps;

    const fetchIndex = steps.findIndex((s) => s.plugin === "fetch");
    const fetchStep = fetchIndex >= 0 ? steps[fetchIndex] : undefined;

    const beforeFetchSteps =
      fetchIndex >= 0
        ? steps.slice(0, fetchIndex)
        : steps.filter((s) => s.plugin !== "fetch");
    const afterFetchSteps = fetchIndex >= 0 ? steps.slice(fetchIndex + 1) : [];

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

    if (steps.length === 0 && knownPlugins.length === 0) {
      return `<div class="spoosh-empty-tab">No plugin events recorded</div>`;
    }

    const timelineItems: string[] = [];

    for (const pluginName of knownPlugins) {
      const pluginSteps = beforeFetchByPlugin.get(pluginName);

      if (pluginSteps && pluginSteps.length > 0) {
        if (pluginSteps.length === 1) {
          timelineItems.push(this.renderTimelineStep(trace.id, pluginSteps[0]!));
        } else {
          timelineItems.push(this.renderGroupedSteps(trace.id, pluginSteps));
        }
      } else if (this.showPassedPlugins) {
        timelineItems.push(this.renderPassedPlugin(pluginName));
      }
    }

    if (fetchStep) {
      timelineItems.push(this.renderTimelineStep(trace.id, fetchStep));
    }

    const groupedAfterSteps = this.groupConsecutiveSteps(afterFetchSteps);

    for (const group of groupedAfterSteps) {
      if (group.length === 1) {
        timelineItems.push(this.renderTimelineStep(trace.id, group[0]!));
      } else {
        timelineItems.push(this.renderGroupedSteps(trace.id, group));
      }
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

  private groupConsecutiveSteps(steps: PluginStepEvent[]): PluginStepEvent[][] {
    if (steps.length === 0) return [];

    const groups: PluginStepEvent[][] = [];
    let currentGroup: PluginStepEvent[] = [steps[0]!];

    for (let i = 1; i < steps.length; i++) {
      const step = steps[i]!;
      const prevStep = steps[i - 1]!;

      if (step.plugin === prevStep.plugin) {
        currentGroup.push(step);
      } else {
        groups.push(currentGroup);
        currentGroup = [step];
      }
    }

    groups.push(currentGroup);
    return groups;
  }

  private renderGroupedSteps(
    traceId: string,
    steps: PluginStepEvent[]
  ): string {
    const firstStep = steps[0]!;
    const lastStep = steps[steps.length - 1]!;
    const groupKey = `${traceId}:group:${firstStep.plugin}:${firstStep.timestamp}`;
    const isExpanded = this.expandedGroups.has(groupKey);
    const displayName = firstStep.plugin.replace("spoosh:", "");

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

    const dotColor = firstStep.color
      ? colorMap[firstStep.color]
      : stageColors[firstStep.stage] || "var(--spoosh-text-muted)";

    const firstReason = firstStep.reason || "";
    const lastReason = lastStep.reason || "";
    const summaryReason =
      firstReason && lastReason && firstReason !== lastReason
        ? `${firstReason} → ${lastReason}`
        : firstReason || lastReason;

    if (isExpanded) {
      const expandedItems = steps
        .map((step) => this.renderTimelineStep(traceId, step))
        .join("");

      return `
        <div class="spoosh-timeline-group expanded" data-group-key="${groupKey}">
          <div class="spoosh-timeline-group-header" data-action="toggle-group">
            <div class="spoosh-timeline-dot" style="background: ${dotColor}"></div>
            <span class="spoosh-timeline-plugin">${displayName}</span>
            <span class="spoosh-timeline-stage">${firstStep.stage}</span>
            <span class="spoosh-timeline-group-count">${steps.length}×</span>
            <span class="spoosh-plugin-expand">▼</span>
          </div>
          <div class="spoosh-timeline-group-items">
            ${expandedItems}
          </div>
        </div>
      `;
    }

    return `
      <div class="spoosh-timeline-group" data-group-key="${groupKey}">
        <div class="spoosh-timeline-group-header" data-action="toggle-group">
          <div class="spoosh-timeline-dot" style="background: ${dotColor}"></div>
          <span class="spoosh-timeline-plugin">${displayName}</span>
          <span class="spoosh-timeline-stage">${firstStep.stage}</span>
          <span class="spoosh-timeline-group-count">${steps.length}×</span>
          ${summaryReason ? `<span class="spoosh-timeline-reason">${escapeHtml(summaryReason)}</span>` : ""}
          <span class="spoosh-plugin-expand">▶</span>
        </div>
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

    this.sidebar.onmousedown = (e) => {
      const target = e.target as HTMLElement;
      const tab = target.closest("[data-tab]")?.getAttribute("data-tab");

      if (tab) {
        e.preventDefault();
        this.activeTab = tab as DetailTab;
        this.renderImmediate();
      }
    };

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
      const stepKey = target
        .closest("[data-step-key]")
        ?.getAttribute("data-step-key");
      const groupKey = target
        .closest("[data-group-key]")
        ?.getAttribute("data-group-key");

      if (action === "close") {
        this.close();
      } else if (action === "settings") {
        this.showSettings = !this.showSettings;
        this.renderImmediate();
      } else if (action === "clear") {
        this.store.clear();
        this.selectedTraceId = null;
        this.expandedSteps.clear();
        this.renderImmediate();
      } else if (action === "toggle-step" && stepKey) {
        if (this.expandedSteps.has(stepKey)) {
          this.expandedSteps.delete(stepKey);
        } else {
          this.expandedSteps.add(stepKey);
        }
        this.renderImmediate();
      } else if (action === "toggle-passed") {
        this.showPassedPlugins = !this.showPassedPlugins;
        this.renderImmediate();
      } else if (action === "toggle-group" && groupKey) {
        if (this.expandedGroups.has(groupKey)) {
          this.expandedGroups.delete(groupKey);
        } else {
          this.expandedGroups.add(groupKey);
        }
        this.renderImmediate();
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
          this.renderImmediate();
        }
      } else if (traceId && !action) {
        this.selectedTraceId = traceId;
        this.expandedSteps.clear();
        this.renderImmediate();
      } else if (filter) {
        const filters = this.store.getFilters();
        const newTypes = new Set(filters.operationTypes);

        if (newTypes.has(filter as OperationType)) {
          newTypes.delete(filter as OperationType);
        } else {
          newTypes.add(filter as OperationType);
        }

        this.store.setFilter("operationTypes", newTypes);
        this.renderImmediate();
      }
    };

    this.sidebar.onchange = (e) => {
      const target = e.target as HTMLInputElement;
      const setting = target.getAttribute("data-setting");

      if (setting === "showPassedPlugins") {
        this.showPassedPlugins = target.checked;
        this.saveSettings();
        this.renderImmediate();
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

    if (this.shadowRoot) {
      injectStyles(getThemeCSS(this.theme), this.shadowRoot);
    }
  }

  unmount(): void {
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }

    if (this.renderRAF !== null) {
      cancelAnimationFrame(this.renderRAF);
      this.renderRAF = null;
    }

    if (this.pendingRenderTimeout !== null) {
      clearTimeout(this.pendingRenderTimeout);
      this.pendingRenderTimeout = null;
    }

    document.removeEventListener("mousemove", this.boundHandleMouseMove);
    document.removeEventListener("mouseup", this.boundHandleMouseUp);

    this.shadowHost?.remove();
    this.shadowHost = null;
    this.shadowRoot = null;
    this.fab = null;
    this.sidebar = null;
    this.resizeHandle = null;
    this.dividerHandle = null;
    removeStyles();
  }
}
