import { Show, Switch, Match, type Component } from "solid-js";
import type { OperationType } from "@spoosh/core";
import type { OperationTrace, SubscriptionTrace } from "@devtool/types";
import type { ViewState } from "../../App";
import type { ThemeMode } from "../../types";
import { useStore } from "../../store";
import { ListPanel } from "./ListPanel";
import { DetailPanel } from "./DetailPanel";
import { ResizeHandle } from "./ResizeHandle";
import { Header } from "../header/Header";
import { RequestsView } from "../requests/RequestsView";
import { StateView } from "../state/StateView";
import { ImportView } from "../import/ImportView";
import { TraceDetail } from "../detail/TraceDetail";
import { SubscriptionDetail } from "../subscription/SubscriptionDetail";
import { Settings } from "../settings/Settings";

export interface PanelActions {
  updateViewState: <K extends keyof ViewState>(
    key: K,
    value: ViewState[K]
  ) => void;
  selectTrace: (traceId: string | null) => void;
  selectSubscription: (subscriptionId: string | null) => void;
  selectStateEntry: (key: string | null) => void;
  selectImportedTrace: (traceId: string | null) => void;
  selectMessage: (messageId: string | null) => void;
  toggleStep: (stepKey: string) => void;
  toggleGroup: (groupKey: string) => void;
  toggleDiffView: (diffKey: string) => void;
  toggleEventType: (eventType: string) => void;
  toggleJsonPath: (contextId: string, path: string) => void;
  clearAll: () => void;
  handleExport: () => void;
  setTheme: (theme: ThemeMode) => void;
}

interface PanelProps {
  viewState: ViewState;
  actions: PanelActions;
  theme: ThemeMode | undefined;
}

const DEFAULT_SENSITIVE_HEADERS = new Set([
  "authorization",
  "proxy-authorization",
  "cookie",
  "set-cookie",
  "x-api-key",
]);

export const Panel: Component<PanelProps> = (props) => {
  const store = useStore();

  const handleResize = (delta: number) => {
    const currentWidth = props.viewState.listPanelWidth;
    const newWidth = Math.max(
      200,
      Math.min(currentWidth + delta, window.innerWidth / 2)
    );
    props.actions.updateViewState("listPanelWidth", newWidth);
  };

  const selectedTrace = (): OperationTrace | null => {
    if (!props.viewState.selectedTraceId) return null;
    const trace = store.state.traces.find(
      (t) => t.id === props.viewState.selectedTraceId
    );
    return trace ?? null;
  };

  const selectedSubscription = (): SubscriptionTrace | null => {
    if (!props.viewState.selectedSubscriptionId) return null;
    const sub = store.state.subscriptions.find(
      (s) => s.id === props.viewState.selectedSubscriptionId
    );
    return sub ?? null;
  };

  const hasSelection = () => {
    const {
      activeView,
      selectedTraceId,
      selectedSubscriptionId,
      showSettings,
    } = props.viewState;

    if (showSettings) return true;
    if (activeView === "requests")
      return !!selectedTraceId || !!selectedSubscriptionId;

    return false;
  };

  const handleFilterToggle = (type: OperationType) => {
    const currentTypes = new Set(store.state.filters.operationTypes);

    if (currentTypes.has(type)) {
      currentTypes.delete(type);
    } else {
      currentTypes.add(type);
    }

    store.setFilter("operationTypes", currentTypes);
  };

  const handleSettingsToggle = () => {
    props.actions.updateViewState(
      "showSettings",
      !props.viewState.showSettings
    );
  };

  return (
    <div class="flex flex-1 min-h-0 bg-spoosh-bg">
      <Switch>
        <Match when={props.viewState.activeView === "requests"}>
          <ListPanel width={props.viewState.listPanelWidth}>
            <Header
              filters={store.state.filters}
              showSettings={props.viewState.showSettings}
              searchQuery={props.viewState.searchQuery}
              onSearchChange={(v) =>
                props.actions.updateViewState("searchQuery", v)
              }
              onFilterToggle={handleFilterToggle}
              onTypeFilterChange={(f) => store.setFilter("traceTypeFilter", f)}
              onClear={props.actions.clearAll}
              onExport={props.actions.handleExport}
              onSettingsToggle={handleSettingsToggle}
            />
            <RequestsView viewState={props.viewState} actions={props.actions} />
          </ListPanel>

          <ResizeHandle onResize={handleResize} />

          <DetailPanel
            hasSelection={hasSelection()}
            activeView={props.viewState.activeView}
          >
            <Show when={props.viewState.showSettings}>
              <Settings
                theme={props.theme ?? "dark"}
                showPassedPlugins={props.viewState.showPassedPlugins}
                autoSelectIncoming={props.viewState.autoSelectIncoming}
                onThemeChange={props.actions.setTheme}
                onShowPassedPluginsChange={(v) =>
                  props.actions.updateViewState("showPassedPlugins", v)
                }
                onAutoSelectIncomingChange={(v) =>
                  props.actions.updateViewState("autoSelectIncoming", v)
                }
              />
            </Show>

            <Show
              when={!props.viewState.showSettings && selectedSubscription()}
            >
              <SubscriptionDetail
                subscription={selectedSubscription()!}
                viewState={props.viewState}
                actions={props.actions}
                knownPlugins={store.state.knownPlugins}
              />
            </Show>

            <Show
              when={
                !props.viewState.showSettings &&
                !selectedSubscription() &&
                selectedTrace()
              }
            >
              <TraceDetail
                trace={selectedTrace()!}
                viewState={props.viewState}
                actions={props.actions}
                knownPlugins={store.state.knownPlugins}
                sensitiveHeaders={DEFAULT_SENSITIVE_HEADERS}
              />
            </Show>
          </DetailPanel>
        </Match>

        <Match when={props.viewState.activeView === "state"}>
          <StateView viewState={props.viewState} actions={props.actions} />
        </Match>

        <Match when={props.viewState.activeView === "import"}>
          <ImportView viewState={props.viewState} actions={props.actions} />
        </Match>
      </Switch>
    </div>
  );
};
