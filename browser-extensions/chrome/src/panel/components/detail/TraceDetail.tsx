import { Show, type Component } from "solid-js";
import type { OperationTrace, DetailTab } from "@devtool/types";
import type { ViewState } from "../../App";
import type { PanelActions } from "../layout/Panel";
import { Badge } from "../shared";
import { formatTime, formatQueryParams } from "../../utils/format";
import { DetailTabs } from "./DetailTabs";
import { DataTab } from "./DataTab";
import { RequestTab } from "./RequestTab";
import { MetaTab } from "./MetaTab";
import { PluginsTab } from "./PluginsTab";

interface TraceDetailProps {
  trace: OperationTrace;
  viewState: ViewState;
  actions: PanelActions;
  knownPlugins: string[];
  sensitiveHeaders: Set<string>;
}

function getMethodBadgeVariant(
  method: string
): "success" | "error" | "warning" | "pending" | "neutral" | "primary" {
  switch (method.toUpperCase()) {
    case "GET":
      return "success";
    case "POST":
      return "primary";
    case "PUT":
    case "PATCH":
      return "warning";
    case "DELETE":
      return "error";
    default:
      return "neutral";
  }
}

function getStatusInfo(trace: OperationTrace): {
  variant: "success" | "error" | "warning" | "pending";
  label: string;
} {
  const isPending = trace.duration === undefined;
  const isAborted = !!trace.response?.aborted;
  const hasError = !!trace.response?.error && !isAborted;

  if (isPending) {
    return { variant: "pending", label: "Pending" };
  }

  if (isAborted) {
    return { variant: "warning", label: "Aborted" };
  }

  if (hasError) {
    return { variant: "error", label: "Error" };
  }

  return { variant: "success", label: "Success" };
}

export const TraceDetail: Component<TraceDetailProps> = (props) => {
  const statusInfo = () => getStatusInfo(props.trace);
  const duration = () => props.trace.duration?.toFixed(0) ?? "...";
  const queryParams = () =>
    formatQueryParams(
      props.trace.request.query as Record<string, unknown> | undefined
    );

  const handleTabChange = (tab: DetailTab) => {
    props.actions.updateViewState("activeTab", tab);
  };

  const handleTogglePath = (contextId: string, path: string) => {
    props.actions.toggleJsonPath(contextId, path);
  };

  const getCollapsedPaths = (contextId: string): Set<string> => {
    return props.viewState.collapsedJsonPaths.get(contextId) ?? new Set();
  };

  return (
    <div class="flex flex-col h-full">
      <div class="shrink-0 px-3 py-2 border-b border-spoosh-border">
        <div class="flex items-center gap-2 mb-1">
          <Badge variant={getMethodBadgeVariant(props.trace.method)}>
            {props.trace.method}
          </Badge>
          <span class="text-sm text-spoosh-text truncate flex-1">
            {props.trace.path}
            {queryParams() && (
              <span class="text-spoosh-text-muted">?{queryParams()}</span>
            )}
          </span>
        </div>

        <div class="flex items-center gap-2 text-2xs">
          <Badge variant={statusInfo().variant}>{statusInfo().label}</Badge>
          <Badge variant="neutral">{duration()}ms</Badge>
          <Badge variant="neutral">{formatTime(props.trace.timestamp)}</Badge>
        </div>
      </div>

      <DetailTabs
        activeTab={props.viewState.activeTab}
        onTabChange={handleTabChange}
        trace={props.trace}
      />

      <div class="flex-1 flex flex-col min-h-0 p-3">
        <Show when={props.viewState.activeTab === "data"}>
          <DataTab
            trace={props.trace}
            collapsedPaths={getCollapsedPaths(`data-${props.trace.id}`)}
            onTogglePath={handleTogglePath}
          />
        </Show>

        <Show when={props.viewState.activeTab === "request"}>
          <RequestTab
            trace={props.trace}
            collapsedPaths={props.viewState.collapsedJsonPaths}
            onTogglePath={handleTogglePath}
            sensitiveHeaders={props.sensitiveHeaders}
          />
        </Show>

        <Show when={props.viewState.activeTab === "meta"}>
          <MetaTab
            trace={props.trace}
            collapsedPaths={getCollapsedPaths(`meta-${props.trace.id}`)}
            onTogglePath={handleTogglePath}
          />
        </Show>

        <Show when={props.viewState.activeTab === "plugins"}>
          <PluginsTab
            trace={props.trace}
            viewState={props.viewState}
            actions={props.actions}
            knownPlugins={props.knownPlugins}
          />
        </Show>
      </div>
    </div>
  );
};
