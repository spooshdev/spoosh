import type {
  DevToolStoreInterface,
  DevToolTheme,
  ExportedTrace,
} from "../types";
import { createActionRouter } from "./action-router";
import {
  renderHeader,
  renderTraceList,
  renderEventList,
  renderDetailPanel,
  renderEventRow,
  renderPluginsTab,
  renderDataTab,
  renderMetaTab,
  getMetaCount,
  renderBottomBar,
  renderCacheList,
  renderCacheDetail,
  renderSettings,
  renderImportList,
  renderImportDetail,
} from "./render";
import { createRenderScheduler } from "./render-scheduler";
import { createResizeController } from "./resize-controller";
import { injectStyles, removeStyles } from "./styles/inject";
import { getThemeCSS, resolveTheme } from "./styles/theme";
import { getLogo } from "./utils";
import {
  createViewModel,
  type PositionMode,
  type SidebarPosition,
} from "./view-model";

interface DevToolPanelOptions {
  store: DevToolStoreInterface;
  showFloatingIcon: boolean;
}

export class DevToolPanel {
  private shadowHost: HTMLDivElement | null = null;
  private shadowRoot: ShadowRoot | null = null;
  private fab: HTMLButtonElement | null = null;
  private sidebar: HTMLDivElement | null = null;
  private store: DevToolStoreInterface;
  private theme: DevToolTheme;
  private showFloatingIcon: boolean;
  private unsubscribe: (() => void) | null = null;
  private traceCount = 0;
  private lastSeenCount = 0;

  private viewModel = createViewModel();
  private renderScheduler = createRenderScheduler();
  private resizeController = createResizeController(this.viewModel);
  private actionRouter!: ReturnType<typeof createActionRouter>;

  constructor(options: DevToolPanelOptions) {
    this.store = options.store;
    this.theme = resolveTheme(this.viewModel.getState().theme);
    this.showFloatingIcon = options.showFloatingIcon;

    this.actionRouter = createActionRouter(this.viewModel, this.store, {
      onRender: () => this.renderImmediate(),
      onPartialRender: () =>
        this.renderScheduler.immediate(() => this.partialUpdate()),
      onClose: () => this.close(),
      onExport: () => this.exportTraces(),
      onThemeChange: (theme) => this.setTheme(theme),
      onPositionChange: (position) => this.setPosition(position),
      onSidebarPositionChange: (position) => this.setSidebarPosition(position),
      onMaxHistoryChange: (value) => this.store.setMaxHistory(value),
      onInvalidateCache: (key) => {
        this.store.invalidateCacheEntry(key);
        this.renderImmediate();
      },
      onDeleteCache: (key) => {
        this.store.deleteCacheEntry(key);
        this.viewModel.selectCacheEntry(null);
        this.renderImmediate();
      },
      onClearAllCache: () => {
        this.store.clearAllCache();
        this.viewModel.selectCacheEntry(null);
        this.renderImmediate();
      },
      onImportFile: () => this.triggerFileImport(),
      onClearImports: () => {
        this.store.clearImportedTraces();
        this.viewModel.selectImportedTrace(null);
        this.viewModel.setImportedSearchQuery("");
        this.renderImmediate();
      },
    });
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
      this.fab.className = this.viewModel.getState().position;
      this.fab.innerHTML = getLogo(20, 18);
      this.setupFabDrag();
      this.shadowRoot.appendChild(this.fab);
    }

    this.sidebar = document.createElement("div");
    this.sidebar.id = "spoosh-devtool-sidebar";

    if (this.viewModel.getState().sidebarPosition === "left") {
      this.sidebar.classList.add("left");
    } else if (this.viewModel.getState().sidebarPosition === "bottom") {
      this.sidebar.classList.add("bottom");
    }

    this.resizeController.updateSidebarDOM(this.sidebar);
    this.shadowRoot.appendChild(this.sidebar);

    const savedMaxHistory = this.viewModel.getMaxHistory();
    this.store.setMaxHistory(savedMaxHistory);

    this.unsubscribe = this.store.subscribe(() => {
      const newCount = this.store.getTraces().length;

      if (newCount !== this.traceCount) {
        this.traceCount = newCount;

        if (this.viewModel.getState().isOpen) {
          this.lastSeenCount = newCount;
        }

        this.updateBadge();
      }

      if (this.viewModel.getState().isOpen) {
        this.renderScheduler.schedule(() => this.partialUpdate());
      }
    });

