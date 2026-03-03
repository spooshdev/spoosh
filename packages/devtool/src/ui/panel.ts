import type {
  DevToolStoreInterface,
  DevToolTheme,
  ExportedItem,
  SubscriptionTrace,
} from "../types";
import { createActionRouter } from "./action-router";
import {
  renderHeader,
  renderUnifiedTraceList,
  renderEventList,
  renderDetailPanel,
  renderEventRow,
  renderPluginsTab,
  renderDataTab,
  renderMetaTab,
  getMetaCount,
  renderBottomBar,
  renderStateList,
  renderStateDetail,
  renderSettings,
  renderImportList,
  renderImportDetail,
  renderSubscriptionDetail,
  renderSubscriptionTabs,
} from "./render";
import { createRenderScheduler } from "./render-scheduler";
import { createResizeController } from "./resize-controller";
import { injectStyles, removeStyles } from "./styles/inject";
import { getThemeCSS, resolveTheme } from "./styles/theme";
import { escapeHtml, getLogo } from "./utils";
import {
  createViewModel,
  type PositionMode,
  type SidebarPosition,
} from "./view-model";

interface DevToolPanelOptions {
  store: DevToolStoreInterface;
  showFloatingIcon: boolean;
  sensitiveHeaders: Set<string>;
  containerId?: string;
}

export class DevToolPanel {
  private shadowHost: HTMLDivElement | null = null;
  private shadowRoot: ShadowRoot | null = null;
  private fab: HTMLButtonElement | null = null;
  private sidebar: HTMLDivElement | null = null;
  private store: DevToolStoreInterface;
  private theme: DevToolTheme;
  private showFloatingIcon: boolean;
  private sensitiveHeaders: Set<string>;
  private unsubscribe: (() => void) | null = null;
  private traceCount = 0;
  private lastSeenCount = 0;

  private fabMouseDown: ((e: MouseEvent) => void) | null = null;
  private keydownHandler: ((e: KeyboardEvent) => void) | null = null;
  private containerId?: string;
  private isContainerMode = false;
  private containerElement: HTMLElement | null = null;

  private viewModel = createViewModel();
  private renderScheduler = createRenderScheduler();
  private resizeController = createResizeController(this.viewModel);
  private actionRouter!: ReturnType<typeof createActionRouter>;

