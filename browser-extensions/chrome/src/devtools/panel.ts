import { RemoteStore, type ConnectionState } from "./remote-store";
import { createViewModel } from "@devtool/ui/view-model";
import { createActionRouter } from "@devtool/ui/action-router";
import { createRenderScheduler } from "@devtool/ui/render-scheduler";
import { getThemeCSS, resolveTheme } from "@devtool/ui/styles/theme";
import type { DevToolTheme } from "@devtool/types";

function getThemeVarsForRoot(theme: DevToolTheme): string {
  return `
    :root, body, #app {
      --spoosh-bg: ${theme.colors.background};
      --spoosh-surface: ${theme.colors.surface};
      --spoosh-text: ${theme.colors.text};
      --spoosh-text-muted: ${theme.colors.textMuted};
      --spoosh-border: ${theme.colors.border};
      --spoosh-primary: ${theme.colors.primary};
      --spoosh-bg-hover: ${theme.colors.surface};
      --spoosh-success: ${theme.colors.success};
      --spoosh-warning: ${theme.colors.warning};
      --spoosh-error: ${theme.colors.error};
      --spoosh-font: ${theme.fonts.mono};
    }
  `;
}
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
} from "@devtool/ui/render";
import { escapeHtml } from "@devtool/ui/utils";
import type { ExportedItem, SubscriptionTrace } from "@devtool/types";

class ExtensionPanel {
  private store: RemoteStore;
  private viewModel = createViewModel();
  private renderScheduler = createRenderScheduler();
  private actionRouter: ReturnType<typeof createActionRouter>;
  private theme: DevToolTheme;
  private container: HTMLElement;
  private unsubscribe: (() => void) | null = null;
  private traceCount = 0;
  private lastSeenCount = 0;
  private lastConnectionState: ConnectionState = "not_detected";

