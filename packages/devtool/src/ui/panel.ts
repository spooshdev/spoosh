import type { DevToolStoreInterface, DevToolTheme } from "../types";
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
} from "./render";
import { createRenderScheduler } from "./render-scheduler";
import { createResizeController } from "./resize-controller";
import { injectStyles, removeStyles } from "./styles/inject";
import { getThemeCSS, resolveTheme } from "./styles/theme";
import { getLogo } from "./utils";
import { createViewModel, type PositionMode } from "./view-model";

function isLeftPosition(position: PositionMode): boolean {
  return position === "bottom-left" || position === "top-left";
}

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
      onThemeChange: (theme) => this.setTheme(theme),
      onPositionChange: (position) => this.setPosition(position),
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
      this.fab.onclick = () => this.toggle();
      this.shadowRoot.appendChild(this.fab);
    }

    this.sidebar = document.createElement("div");
    this.sidebar.id = "spoosh-devtool-sidebar";

    if (isLeftPosition(this.viewModel.getState().position)) {
      this.sidebar.classList.add("left");
    }

    this.resizeController.updateSidebarDOM(this.sidebar);
    this.shadowRoot.appendChild(this.sidebar);

    this.unsubscribe = this.store.subscribe(() => {
      const newCount = this.store.getTraces().length;

      if (newCount !== this.traceCount) {
        this.traceCount = newCount;
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

  private updateBadge(): void {
    if (!this.fab) return;

    const badge = this.fab.querySelector(".badge");
    const state = this.viewModel.getState();

    if (this.traceCount > 0 && !state.isOpen) {
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

    const state = this.viewModel.getState();
    const tabContent = this.sidebar.querySelector(".spoosh-tab-content");
    const savedScrollTop = tabContent?.scrollTop ?? 0;

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
    });

    this.sidebar.innerHTML = `
      <div class="spoosh-resize-handle"></div>
      <div class="spoosh-panel">
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
      </div>
    `;

    this.setupResizeHandlers();
    this.attachEvents();

    if (savedScrollTop > 0) {
      const newTabContent = this.sidebar.querySelector(".spoosh-tab-content");

      if (newTabContent) {
        newTabContent.scrollTop = savedScrollTop;
      }
    }
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
        .filter((step) => step.stage !== "skip" && step.plugin !== "spoosh:fetch")
        .map((step) => step.plugin)
    );
    return activePlugins.size;
  }

  private attachEvents(): void {
    if (!this.sidebar) return;

    this.sidebar.onmousedown = (e) => {
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
    this.updateBadge();
    this.render();
  }

  close(): void {
    this.viewModel.close();
    this.sidebar?.classList.remove("open");
  }

  toggle(): void {
    if (this.viewModel.getState().isOpen) {
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

  setPosition(position: PositionMode): void {
    if (this.fab) {
      this.fab.className = position;
    }

    if (this.sidebar) {
      if (isLeftPosition(position)) {
        this.sidebar.classList.add("left");
      } else {
        this.sidebar.classList.remove("left");
      }
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