  constructor(options: DevToolPanelOptions) {
    this.store = options.store;
    this.theme = resolveTheme(this.viewModel.getState().theme);
    this.showFloatingIcon = options.showFloatingIcon;
    this.sensitiveHeaders = options.sensitiveHeaders;
    this.containerId = options.containerId;

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
      onRefetchState: (key) => {
        this.store.refetchStateEntry(key);
        this.renderImmediate();
      },
      onDeleteState: (key) => {
        this.store.deleteCacheEntry(key);
        this.viewModel.selectStateEntry(null);
        this.renderImmediate();
      },
      onClearAllState: () => {
        this.store.clearAllCache();
        this.viewModel.selectStateEntry(null);
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

    if (this.containerId) {
      this.containerElement = document.getElementById(this.containerId);

      if (this.containerElement) {
        this.isContainerMode = true;
      }
    }

    this.shadowHost = document.createElement("div");
    this.shadowHost.id = "spoosh-devtool-host";

    if (this.isContainerMode && this.containerElement) {
      this.shadowHost.classList.add("container-mode");
      this.containerElement.appendChild(this.shadowHost);
    } else {
      document.body.appendChild(this.shadowHost);
    }

    this.shadowRoot = this.shadowHost.attachShadow({ mode: "closed" });

    injectStyles(getThemeCSS(this.theme), this.shadowRoot);

    this.fab = document.createElement("button");
    this.fab.id = "spoosh-devtool-fab";
    this.fab.className = this.viewModel.getState().position;
    this.fab.innerHTML = getLogo(20, 18);
    this.setupFabDrag();
    this.shadowRoot.appendChild(this.fab);

    if (!this.showFloatingIcon) {
      this.fab.style.display = "none";
    }

    this.sidebar = document.createElement("div");
    this.sidebar.id = "spoosh-devtool-sidebar";

    if (this.isContainerMode) {
      this.sidebar.classList.add("container-mode");
    }

    this.setupKeyboardShortcuts();

    if (!this.isContainerMode) {
      if (this.viewModel.getState().sidebarPosition === "left") {
        this.sidebar.classList.add("left");
      } else if (this.viewModel.getState().sidebarPosition === "bottom") {
        this.sidebar.classList.add("bottom");
      }
    }

    this.resizeController.updateSidebarDOM(this.sidebar);

    this.shadowRoot.appendChild(this.sidebar);

    const savedMaxHistory = this.viewModel.getMaxHistory();
    this.store.setMaxHistory(savedMaxHistory);

    this.unsubscribe = this.store.subscribe(() => {
      const newCount = this.store.getTotalTraceCount();

      if (newCount !== this.traceCount) {
        const hadNewTrace = newCount > this.traceCount;
        this.traceCount = newCount;

        if (this.viewModel.getState().isOpen) {
          this.lastSeenCount = newCount;
        }

        this.updateBadge();

        if (
          hadNewTrace &&
          this.viewModel.getState().isOpen &&
          this.viewModel.getState().autoSelectIncoming &&
          this.viewModel.getState().activeView === "requests"
        ) {
          const traceList = this.sidebar?.querySelector(".spoosh-traces");
          const isAtTop = !traceList || traceList.scrollTop <= 50;

          if (isAtTop) {
            const traces = this.store.getAllTraces(
              this.viewModel.getState().searchQuery
            );
            const lastTrace = traces[traces.length - 1];

            if (lastTrace) {
              if (lastTrace.type === "subscription") {
                this.viewModel.selectSubscription(lastTrace.id);
              } else {
                this.viewModel.selectTrace(lastTrace.id);
              }

              this.renderScheduler.schedule(() => this.render());
              return;
            }
          }
        }
      }

      if (this.viewModel.getState().isOpen) {
        const isStepOnly = this.store.isStepUpdateOnly();
        const isViewingPlugins =
          this.viewModel.getState().activeTab === "plugins";

        if (isStepOnly) {
          if (isViewingPlugins) {
            this.renderScheduler.schedule(() => this.updatePluginsTabOnly());
          }
          return;
        }

        this.renderScheduler.schedule(() => this.partialUpdate());
      }
    });

    this.render();
  }

  private renderImmediate(): void {
    this.renderScheduler.immediate(() => this.render());
  }

  private updatePluginsTabOnly(): void {
    if (!this.sidebar) return;

    const state = this.viewModel.getState();
    const traces = this.store.getFilteredTraces(state.searchQuery);
    const selectedTrace = state.selectedTraceId
      ? traces.find((t) => t.id === state.selectedTraceId)
      : null;

    if (!selectedTrace) return;

    const tabContent = this.sidebar.querySelector(".spoosh-tab-content");

    if (tabContent && state.activeTab === "plugins") {
      const savedScrollTop = tabContent.scrollTop ?? 0;
      const html = renderPluginsTab({
        trace: selectedTrace,
        knownPlugins: this.store.getKnownPlugins(selectedTrace.operationType),
        showPassedPlugins: state.showPassedPlugins,
        expandedSteps: state.expandedSteps,
        expandedGroups: state.expandedGroups,
        fullDiffViews: state.fullDiffViews,
        collapsedJsonPaths: state.collapsedJsonPaths,
      });
      tabContent.innerHTML = html;

      if (savedScrollTop > 0) {
        tabContent.scrollTop = savedScrollTop;
      }
    }

    const pluginCount = this.getActivePluginCount(selectedTrace);
    const pluginsTabBtn = this.sidebar.querySelector('[data-tab="plugins"]');

    if (pluginsTabBtn) {
      pluginsTabBtn.textContent = `Plugins ${pluginCount > 0 ? `(${pluginCount})` : ""}`;
    }
  }

  private partialUpdate(): void {
    if (!this.sidebar) return;

    if (this.autoSelectFirst()) {
      this.render();
      return;
    }

    const state = this.viewModel.getState();

    if (state.activeView === "state") {
      this.partialUpdateState();
      return;
    }

    if (state.activeView === "import") {
      this.partialUpdateImport();
      return;
    }

    const allTraces = this.store.getAllTraces(state.searchQuery);
    const events = this.store.getEvents();
    const selectedItem = state.selectedTraceId
      ? allTraces.find((t) => t.id === state.selectedTraceId)
      : null;

    const requestsSection = this.sidebar.querySelector(
      ".spoosh-requests-section"
    );

    if (requestsSection) {
      const countEl = requestsSection.querySelector(".spoosh-section-count");

      if (countEl) {
        countEl.textContent = String(allTraces.length);
      }

      const existingList = requestsSection.querySelector(
        ".spoosh-traces, .spoosh-empty"
      ) as HTMLElement | null;

      if (existingList) {
        const savedListScrollTop = existingList.scrollTop ?? 0;
        existingList.outerHTML = renderUnifiedTraceList(
          allTraces,
          state.selectedTraceId
        );

        if (savedListScrollTop > 0) {
          const newList = requestsSection.querySelector(".spoosh-traces");

          if (newList) {
            newList.scrollTop = savedListScrollTop;
          }
        }
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
      ) as HTMLElement | null;

      if (existingList) {
        const savedEventsScrollTop = existingList.scrollTop ?? 0;

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

        if (savedEventsScrollTop > 0) {
          const newEventsList = eventsSection.querySelector(".spoosh-events");

          if (newEventsList) {
            newEventsList.scrollTop = savedEventsScrollTop;
          }
        }
      }
    }

    if (selectedItem?.type === "request") {
      const selectedTrace = selectedItem;
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
            collapsedJsonPaths: state.collapsedJsonPaths,
          });
        } else if (state.activeTab === "data") {
          const currentlyShowingSpinner =
            tabContent.querySelector(".spoosh-spinner");

          if (currentlyShowingSpinner && !isPending) {
            tabContent.innerHTML = renderDataTab(selectedTrace, state);
          }
        } else if (state.activeTab === "meta") {
          const currentlyShowingSpinner =
            tabContent.querySelector(".spoosh-spinner");

          if (currentlyShowingSpinner && !isPending) {
            tabContent.innerHTML = renderMetaTab(selectedTrace, state);
          }
        }