    this.render();
  }

  private renderImmediate(): void {
    this.renderScheduler.immediate(() => this.render());
  }

  private partialUpdate(): void {
    if (!this.sidebar) return;

    const state = this.viewModel.getState();

    if (state.activeView === "cache") {
      this.partialUpdateCache();
      return;
    }

    if (state.activeView === "import") {
      this.partialUpdateImport();
      return;
    }

    const traces = this.store.getFilteredTraces(state.searchQuery);
    const events = this.store.getEvents();
    const selectedTrace = state.selectedTraceId
      ? traces.find((t) => t.id === state.selectedTraceId)
      : null;

    const requestsSection = this.sidebar.querySelector(
      ".spoosh-requests-section"
    );

    if (requestsSection) {
      const countEl = requestsSection.querySelector(".spoosh-section-count");

      if (countEl) {
        countEl.textContent = String(traces.length);
      }

      const existingList = requestsSection.querySelector(
        ".spoosh-traces, .spoosh-empty"
      );

      if (existingList) {
        existingList.outerHTML = renderTraceList(traces, state.selectedTraceId);
      }
    }

    const eventsSection = this.sidebar.querySelector(".spoosh-events-section");

    if (eventsSection) {
      const countEl = eventsSection.querySelector(".spoosh-section-count");

      if (countEl) {
        countEl.textContent = String(events.length);
      }

      const existingList = eventsSection.querySelector(
        ".spoosh-events, .spoosh-empty"
      );

      if (existingList) {
        if (events.length === 0) {
          existingList.outerHTML = `<div class="spoosh-empty">No events yet</div>`;
        } else {
          existingList.outerHTML = `
            <div class="spoosh-events">
              ${[...events]
                .reverse()
                .map((event) => renderEventRow(event))
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
        const statusClass = isPending
          ? "pending"
          : hasError
            ? "error"
            : "success";
        const statusLabel = isPending
          ? "Pending"
          : hasError
            ? "Error"
            : "Success";
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
        dataTabBtn.textContent = isPending
          ? "Fetching"
          : hasError
            ? "Error"
            : "Data";
      }

      const pluginCount = this.getActivePluginCount(selectedTrace);
      const pluginsTabBtn = this.sidebar.querySelector('[data-tab="plugins"]');

      if (pluginsTabBtn) {
        pluginsTabBtn.textContent = `Plugins ${pluginCount > 0 ? `(${pluginCount})` : ""}`;
      }

      const metaTabBtn = this.sidebar.querySelector('[data-tab="meta"]');

      if (metaTabBtn) {
        const metaCount = getMetaCount(selectedTrace);
        metaTabBtn.textContent = `Meta${metaCount > 0 ? ` (${metaCount})` : ""}`;
      }

      if (tabContent) {
        if (state.activeTab === "plugins") {
          tabContent.innerHTML = renderPluginsTab({
            trace: selectedTrace,
            knownPlugins: this.store.getKnownPlugins(
              selectedTrace.operationType
            ),
            showPassedPlugins: state.showPassedPlugins,
            expandedSteps: state.expandedSteps,
            expandedGroups: state.expandedGroups,
            fullDiffViews: state.fullDiffViews,
          });
        } else if (state.activeTab === "data") {
          const currentlyShowingSpinner =
            tabContent.querySelector(".spoosh-spinner");

          if (currentlyShowingSpinner && !isPending) {
            tabContent.innerHTML = renderDataTab(selectedTrace);
          }
        } else if (state.activeTab === "meta") {
          const currentlyShowingSpinner =
            tabContent.querySelector(".spoosh-spinner");

          if (currentlyShowingSpinner && !isPending) {
            tabContent.innerHTML = renderMetaTab(selectedTrace);
          }
        }

        if (savedScrollTop > 0) {
          tabContent.scrollTop = savedScrollTop;
        }
      }
    }
  }

  private partialUpdateCache(): void {
    if (!this.sidebar) return;

    const state = this.viewModel.getState();
    const cacheEntries = this.store.getCacheEntries(state.searchQuery);

    const cacheSection = this.sidebar.querySelector(".spoosh-cache-section");

    if (cacheSection) {
      const countEl = cacheSection.querySelector(".spoosh-section-count");

      if (countEl) {
        countEl.textContent = String(cacheEntries.length);
      }

      const existingList = cacheSection.querySelector(
        ".spoosh-cache-entries, .spoosh-empty"
      );

      if (existingList) {
        existingList.outerHTML = renderCacheList({
          entries: cacheEntries,
          selectedKey: state.selectedCacheKey,
          searchQuery: state.searchQuery,
        });
      }
    }

    const selectedEntry = state.selectedCacheKey
      ? cacheEntries.find((e) => e.queryKey === state.selectedCacheKey)
      : null;

    if (selectedEntry) {
      const detailPanel = this.sidebar.querySelector(".spoosh-detail-panel");

      if (detailPanel) {
        detailPanel.outerHTML = renderCacheDetail({
          entry: selectedEntry,
          activeTab: state.internalTab,
        });
      }
    }
  }

  private updateBadge(): void {
    if (!this.fab) return;

    const badge = this.fab.querySelector(".badge");
    const state = this.viewModel.getState();
    const newCount = this.traceCount - this.lastSeenCount;

    if (newCount > 0 && !state.isOpen) {
      if (badge) {
        badge.textContent = String(Math.min(newCount, 99));
      } else {
        const newBadge = document.createElement("span");
        newBadge.className = "badge";
        newBadge.textContent = String(Math.min(newCount, 99));
        this.fab.appendChild(newBadge);
      }
    } else {
      badge?.remove();
    }
  }

  private render(): void {
    if (!this.sidebar) return;

    const state = this.viewModel.getState();
    const tabContent = this.sidebar.querySelector(".spoosh-tab-content");
    const savedScrollTop = tabContent?.scrollTop ?? 0;

    const listScrollable = this.sidebar.querySelector(
      ".spoosh-traces, .spoosh-cache-entries"
    );
    const savedListScrollTop = listScrollable?.scrollTop ?? 0;

    const mainContent =
      state.activeView === "requests"
        ? this.renderRequestsView()
        : state.activeView === "cache"
          ? this.renderCacheView()
          : this.renderImportView();

    this.sidebar.innerHTML = `
      <div class="spoosh-resize-handle"></div>
      <div class="spoosh-panel">
        ${mainContent}
      </div>
      ${renderBottomBar({ activeView: state.activeView, theme: state.theme })}
    `;

    this.setupResizeHandlers();
    this.attachEvents();

    if (savedScrollTop > 0) {
      const newTabContent = this.sidebar.querySelector(".spoosh-tab-content");

      if (newTabContent) {
        newTabContent.scrollTop = savedScrollTop;
      }
    }

    if (savedListScrollTop > 0) {
      const newListScrollable = this.sidebar.querySelector(
        ".spoosh-traces, .spoosh-cache-entries"
      );

      if (newListScrollable) {
        newListScrollable.scrollTop = savedListScrollTop;
      }
    }
  }

  private renderRequestsView(): string {
    const state = this.viewModel.getState();
    const traces = this.store.getFilteredTraces(state.searchQuery);
    const events = this.store.getEvents();
    const filters = this.store.getFilters();
    const activeCount = this.store.getActiveCount();
    const selectedTrace = state.selectedTraceId
      ? traces.find((t) => t.id === state.selectedTraceId)
      : null;

    const detailContent = renderDetailPanel({
      trace: selectedTrace ?? null,
      showSettings: state.showSettings,
      activeTab: state.activeTab,
      showPassedPlugins: state.showPassedPlugins,
      expandedSteps: state.expandedSteps,
      expandedGroups: state.expandedGroups,
      fullDiffViews: state.fullDiffViews,
      knownPlugins: selectedTrace
        ? this.store.getKnownPlugins(selectedTrace.operationType)
        : [],
      theme: state.theme,
      position: state.position,
      sidebarPosition: state.sidebarPosition,
      maxHistory: state.maxHistory,
    });

    return `
      <div class="spoosh-list-panel" style="width: ${state.listPanelWidth}px; min-width: ${state.listPanelWidth}px;">
        ${renderHeader({ filters, showSettings: state.showSettings, searchQuery: state.searchQuery })}
        <div class="spoosh-list-content">
          <div class="spoosh-requests-section" style="flex: ${state.requestsPanelHeight};">
            <div class="spoosh-section-header">
              <span class="spoosh-section-title">Requests</span>
              <span class="spoosh-section-count">${activeCount > 0 ? `<span class="spoosh-active-count">${activeCount}</span> / ` : ""}${traces.length}</span>
            </div>
            ${renderTraceList(traces, state.selectedTraceId)}
          </div>
          <div class="spoosh-horizontal-divider"></div>
          <div class="spoosh-events-section" style="flex: ${1 - state.requestsPanelHeight};">
            <div class="spoosh-section-header">
              <span class="spoosh-section-title">Events</span>
              <span class="spoosh-section-count">${events.length}</span>
            </div>
            ${renderEventList(events)}
          </div>
        </div>
      </div>
      <div class="spoosh-divider-handle"></div>
      ${detailContent}
    `;
  }

  private renderCacheView(): string {
    const state = this.viewModel.getState();
    const cacheEntries = this.store.getCacheEntries(state.searchQuery);
    const selectedEntry = state.selectedCacheKey
      ? cacheEntries.find((e) => e.queryKey === state.selectedCacheKey)
      : null;

    const detailPanel = state.showSettings
      ? renderSettings({
          showPassedPlugins: state.showPassedPlugins,
          theme: state.theme,
          position: state.position,
          sidebarPosition: state.sidebarPosition,
          maxHistory: state.maxHistory,
        })
      : renderCacheDetail({
          entry: selectedEntry ?? null,
          activeTab: state.internalTab,
        });

    return `
      <div class="spoosh-list-panel" style="width: ${state.listPanelWidth}px; min-width: ${state.listPanelWidth}px;">
        ${renderHeader({ filters: this.store.getFilters(), showSettings: state.showSettings, searchQuery: state.searchQuery, hideFilters: true, hideClear: true })}
        <div class="spoosh-list-content">
          <div class="spoosh-cache-section">
            <div class="spoosh-section-header">
              <span class="spoosh-section-title">Cache Entries</span>
              <span class="spoosh-section-count">${cacheEntries.length}</span>
            </div>
            ${renderCacheList({
              entries: cacheEntries,
              selectedKey: state.selectedCacheKey,
              searchQuery: state.searchQuery,
            })}
          </div>
          ${
            cacheEntries.length > 0
              ? `<div class="spoosh-cache-clear-all">
                  <button class="spoosh-cache-action-btn danger" data-action="clear-all-cache">
                    Clear All Cache
                  </button>
                </div>`
              : ""
          }
        </div>
      </div>
      <div class="spoosh-divider-handle"></div>
      ${detailPanel}
    `;
  }

  private renderImportView(): string {
    const state = this.viewModel.getState();
    const session = this.store.getImportedSession();
    const traces = this.store.getFilteredImportedTraces(
      state.importedSearchQuery
    );
    const selectedTrace = state.selectedImportedTraceId
      ? traces.find((t) => t.id === state.selectedImportedTraceId)
      : null;

    const detailPanel = state.showSettings
      ? renderSettings({
          showPassedPlugins: state.showPassedPlugins,
          theme: state.theme,
          position: state.position,
          sidebarPosition: state.sidebarPosition,
          maxHistory: state.maxHistory,
        })
      : renderImportDetail({
          trace: selectedTrace ?? null,
          activeTab: state.activeTab,
          expandedSteps: state.expandedSteps,
          expandedGroups: state.expandedGroups,
          fullDiffViews: state.fullDiffViews,
        });

    const hasSession = session !== null;

    return `
      <div class="spoosh-list-panel" style="width: ${state.listPanelWidth}px; min-width: ${state.listPanelWidth}px;">
        ${renderHeader({ filters: this.store.getFilters(), showSettings: state.showSettings, searchQuery: state.importedSearchQuery, hideFilters: true, hideClear: true })}
        <div class="spoosh-list-content">
          <div class="spoosh-import-section">
            ${
              hasSession
                ? `<div class="spoosh-section-header">
                    <span class="spoosh-section-title">${this.escapeHtml(session.filename)}</span>
                    <span class="spoosh-section-count">${traces.length}</span>
                  </div>`
                : ""
            }
            ${renderImportList({
              traces,
              selectedTraceId: state.selectedImportedTraceId,
              filename: session?.filename ?? null,
            })}
          </div>
          ${
            hasSession
              ? `<div class="spoosh-cache-clear-all">
                  <button class="spoosh-import-btn" data-action="import-file">
                    Import New File
                  </button>
                  <button class="spoosh-cache-action-btn danger" data-action="clear-imports">
                    Clear
                  </button>
                </div>`
              : ""
          }
        </div>
      </div>
      <div class="spoosh-divider-handle"></div>
      ${detailPanel}
    `;
  }

  private partialUpdateImport(): void {
    if (!this.sidebar) return;

    const state = this.viewModel.getState();
    const traces = this.store.getFilteredImportedTraces(
      state.importedSearchQuery
    );

    const importSection = this.sidebar.querySelector(".spoosh-import-section");

    if (importSection) {
      const countEl = importSection.querySelector(".spoosh-section-count");

      if (countEl) {
        countEl.textContent = String(traces.length);
      }

      const existingList = importSection.querySelector(
        ".spoosh-traces, .spoosh-empty, .spoosh-import-empty"
      );

      if (existingList) {
        existingList.outerHTML = renderImportList({
          traces,
          selectedTraceId: state.selectedImportedTraceId,
          filename: this.store.getImportedSession()?.filename ?? null,
        });
      }
    }

    const selectedTrace = state.selectedImportedTraceId
      ? traces.find((t) => t.id === state.selectedImportedTraceId)
      : null;

    if (selectedTrace) {
      const detailPanel = this.sidebar.querySelector(".spoosh-detail-panel");

      if (detailPanel) {
        detailPanel.outerHTML = renderImportDetail({
          trace: selectedTrace,
          activeTab: state.activeTab,
          expandedSteps: state.expandedSteps,
          expandedGroups: state.expandedGroups,
          fullDiffViews: state.fullDiffViews,
        });
      }
    }
  }

  private triggerFileImport(): void {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";

    input.onchange = () => {
      const file = input.files?.[0];

      if (!file) return;

      const reader = new FileReader();

      reader.onload = () => {
        try {
          const data = JSON.parse(reader.result as string);
          const traces = this.validateImportData(data);

          if (traces) {
            this.store.importTraces(traces, file.name);
            this.viewModel.selectImportedTrace(null);
            this.viewModel.setImportedSearchQuery("");
            this.renderImmediate();
          }
        } catch {
          // Invalid JSON file
        }
      };

      reader.readAsText(file);
    };

    input.click();
  }

  private validateImportData(data: unknown): ExportedTrace[] | null {
    if (!Array.isArray(data)) return null;

    return data.filter(
      (item): item is ExportedTrace =>
        typeof item === "object" &&
        item !== null &&
        typeof item.id === "string" &&
        typeof item.path === "string" &&
        typeof item.operationType === "string" &&
        typeof item.method === "string"
    );
  }

  private escapeHtml(str: string): string {
    return str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  private setupResizeHandlers(): void {
    if (!this.sidebar) return;

    const resizeHandle = this.sidebar.querySelector(
      ".spoosh-resize-handle"
    ) as HTMLElement;
    const dividerHandle = this.sidebar.querySelector(
      ".spoosh-divider-handle"
    ) as HTMLElement;
    const horizontalDivider = this.sidebar.querySelector(
      ".spoosh-horizontal-divider"
    ) as HTMLElement;
    const listContent = this.sidebar.querySelector(
      ".spoosh-list-content"
    ) as HTMLElement;

    if (resizeHandle) {
      this.resizeController.setupSidebarResize(resizeHandle);
    }

    if (dividerHandle) {
      this.resizeController.setupDividerResize(dividerHandle);
    }

    if (horizontalDivider && listContent) {
      this.resizeController.setupHorizontalResize(
        horizontalDivider,
        listContent
      );
    }
  }

  private getActivePluginCount(trace: {
    steps: Array<{ stage: string; plugin: string }>;
  }): number {
    const activePlugins = new Set(
      trace.steps
        .filter(
          (step) => step.stage !== "skip" && step.plugin !== "spoosh:fetch"
        )
        .map((step) => step.plugin)
    );
    return activePlugins.size;
  }

  private startSidebarDrag(e: MouseEvent): void {
    e.preventDefault();
    const startX = e.clientX;
    const startY = e.clientY;
    const currentPosition = this.viewModel.getState().sidebarPosition;
    let pendingPosition: SidebarPosition | null = null;
    let placeholder: HTMLDivElement | null = null;

    document.body.style.cursor = "grabbing";
    document.body.style.userSelect = "none";

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const dragDx = moveEvent.clientX - startX;
      const dragDy = moveEvent.clientY - startY;
      const threshold = 50;

      if (Math.abs(dragDx) < threshold && Math.abs(dragDy) < threshold) {
        pendingPosition = null;
        placeholder?.remove();
        placeholder = null;
        return;
      }

      const midX = window.innerWidth / 2;
      const midY = window.innerHeight / 2;
      const cursorX = moveEvent.clientX;
      const cursorY = moveEvent.clientY;

      let newPosition: SidebarPosition;

      if (cursorY > midY) {
        newPosition = "bottom";
      } else if (cursorX < midX) {
        newPosition = "left";
      } else {
        newPosition = "right";
      }

      if (pendingPosition !== newPosition) {
        pendingPosition = newPosition;

        if (!placeholder) {
          placeholder = document.createElement("div");
          placeholder.className = "spoosh-drag-placeholder";
          this.shadowRoot?.appendChild(placeholder);
        }

        placeholder.classList.remove("bottom");
        placeholder.style.width = "";
        placeholder.style.height = "";
        placeholder.style.left = "";
        placeholder.style.right = "";

        if (newPosition === "bottom") {
          const sidebarHeight = this.viewModel.getState().sidebarHeight;
          placeholder.classList.add("bottom");
          placeholder.style.left = "0";
          placeholder.style.right = "0";
          placeholder.style.height = `${sidebarHeight}px`;
        } else {
          const sidebarWidth = this.viewModel.getState().sidebarWidth;
          placeholder.style.width = `${sidebarWidth}px`;
          placeholder.style.left = newPosition === "left" ? "0" : "";
          placeholder.style.right = newPosition === "right" ? "0" : "";
        }
      }
    };

    const handleMouseUp = () => {
      if (pendingPosition && pendingPosition !== currentPosition) {
        this.viewModel.setSidebarPosition(pendingPosition);
        this.setSidebarPosition(pendingPosition);
        this.renderImmediate();
      }

      cleanup();
    };

    const cleanup = () => {
      placeholder?.remove();
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  }

  private attachEvents(): void {
    if (!this.sidebar) return;

    this.sidebar.onmousedown = (e) => {
      const target = e.target as HTMLElement;

      if (target.classList.contains("spoosh-header")) {
        this.startSidebarDrag(e);
        return;
      }

      if (target.closest(".spoosh-detail-title")) {
        this.startSidebarDrag(e);
        return;
      }

      const intent = this.actionRouter.parseIntent(e);

      if (intent?.type === "select-tab") {
        e.preventDefault();
        this.actionRouter.dispatch(intent);
      }
    };

    this.sidebar.onclick = (e) => {
      const intent = this.actionRouter.parseIntent(e);

      if (intent && intent.type !== "select-tab") {
        this.actionRouter.dispatch(intent);
      }
    };

    this.sidebar.onchange = (e) => {
      const intent = this.actionRouter.parseIntent(e);

      if (intent) {
        this.actionRouter.dispatch(intent);
      }
    };

    this.sidebar.oninput = (e) => {
      const intent = this.actionRouter.parseIntent(e);

      if (intent) {
        this.actionRouter.dispatch(intent);
      }
    };
  }

  open(): void {
    this.viewModel.open();
    this.sidebar?.classList.add("open");
    this.lastSeenCount = this.traceCount;
    this.updateBadge();
    this.render();
  }

  close(): void {
    this.viewModel.close();
    this.sidebar?.classList.remove("open");
  }

  private exportTraces(): void {
    const traces = this.store.getTraces();

    if (traces.length === 0) {
      return;
    }

    const exportData = traces.map((trace) => ({
      id: trace.id,
      queryKey: trace.queryKey,
      operationType: trace.operationType,
      method: trace.method,
      path: trace.path,
      timestamp: trace.timestamp,
      duration: trace.duration,
      request: trace.request,
      response: trace.response,
      meta: trace.meta,
      steps: trace.steps.map((step) => ({
        plugin: step.plugin,
        stage: step.stage,
        timestamp: step.timestamp,
        duration: step.duration,
        reason: step.reason,
        color: step.color,
        diff: step.diff,
        info: step.info,
      })),
    }));

    const json = JSON.stringify(exportData, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const filename = `spoosh-traces-${timestamp}.json`;

    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();

    URL.revokeObjectURL(url);
  }

  toggle(): void {
    if (this.viewModel.getState().isOpen) {
      this.close();
    } else {
      this.open();
    }
  }

  private setupFabDrag(): void {
    if (!this.fab) return;

    let isDragging = false;
    let startX = 0;
    let startY = 0;
    let hasMoved = false;

    const handleMouseDown = (e: MouseEvent) => {
      if (!this.fab) return;

      isDragging = true;
      hasMoved = false;
      startX = e.clientX;
      startY = e.clientY;

      this.fab.style.transition = "none";
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging || !this.fab) return;

      const dx = Math.abs(e.clientX - startX);
      const dy = Math.abs(e.clientY - startY);

      if (dx > 5 || dy > 5) {
        hasMoved = true;
      }

      if (hasMoved) {
        this.fab.style.top = `${e.clientY - 20}px`;
        this.fab.style.left = `${e.clientX - 20}px`;
        this.fab.style.bottom = "auto";
        this.fab.style.right = "auto";
      }
    };

    const handleMouseUp = (e: MouseEvent) => {
      if (!this.fab) return;

      isDragging = false;
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);

      if (!hasMoved) {
        this.fab.style.transition = "";
        this.fab.style.top = "";
        this.fab.style.left = "";
        this.fab.style.bottom = "";
        this.fab.style.right = "";
        this.toggle();
        return;
      }

      const x = e.clientX;
      const y = e.clientY;
      const midX = window.innerWidth / 2;
      const midY = window.innerHeight / 2;

      let newPosition: PositionMode;
      let targetTop: string;
      let targetLeft: string;

      if (x < midX && y < midY) {
        newPosition = "top-left";
        targetTop = "20px";
        targetLeft = "20px";
      } else if (x >= midX && y < midY) {
        newPosition = "top-right";
        targetTop = "20px";
        targetLeft = `${window.innerWidth - 60}px`;
      } else if (x < midX && y >= midY) {
        newPosition = "bottom-left";
        targetTop = `${window.innerHeight - 60}px`;
        targetLeft = "20px";
      } else {
        newPosition = "bottom-right";
        targetTop = `${window.innerHeight - 60}px`;
        targetLeft = `${window.innerWidth - 60}px`;
      }

      this.fab.style.transition = "top 0.2s ease, left 0.2s ease";
      this.fab.style.top = targetTop;
      this.fab.style.left = targetLeft;

      setTimeout(() => {
        if (!this.fab) return;

        this.fab.style.transition = "";
        this.fab.style.top = "";
        this.fab.style.left = "";
        this.fab.style.bottom = "";
        this.fab.style.right = "";
        this.viewModel.setPosition(newPosition);
        this.setPosition(newPosition);
      }, 200);
    };

    this.fab.addEventListener("mousedown", handleMouseDown);
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

  setPosition(position: PositionMode): void {
    if (this.fab) {
      this.fab.className = position;
    }
  }

  setSidebarPosition(position: SidebarPosition): void {
    if (this.sidebar) {
      this.sidebar.classList.remove("left", "bottom");

      if (position === "left") {
        this.sidebar.classList.add("left");
      } else if (position === "bottom") {
        this.sidebar.classList.add("bottom");
      }

      this.resizeController.updateSidebarDOM(this.sidebar);
    }
  }

  unmount(): void {
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }

    this.renderScheduler.cancel();
    this.resizeController.cleanup();

    this.shadowHost?.remove();
    this.shadowHost = null;
    this.shadowRoot = null;
    this.fab = null;
    this.sidebar = null;
    removeStyles();
  }
}