  constructor() {
    const tabId = chrome.devtools.inspectedWindow.tabId;
    this.store = new RemoteStore(tabId);

    this.viewModel.open();

    this.theme = resolveTheme(this.viewModel.getState().theme);
    this.container = document.getElementById("app")!;

    this.actionRouter = createActionRouter(this.viewModel, this.store, {
      onRender: () => this.renderImmediate(),
      onPartialRender: () =>
        this.renderScheduler.immediate(() => this.partialUpdate()),
      onClose: () => {},
      onExport: () => this.exportTraces(),
      onThemeChange: (theme) => this.setTheme(theme),
      onPositionChange: () => {},
      onSidebarPositionChange: () => {},
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

  init(): void {
    this.injectStyles();
    this.showNotDetected();
    this.store.connect();

    this.unsubscribe = this.store.subscribe(() => {
      const currentState = this.store.state;

      if (currentState !== this.lastConnectionState) {
        this.lastConnectionState = currentState;

        if (currentState === "not_detected") {
          this.showNotDetected();
          return;
        }

        if (currentState === "connecting") {
          this.showConnecting();
          return;
        }

        if (currentState === "connected") {
          this.renderScheduler.immediate(() => this.render());
          return;
        }
      }

      if (currentState !== "connected") {
        return;
      }

      const newCount = this.store.getTotalTraceCount();

      if (newCount !== this.traceCount) {
        const hadNewTrace = newCount > this.traceCount;
        this.traceCount = newCount;
        this.lastSeenCount = newCount;

        if (
          hadNewTrace &&
          this.viewModel.getState().autoSelectIncoming &&
          this.viewModel.getState().activeView === "requests"
        ) {
          const traceList = this.container.querySelector(".spoosh-traces");
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
    });

    this.setupKeyboardShortcuts();
  }

  private injectStyles(): void {
    const styleEl = document.createElement("style");
    styleEl.textContent =
      this.getBaseStyles() +
      getThemeVarsForRoot(this.theme) +
      getThemeCSS(this.theme);
    document.head.appendChild(styleEl);
  }

  private getBaseStyles(): string {
    return `
      *, *::before, *::after {
        box-sizing: border-box;
      }

      html, body {
        margin: 0;
        padding: 0;
        height: 100%;
        width: 100%;
        overflow: hidden;
        background: var(--spoosh-bg);
        color: var(--spoosh-text);
        font-family: var(--spoosh-font), -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        font-size: 12px;
      }

      #app {
        display: flex;
        flex-direction: column;
        height: 100%;
        width: 100%;
        overflow: hidden;
        background: var(--spoosh-bg);
      }

      /* Override panel styles for extension context */
      .spoosh-panel {
        flex: 1;
        min-height: 0;
        background: var(--spoosh-bg);
      }

      .spoosh-list-panel {
        border-right: 1px solid var(--spoosh-border);
        background: var(--spoosh-surface);
      }

      /* Scrollbar styling */
      ::-webkit-scrollbar {
        width: 6px;
        height: 6px;
      }

      ::-webkit-scrollbar-track {
        background: transparent;
      }

      ::-webkit-scrollbar-thumb {
        background: var(--spoosh-border);
        border-radius: 3px;
      }

      ::-webkit-scrollbar-thumb:hover {
        background: var(--spoosh-text-muted);
      }

      .not-detected {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        height: 100%;
        padding: 40px;
        text-align: center;
        color: var(--spoosh-text-muted);
        background: var(--spoosh-bg);
      }

      .not-detected svg {
        width: 64px;
        height: 64px;
        margin-bottom: 16px;
        opacity: 0.5;
        stroke: var(--spoosh-text-muted);
      }

      .not-detected h2 {
        margin: 0 0 8px;
        font-size: 18px;
        font-weight: 600;
        color: var(--spoosh-text);
      }

      .not-detected p {
        margin: 0;
        font-size: 13px;
        max-width: 400px;
        line-height: 1.5;
      }

      .not-detected code {
        background: var(--spoosh-surface);
        padding: 2px 6px;
        border-radius: 4px;
        font-family: var(--spoosh-font), monospace;
      }

      .connecting-spinner {
        width: 40px;
        height: 40px;
        border: 3px solid var(--spoosh-border);
        border-top-color: var(--spoosh-primary);
        border-radius: 50%;
        animation: spin 1s linear infinite;
        margin-bottom: 16px;
      }

      @keyframes spin {
        to { transform: rotate(360deg); }
      }

      /* Remove drag cursors in extension context */
      .spoosh-header,
      .spoosh-settings-header,
      .spoosh-detail-header,
      .spoosh-detail-title {
        cursor: default !important;
      }
    `;
  }

  private showNotDetected(): void {
    const notDetectedHtml = `
      <div class="not-detected">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <h2>Spoosh not detected</h2>
        <p>This page doesn't appear to be using Spoosh, or the devtool plugin is not enabled. Make sure you have the <code>devtool()</code> plugin registered in your Spoosh instance.</p>
      </div>
    `;
    this.container.textContent = "";
    this.container.insertAdjacentHTML("beforeend", notDetectedHtml);
  }

  private showConnecting(): void {
    const connectingHtml = `
      <div class="not-detected connecting">
        <div class="connecting-spinner"></div>
        <h2>Connecting...</h2>
        <p>Waiting for Spoosh to initialize on this page.</p>
      </div>
    `;
    this.container.textContent = "";
    this.container.insertAdjacentHTML("beforeend", connectingHtml);
  }

  private renderImmediate(): void {
    this.renderScheduler.immediate(() => this.render());
  }

  private render(): void {
    if (this.store.state !== "connected") {
      if (this.store.state === "connecting") {
        this.showConnecting();
      } else {
        this.showNotDetected();
      }
      return;
    }

    this.autoSelectFirst();

    const state = this.viewModel.getState();
    const tabContent = this.container.querySelector(".spoosh-tab-content");
    const savedScrollTop = tabContent?.scrollTop ?? 0;

    const listScrollable = this.container.querySelector(
      ".spoosh-traces, .spoosh-state-entries"
    );
    const savedListScrollTop = listScrollable?.scrollTop ?? 0;

    const mainContent =
      state.activeView === "requests"
        ? this.renderRequestsView()
        : state.activeView === "state"
          ? this.renderStateView()
          : this.renderImportView();

    const html = `
      <div class="spoosh-panel">
        ${mainContent}
      </div>
      ${renderBottomBar({ activeView: state.activeView, theme: state.theme })}
    `;

    this.container.textContent = "";
    this.container.insertAdjacentHTML("beforeend", html);

    this.setupResizeHandlers();
    this.attachEvents();

    if (savedScrollTop > 0) {
      const newTabContent = this.container.querySelector(".spoosh-tab-content");

      if (newTabContent) {
        newTabContent.scrollTop = savedScrollTop;
      }
    }

    if (savedListScrollTop > 0) {
      const newListScrollable = this.container.querySelector(
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
        isContainerMode: true,
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
        sensitiveHeaders: new Set(),
        isContainerMode: true,
        state,
      });
    }

    return `
      <div class="spoosh-list-panel" style="width: ${state.listPanelWidth}px; min-width: ${state.listPanelWidth}px;">
        ${renderHeader({ filters, showSettings: state.showSettings, searchQuery: state.searchQuery, hideClose: true })}
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
            ${renderEventList(events, () => undefined)}
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
          isContainerMode: true,
        })
      : renderStateDetail({
          entry: selectedEntry ?? null,
          activeTab: state.internalTab,
          state,
        });

    return `
      <div class="spoosh-list-panel" style="width: ${state.listPanelWidth}px; min-width: ${state.listPanelWidth}px;">
        ${renderHeader({ filters: this.store.getFilters(), showSettings: state.showSettings, searchQuery: state.searchQuery, hideFilters: true, hideTypeFilter: true, hideClear: true, hideClose: true })}
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
          isContainerMode: true,
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
        ${renderHeader({ filters: this.store.getFilters(), showSettings: state.showSettings, searchQuery: state.importedSearchQuery, hideFilters: true, hideClear: true, hideClose: true })}
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

  private filterImportedItemsByType(items: ExportedItem[]): ExportedItem[] {
    const typeFilter = this.store.getFilters().traceTypeFilter;

    if (typeFilter === "all") return items;

    return items.filter((item) => {
      if (typeFilter === "http") return item.type === "request";
      if (typeFilter === "sse") return item.type === "sse";

      return true;
    });
  }

  private partialUpdate(): void {
    if (this.store.state !== "connected") {
      return;
    }

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

    const requestsSection = this.container.querySelector(
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

    const eventsSection = this.container.querySelector(
      ".spoosh-events-section"
    );

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
      this.partialUpdateRequestDetail(selectedItem, state);
    } else if (selectedItem?.type === "subscription") {
      this.partialUpdateSubscription(selectedItem, state);
    }
  }

  private partialUpdateRequestDetail(
    selectedTrace: typeof this.store.getTraces extends () => (infer T)[]
      ? T
      : never,
    state: ReturnType<typeof this.viewModel.getState>
  ): void {
    const isPending = selectedTrace.duration === undefined;
    const hasError = !!selectedTrace.response?.error;
    const tabContent = this.container.querySelector(".spoosh-tab-content");
    const savedScrollTop = tabContent?.scrollTop ?? 0;

    const statusBadge = this.container.querySelector(
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

    const durationBadge = this.container.querySelector(
      ".spoosh-detail-meta .spoosh-badge.neutral"
    );

    if (durationBadge) {
      durationBadge.textContent = `${selectedTrace.duration?.toFixed(0) ?? "..."}ms`;
    }

    const dataTabBtn = this.container.querySelector('[data-tab="data"]');

    if (dataTabBtn) {
      dataTabBtn.textContent = isPending
        ? "Fetching"
        : hasError
          ? "Error"
          : "Data";
    }

    const pluginCount = this.getActivePluginCount(selectedTrace);
    const pluginsTabBtn = this.container.querySelector('[data-tab="plugins"]');

    if (pluginsTabBtn) {
      pluginsTabBtn.textContent = `Plugins ${pluginCount > 0 ? `(${pluginCount})` : ""}`;
    }

    const metaTabBtn = this.container.querySelector('[data-tab="meta"]');

    if (metaTabBtn) {
      const metaCount = getMetaCount(selectedTrace);
      metaTabBtn.textContent = `Meta${metaCount > 0 ? ` (${metaCount})` : ""}`;
    }

    if (tabContent) {
      if (state.activeTab === "plugins") {
        const html = renderPluginsTab({
          trace: selectedTrace,
          knownPlugins: this.store.getKnownPlugins(selectedTrace.operationType),
          showPassedPlugins: state.showPassedPlugins,
          expandedSteps: state.expandedSteps,
          expandedGroups: state.expandedGroups,
          fullDiffViews: state.fullDiffViews,
          collapsedJsonPaths: state.collapsedJsonPaths,
        });
        tabContent.textContent = "";
        tabContent.insertAdjacentHTML("beforeend", html);
      } else if (state.activeTab === "data") {
        const currentlyShowingSpinner =
          tabContent.querySelector(".spoosh-spinner");

        if (currentlyShowingSpinner && !isPending) {
          const html = renderDataTab(selectedTrace, state);
          tabContent.textContent = "";
          tabContent.insertAdjacentHTML("beforeend", html);
        }
      } else if (state.activeTab === "meta") {
        const currentlyShowingSpinner =
          tabContent.querySelector(".spoosh-spinner");

        if (currentlyShowingSpinner && !isPending) {
          const html = renderMetaTab(selectedTrace, state);
          tabContent.textContent = "";
          tabContent.insertAdjacentHTML("beforeend", html);
        }
      }

      if (savedScrollTop > 0) {
        tabContent.scrollTop = savedScrollTop;
      }
    }
  }

  private partialUpdateSubscription(
    subscription: SubscriptionTrace,
    state: ReturnType<typeof this.viewModel.getState>
  ): void {
    const messagesTabBtn = this.container.querySelector(
      '[data-subscription-tab="messages"]'
    );

    if (messagesTabBtn) {
      messagesTabBtn.textContent = `Messages (${subscription.messages.length})`;
    }

    const pluginCount = this.getActivePluginCount(subscription);
    const pluginsTabBtn = this.container.querySelector(
      '[data-subscription-tab="plugins"]'
    );

    if (pluginsTabBtn) {
      pluginsTabBtn.textContent = `Plugins ${pluginCount > 0 ? `(${pluginCount})` : ""}`;
    }

    const msgBadge = this.container.querySelector(
      ".spoosh-detail-meta .spoosh-badge.neutral:last-child"
    );

    if (msgBadge) {
      msgBadge.textContent = `${subscription.messageCount} msgs`;
    }

    const tabContent = this.container.querySelector(".spoosh-tab-content");

    if (tabContent) {
      const savedScrollTop = tabContent.scrollTop ?? 0;

      if (state.subscriptionTab === "plugins") {
        const html = renderPluginsTab({
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
        tabContent.textContent = "";
        tabContent.insertAdjacentHTML("beforeend", html);
      } else {
        const html = renderSubscriptionTabs({
          subscription,
          activeTab: state.subscriptionTab,
          selectedMessageId: state.selectedMessageId,
          expandedEventTypes: state.expandedEventTypes,
          showUnlistenedEvents: state.showUnlistenedEvents,
        });
        tabContent.textContent = "";
        tabContent.insertAdjacentHTML("beforeend", html);
      }

      if (savedScrollTop > 0) {
        tabContent.scrollTop = savedScrollTop;
      }
    }
  }

  private partialUpdateState(): void {
    const state = this.viewModel.getState();
    const stateEntries = this.store.getCacheEntries(state.searchQuery);

    const stateSection = this.container.querySelector(".spoosh-state-section");

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
      const detailPanel = this.container.querySelector(".spoosh-detail-panel");

      if (detailPanel) {
        detailPanel.outerHTML = renderStateDetail({
          entry: selectedEntry,
          activeTab: state.internalTab,
          state,
        });
      }
    }
  }

  private partialUpdateImport(): void {
    const state = this.viewModel.getState();
    const allItems = this.store.getFilteredImportedTraces(
      state.importedSearchQuery
    );
    const items = this.filterImportedItemsByType(allItems);

    const importSection = this.container.querySelector(
      ".spoosh-import-section"
    );

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
      const detailPanel = this.container.querySelector(".spoosh-detail-panel");

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

  private updatePluginsTabOnly(): void {
    const state = this.viewModel.getState();
    const traces = this.store.getFilteredTraces(state.searchQuery);
    const selectedTrace = state.selectedTraceId
      ? traces.find((t) => t.id === state.selectedTraceId)
      : null;

    if (!selectedTrace) return;

    const tabContent = this.container.querySelector(".spoosh-tab-content");

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
      tabContent.textContent = "";
      tabContent.insertAdjacentHTML("beforeend", html);

      if (savedScrollTop > 0) {
        tabContent.scrollTop = savedScrollTop;
      }
    }

    const pluginCount = this.getActivePluginCount(selectedTrace);
    const pluginsTabBtn = this.container.querySelector('[data-tab="plugins"]');

    if (pluginsTabBtn) {
      pluginsTabBtn.textContent = `Plugins ${pluginCount > 0 ? `(${pluginCount})` : ""}`;
    }
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

  private setupResizeHandlers(): void {
    const dividerHandle = this.container.querySelector(
      ".spoosh-divider-handle"
    ) as HTMLElement;

    if (dividerHandle) {
      dividerHandle.addEventListener("mousedown", (e) => {
        e.preventDefault();
        const startX = e.clientX;
        const startWidth = this.viewModel.getState().listPanelWidth;

        const handleMouseMove = (moveEvent: MouseEvent) => {
          const delta = moveEvent.clientX - startX;
          const newWidth = Math.max(
            200,
            Math.min(startWidth + delta, window.innerWidth / 2)
          );
          this.viewModel.setListPanelWidth(newWidth);

          const listPanel = this.container.querySelector(
            ".spoosh-list-panel"
          ) as HTMLElement;

          if (listPanel) {
            listPanel.style.width = `${newWidth}px`;
            listPanel.style.minWidth = `${newWidth}px`;
          }
        };

        const handleMouseUp = () => {
          document.removeEventListener("mousemove", handleMouseMove);
          document.removeEventListener("mouseup", handleMouseUp);
        };

        document.addEventListener("mousemove", handleMouseMove);
        document.addEventListener("mouseup", handleMouseUp);
      });
    }

    const horizontalDivider = this.container.querySelector(
      ".spoosh-horizontal-divider"
    ) as HTMLElement;
    const listContent = this.container.querySelector(
      ".spoosh-list-content"
    ) as HTMLElement;

    if (horizontalDivider && listContent) {
      horizontalDivider.addEventListener("mousedown", (e) => {
        e.preventDefault();
        const startY = e.clientY;
        const rect = listContent.getBoundingClientRect();
        const startRatio = this.viewModel.getState().requestsPanelHeight;

        const handleMouseMove = (moveEvent: MouseEvent) => {
          const delta = moveEvent.clientY - startY;
          const newRatio = Math.max(
            0.2,
            Math.min(0.8, startRatio + delta / rect.height)
          );
          this.viewModel.setRequestsPanelHeight(newRatio);

          const requestsSection = this.container.querySelector(
            ".spoosh-requests-section"
          ) as HTMLElement;
          const eventsSection = this.container.querySelector(
            ".spoosh-events-section"
          ) as HTMLElement;

          if (requestsSection && eventsSection) {
            requestsSection.style.flex = String(newRatio);
            eventsSection.style.flex = String(1 - newRatio);
          }
        };

        const handleMouseUp = () => {
          document.removeEventListener("mousemove", handleMouseMove);
          document.removeEventListener("mouseup", handleMouseUp);
        };

        document.addEventListener("mousemove", handleMouseMove);
        document.addEventListener("mouseup", handleMouseUp);
      });
    }
  }

  private attachEvents(): void {
    this.container.onmousedown = (e) => {
      const intent = this.actionRouter.parseIntent(e);

      if (intent?.type === "select-tab") {
        e.preventDefault();
        this.actionRouter.dispatch(intent);
      }
    };

    this.container.onclick = (e) => {
      const intent = this.actionRouter.parseIntent(e);

      if (intent && intent.type !== "select-tab") {
        this.actionRouter.dispatch(intent);
      }
    };

    this.container.onchange = (e) => {
      const intent = this.actionRouter.parseIntent(e);

      if (intent) {
        this.actionRouter.dispatch(intent);
      }
    };

    this.container.oninput = (e) => {
      const intent = this.actionRouter.parseIntent(e);

      if (intent) {
        this.actionRouter.dispatch(intent);
      }
    };
  }

  private exportTraces(): void {
    this.store.exportTraces();
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

  private setTheme(theme: "light" | "dark"): void {
    this.theme = resolveTheme(theme);

    const existingStyle = document.head.querySelector("style");

    if (existingStyle) {
      existingStyle.textContent =
        this.getBaseStyles() +
        getThemeVarsForRoot(this.theme) +
        getThemeCSS(this.theme);
    }
  }

  private setupKeyboardShortcuts(): void {
    document.addEventListener("keydown", (e) => {
      const isMod = e.metaKey || e.ctrlKey;

      const target = e.target as HTMLElement;
      const isInputFocused =
        target.tagName === "INPUT" || target.tagName === "TEXTAREA";

      if (isMod && e.key === "k") {
        e.preventDefault();
        const searchInput = this.container.querySelector(
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
    });
  }

  private navigateTraces(direction: -1 | 1): void {
    const state = this.viewModel.getState();

    if (state.activeView === "requests") {
      const allTraces = this.store.getAllTraces(state.searchQuery);

      if (allTraces.length === 0) return;

      const currentIndex = state.selectedTraceId
        ? allTraces.findIndex((t) => t.id === state.selectedTraceId)
        : -1;

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
      const selected = this.container.querySelector(selector);
      selected?.scrollIntoView({ block: "nearest" });
    });
  }
}

const panel = new ExtensionPanel();
panel.init();