        if (savedScrollTop > 0) {
          tabContent.scrollTop = savedScrollTop;
        }
      }
    } else if (selectedItem?.type === "subscription") {
      const subscription = selectedItem;

      this.partialUpdateSubscription(subscription, state);
    }
  }

  private partialUpdateState(): void {
    if (!this.sidebar) return;

    const state = this.viewModel.getState();
    const stateEntries = this.store.getCacheEntries(state.searchQuery);

    const stateSection = this.sidebar.querySelector(".spoosh-state-section");

    if (stateSection) {
      const countEl = stateSection.querySelector(".spoosh-section-count");

      if (countEl) {
        countEl.textContent = String(stateEntries.length);
      }

      const existingList = stateSection.querySelector(
        ".spoosh-state-entries, .spoosh-empty"
      );

      if (existingList) {
        existingList.outerHTML = renderStateList({
          entries: stateEntries,
          selectedKey: state.selectedStateKey,
          searchQuery: state.searchQuery,
        });
      }
    }

    const selectedEntry = state.selectedStateKey
      ? stateEntries.find((e) => e.queryKey === state.selectedStateKey)
      : null;

    if (selectedEntry) {
      const detailPanel = this.sidebar.querySelector(".spoosh-detail-panel");

      if (detailPanel) {
        detailPanel.outerHTML = renderStateDetail({
          entry: selectedEntry,
          activeTab: state.internalTab,
          state,
        });
      }
    }
  }

  private partialUpdateSubscription(
    subscription: SubscriptionTrace,
    state: ReturnType<typeof this.viewModel.getState>
  ): void {
    if (!this.sidebar) return;

    const messagesTabBtn = this.sidebar.querySelector(
      '[data-subscription-tab="messages"]'
    );

    if (messagesTabBtn) {
      messagesTabBtn.textContent = `Messages (${subscription.messages.length})`;
    }

    const pluginCount = this.getActivePluginCount(subscription);
    const pluginsTabBtn = this.sidebar.querySelector(
      '[data-subscription-tab="plugins"]'
    );

    if (pluginsTabBtn) {
      pluginsTabBtn.textContent = `Plugins ${pluginCount > 0 ? `(${pluginCount})` : ""}`;
    }

    const msgBadge = this.sidebar.querySelector(
      ".spoosh-detail-meta .spoosh-badge.neutral:last-child"
    );

    if (msgBadge) {
      msgBadge.textContent = `${subscription.messageCount} msgs`;
    }

    const tabContent = this.sidebar.querySelector(".spoosh-tab-content");

    if (tabContent) {
      const savedScrollTop = tabContent.scrollTop ?? 0;

      if (state.subscriptionTab === "plugins") {
        tabContent.innerHTML = renderPluginsTab({
          trace: {
            id: subscription.id,
            steps: subscription.steps,
            operationType: "subscription",
          },
          knownPlugins: this.store.getKnownPlugins("subscription"),
          showPassedPlugins: state.showPassedPlugins,
          expandedSteps: state.expandedSteps,
          expandedGroups: state.expandedGroups,
          fullDiffViews: state.fullDiffViews,
          collapsedJsonPaths: state.collapsedJsonPaths,
        });
      } else {
        tabContent.innerHTML = renderSubscriptionTabs({
          subscription,
          activeTab: state.subscriptionTab,
          selectedMessageId: state.selectedMessageId,
          expandedEventTypes: state.expandedEventTypes,
          showUnlistenedEvents: state.showUnlistenedEvents,
        });
      }

      if (savedScrollTop > 0) {
        tabContent.scrollTop = savedScrollTop;
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

    this.autoSelectFirst();

    const state = this.viewModel.getState();
    const tabContent = this.sidebar.querySelector(".spoosh-tab-content");
    const savedScrollTop = tabContent?.scrollTop ?? 0;

    const listScrollable = this.sidebar.querySelector(
      ".spoosh-traces, .spoosh-state-entries"
    );
    const savedListScrollTop = listScrollable?.scrollTop ?? 0;

    const mainContent =
      state.activeView === "requests"
        ? this.renderRequestsView()
        : state.activeView === "state"
          ? this.renderStateView()
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
        ".spoosh-traces, .spoosh-state-entries"
      );

      if (newListScrollable) {
        newListScrollable.scrollTop = savedListScrollTop;
      }
    }
  }

  private renderRequestsView(): string {
    const state = this.viewModel.getState();
    const allTraces = this.store.getAllTraces(state.searchQuery);
    const events = this.store.getEvents();
    const filters = this.store.getFilters();
    const activeCount = this.store.getActiveCount();

    const selectedItem = state.selectedTraceId
      ? allTraces.find((t) => t.id === state.selectedTraceId)
      : null;

    let detailContent: string;

    if (state.showSettings) {
      detailContent = renderSettings({
        showPassedPlugins: state.showPassedPlugins,
        theme: state.theme,
        position: state.position,
        sidebarPosition: state.sidebarPosition,
        maxHistory: state.maxHistory,
        autoSelectIncoming: state.autoSelectIncoming,
        isContainerMode: this.isContainerMode,
      });
    } else if (selectedItem?.type === "subscription") {
      detailContent = renderSubscriptionDetail({
        subscription: selectedItem,
        activeTab: state.subscriptionTab,
        selectedMessageId: state.selectedMessageId,
        expandedEventTypes: state.expandedEventTypes,
        showPassedPlugins: state.showPassedPlugins,
        showUnlistenedEvents: state.showUnlistenedEvents,
        expandedSteps: state.expandedSteps,
        expandedGroups: state.expandedGroups,
        knownPlugins: this.store.getKnownPlugins("subscription"),
        fullDiffViews: state.fullDiffViews,
        collapsedJsonPaths: state.collapsedJsonPaths,
      });
    } else {
      const selectedTrace =
        selectedItem?.type === "request" ? selectedItem : null;
      detailContent = renderDetailPanel({
        trace: selectedTrace,
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
        autoSelectIncoming: state.autoSelectIncoming,
        sensitiveHeaders: this.sensitiveHeaders,
        isContainerMode: this.isContainerMode,
        state,
      });
    }

    return `
      <div class="spoosh-list-panel" style="width: ${state.listPanelWidth}px; min-width: ${state.listPanelWidth}px;">
        ${renderHeader({ filters, showSettings: state.showSettings, searchQuery: state.searchQuery })}
        <div class="spoosh-list-content">
          <div class="spoosh-requests-section" style="flex: ${state.requestsPanelHeight};">
            <div class="spoosh-section-header">
              <span class="spoosh-section-title">Requests</span>
              <span class="spoosh-section-count">${activeCount > 0 ? `<span class="spoosh-active-count">${activeCount}</span> / ` : ""}${allTraces.length}</span>
            </div>
            ${renderUnifiedTraceList(allTraces, state.selectedTraceId)}
          </div>
          <div class="spoosh-horizontal-divider"></div>
          <div class="spoosh-events-section" style="flex: ${1 - state.requestsPanelHeight};">
            <div class="spoosh-section-header">
              <span class="spoosh-section-title">Events</span>
              <span class="spoosh-section-count">${events.length}</span>
            </div>
            ${renderEventList(events, (queryKey) => this.store.getResolvedPath(queryKey))}
          </div>
        </div>
      </div>
      <div class="spoosh-divider-handle"></div>
      ${detailContent}
    `;
  }

  private renderStateView(): string {
    const state = this.viewModel.getState();
    const stateEntries = this.store.getCacheEntries(state.searchQuery);
    const selectedEntry = state.selectedStateKey
      ? stateEntries.find((e) => e.queryKey === state.selectedStateKey)
      : null;

    const detailPanel = state.showSettings
      ? renderSettings({
          showPassedPlugins: state.showPassedPlugins,
          theme: state.theme,
          position: state.position,
          sidebarPosition: state.sidebarPosition,
          maxHistory: state.maxHistory,
          autoSelectIncoming: state.autoSelectIncoming,
          isContainerMode: this.isContainerMode,
        })
      : renderStateDetail({
          entry: selectedEntry ?? null,
          activeTab: state.internalTab,
          state,
        });

    return `
      <div class="spoosh-list-panel" style="width: ${state.listPanelWidth}px; min-width: ${state.listPanelWidth}px;">
        ${renderHeader({ filters: this.store.getFilters(), showSettings: state.showSettings, searchQuery: state.searchQuery, hideFilters: true, hideTypeFilter: true, hideClear: true })}
        <div class="spoosh-list-content">
          <div class="spoosh-state-section">
            <div class="spoosh-section-header">
              <span class="spoosh-section-title">State Entries</span>
              <span class="spoosh-section-count">${stateEntries.length}</span>
            </div>
            ${renderStateList({
              entries: stateEntries,
              selectedKey: state.selectedStateKey,
              searchQuery: state.searchQuery,
            })}
          </div>
          ${
            stateEntries.length > 0
              ? `<div class="spoosh-state-clear-all">
                  <button class="spoosh-state-action-btn danger" data-action="clear-all-state">
                    Clear All State
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

  private filterImportedItemsByType(items: ExportedItem[]): ExportedItem[] {
    const typeFilter = this.store.getFilters().traceTypeFilter;

    if (typeFilter === "all") return items;

    return items.filter((item) => {
      if (typeFilter === "http") return item.type === "request";
      if (typeFilter === "sse") return item.type === "sse";

      return true;
    });
  }

  private renderImportView(): string {
    const state = this.viewModel.getState();
    const session = this.store.getImportedSession();
    const allItems = this.store.getFilteredImportedTraces(
      state.importedSearchQuery
    );
    const items = this.filterImportedItemsByType(allItems);
    const selectedItem = state.selectedImportedTraceId
      ? items.find((t) => t.id === state.selectedImportedTraceId)
      : null;

    const detailPanel = state.showSettings
      ? renderSettings({
          showPassedPlugins: state.showPassedPlugins,
          theme: state.theme,
          position: state.position,
          sidebarPosition: state.sidebarPosition,
          maxHistory: state.maxHistory,
          autoSelectIncoming: state.autoSelectIncoming,
          isContainerMode: this.isContainerMode,
        })
      : renderImportDetail({
          item: selectedItem ?? null,
          activeTab: state.activeTab,
          subscriptionTab: state.subscriptionTab,
          expandedSteps: state.expandedSteps,
          expandedGroups: state.expandedGroups,
          fullDiffViews: state.fullDiffViews,
          selectedMessageId: state.selectedMessageId,
          expandedEventTypes: state.expandedEventTypes,
          collapsedJsonPaths: state.collapsedJsonPaths,
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
                    <span class="spoosh-section-title">${escapeHtml(session.filename)}</span>
                    <span class="spoosh-section-count">${items.length}</span>
                  </div>`
                : ""
            }
            ${renderImportList({
              items,
              selectedTraceId: state.selectedImportedTraceId,
              filename: session?.filename ?? null,
            })}
          </div>
          ${
            hasSession
              ? `<div class="spoosh-state-clear-all">
                  <button class="spoosh-import-btn" data-action="import-file">
                    Import New File
                  </button>
                  <button class="spoosh-state-action-btn danger" data-action="clear-imports">
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
    const allItems = this.store.getFilteredImportedTraces(
      state.importedSearchQuery
    );
    const items = this.filterImportedItemsByType(allItems);

    const importSection = this.sidebar.querySelector(".spoosh-import-section");

    if (importSection) {
      const countEl = importSection.querySelector(".spoosh-section-count");

      if (countEl) {
        countEl.textContent = String(items.length);
      }

      const existingList = importSection.querySelector(
        ".spoosh-traces, .spoosh-empty, .spoosh-import-empty"
      );

      if (existingList) {
        existingList.outerHTML = renderImportList({
          items,
          selectedTraceId: state.selectedImportedTraceId,
          filename: this.store.getImportedSession()?.filename ?? null,
        });
      }
    }

    const selectedItem = state.selectedImportedTraceId
      ? items.find((t) => t.id === state.selectedImportedTraceId)
      : null;

    if (selectedItem) {
      const detailPanel = this.sidebar.querySelector(".spoosh-detail-panel");

      if (detailPanel) {
        detailPanel.outerHTML = renderImportDetail({
          item: selectedItem,
          activeTab: state.activeTab,
          subscriptionTab: state.subscriptionTab,
          expandedSteps: state.expandedSteps,
          expandedGroups: state.expandedGroups,
          fullDiffViews: state.fullDiffViews,
          selectedMessageId: state.selectedMessageId,
          expandedEventTypes: state.expandedEventTypes,
          collapsedJsonPaths: state.collapsedJsonPaths,
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

  private validateImportData(data: unknown): ExportedItem[] | null {
    if (!Array.isArray(data)) return null;

    return data.filter((item): item is ExportedItem => {
      if (typeof item !== "object" || item === null) return false;

      const obj = item as Record<string, unknown>;

      if (typeof obj.id !== "string") return false;

      if (obj.type === "sse") {
        return (
          typeof obj.channel === "string" && typeof obj.queryKey === "string"
        );
      }

      return (
        typeof obj.path === "string" &&
        typeof obj.operationType === "string" &&
        typeof obj.method === "string"
      );
    });
  }

  private autoSelectFirst(): boolean {
    const state = this.viewModel.getState();

    if (state.activeView === "requests" && !state.selectedTraceId) {
      const allTraces = this.store.getAllTraces(state.searchQuery);
      const lastTrace = allTraces[allTraces.length - 1];

      if (lastTrace) {
        this.viewModel.selectTrace(lastTrace.id);
        return true;
      }
    }

    if (state.activeView === "state" && !state.selectedStateKey) {
      const entries = this.store.getCacheEntries(state.searchQuery);
      const firstEntry = entries[0];

      if (firstEntry) {
        this.viewModel.selectStateEntry(firstEntry.queryKey);
        return true;
      }
    }

    if (state.activeView === "import" && !state.selectedImportedTraceId) {
      const traces = this.store.getFilteredImportedTraces(
        state.importedSearchQuery
      );
      const lastTrace = traces[traces.length - 1];

      if (lastTrace) {
        this.viewModel.selectImportedTrace(lastTrace.id);
        return true;
      }
    }

    return false;
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

      if (target.classList.contains("spoosh-settings-header")) {
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
    this.traceCount = this.store.getTotalTraceCount();
    this.lastSeenCount = this.traceCount;
    this.updateBadge();
    this.render();
  }

  close(): void {
    this.viewModel.close();
    this.sidebar?.classList.remove("open");
  }

  private exportTraces(): void {
    const exportData = this.store.exportTraces();

    if (exportData.length === 0) {
      return;
    }

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

    this.fabMouseDown = handleMouseDown;
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

  toggleFloatingIcon(): void {
    if (!this.fab) return;

    const isVisible = this.fab.style.display !== "none";
    this.setVisible(!isVisible);
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

  private setupKeyboardShortcuts(): void {
    this.keydownHandler = (e: KeyboardEvent) => {
      const state = this.viewModel.getState();
      const isMod = e.metaKey || e.ctrlKey;

      if (!state.isOpen) return;

      const target = e.target as HTMLElement;
      const isInputFocused =
        target.tagName === "INPUT" || target.tagName === "TEXTAREA";

      if (e.key === "Escape") {
        if (isInputFocused) {
          target.blur();
        } else {
          this.close();
        }

        e.preventDefault();
        return;
      }

      if (isMod && e.key === "k") {
        e.preventDefault();
        const searchInput = this.sidebar?.querySelector(
          ".spoosh-search-input"
        ) as HTMLInputElement | null;
        searchInput?.focus();
        return;
      }

      if (isMod && e.key === "e") {
        e.preventDefault();
        this.exportTraces();
        return;
      }

      if (isMod && e.key === "l") {
        e.preventDefault();
        this.viewModel.clearAll(this.store);
        this.renderImmediate();
        return;
      }

      if (e.key === "1" && !isInputFocused) {
        e.preventDefault();
        this.viewModel.setActiveView("requests");
        this.renderImmediate();
        return;
      }

      if (e.key === "2" && !isInputFocused) {
        e.preventDefault();
        this.viewModel.setActiveView("state");
        this.renderImmediate();
        return;
      }

      if (e.key === "3" && !isInputFocused) {
        e.preventDefault();
        this.viewModel.setActiveView("import");
        this.renderImmediate();
        return;
      }

      if (isInputFocused) return;

      if (e.key === "ArrowUp" || e.key === "ArrowDown") {
        e.preventDefault();
        this.navigateTraces(e.key === "ArrowUp" ? -1 : 1);
        return;
      }
    };

    document.addEventListener("keydown", this.keydownHandler);
  }

  private navigateTraces(direction: -1 | 1): void {
    const state = this.viewModel.getState();

    if (state.activeView === "requests") {
      const allTraces = this.store.getAllTraces(state.searchQuery);

      if (allTraces.length === 0) return;

      const currentIndex = state.selectedTraceId
        ? allTraces.findIndex((t) => t.id === state.selectedTraceId)
        : -1;

      // Traces are rendered in reverse order, so flip direction
      let newIndex = currentIndex - direction;

      if (newIndex < 0) newIndex = 0;
      if (newIndex >= allTraces.length) newIndex = allTraces.length - 1;

      const trace = allTraces[newIndex];

      if (trace) {
        this.viewModel.selectTrace(trace.id);
        this.renderImmediate();
        this.scrollToSelected(".spoosh-trace-card.selected");
      }
    } else if (state.activeView === "state") {
      const entries = this.store.getCacheEntries(state.searchQuery);

      if (entries.length === 0) return;

      const currentIndex = state.selectedStateKey
        ? entries.findIndex((e) => e.queryKey === state.selectedStateKey)
        : -1;

      let newIndex = currentIndex + direction;

      if (newIndex < 0) newIndex = 0;
      if (newIndex >= entries.length) newIndex = entries.length - 1;

      const entry = entries[newIndex];

      if (entry) {
        this.viewModel.selectStateEntry(entry.queryKey);
        this.renderImmediate();
        this.scrollToSelected(".spoosh-state-entry.selected");
      }
    } else if (state.activeView === "import") {
      const traces = this.store.getFilteredImportedTraces(
        state.importedSearchQuery
      );

      if (traces.length === 0) return;

      const currentIndex = state.selectedImportedTraceId
        ? traces.findIndex((t) => t.id === state.selectedImportedTraceId)
        : -1;

      // Traces are rendered in reverse order, so flip direction
      let newIndex = currentIndex - direction;

      if (newIndex < 0) newIndex = 0;
      if (newIndex >= traces.length) newIndex = traces.length - 1;

      const trace = traces[newIndex];

      if (trace) {
        this.viewModel.selectImportedTrace(trace.id);
        this.renderImmediate();
        this.scrollToSelected(".spoosh-trace.selected");
      }
    }
  }

  private scrollToSelected(selector: string): void {
    requestAnimationFrame(() => {
      const selected = this.sidebar?.querySelector(selector);
      selected?.scrollIntoView({ block: "nearest" });
    });
  }

  unmount(): void {
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }

    this.renderScheduler.cancel();
    this.resizeController.cleanup();

    if (this.fab && this.fabMouseDown) {
      this.fab.removeEventListener("mousedown", this.fabMouseDown);
      this.fabMouseDown = null;
    }

    if (this.keydownHandler) {
      document.removeEventListener("keydown", this.keydownHandler);
      this.keydownHandler = null;
    }

    this.shadowHost?.remove();
    this.shadowHost = null;
    this.shadowRoot = null;
    this.fab = null;
    this.sidebar = null;
    removeStyles();
  }
}
