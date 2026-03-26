import { createMemo, type Component } from "solid-js";
import type { OperationTrace, DetailTab } from "@devtool/types";

interface DetailTabsProps {
  activeTab: DetailTab;
  onTabChange: (tab: DetailTab) => void;
  trace: OperationTrace;
}

function getActivePluginCount(trace: OperationTrace): number {
  const activePlugins = new Set(
    trace.steps
      .filter((step) => step.stage !== "skip" && step.plugin !== "spoosh:fetch")
      .map((step) => step.plugin)
  );

  return activePlugins.size;
}

function getMetaCount(trace: OperationTrace): number {
  return trace.meta ? Object.keys(trace.meta).length : 0;
}

function getDataTabLabel(trace: OperationTrace): string {
  const isPending = trace.duration === undefined;
  const isAborted = !!trace.response?.aborted;
  const hasError = !!trace.response?.error && !isAborted;

  if (isPending) return "Fetching";
  if (isAborted) return "Aborted";
  if (hasError) return "Error";

  return "Data";
}

export const DetailTabs: Component<DetailTabsProps> = (props) => {
  const pluginCount = createMemo(() => getActivePluginCount(props.trace));
  const metaCount = createMemo(() => getMetaCount(props.trace));
  const dataLabel = createMemo(() => getDataTabLabel(props.trace));

  const tabs: Array<{ id: DetailTab; label: () => string }> = [
    { id: "data", label: dataLabel },
    { id: "request", label: () => "Request" },
    {
      id: "meta",
      label: () => (metaCount() > 0 ? `Meta (${metaCount()})` : "Meta"),
    },
    {
      id: "plugins",
      label: () =>
        pluginCount() > 0 ? `Plugins (${pluginCount()})` : "Plugins",
    },
  ];

  const tabClasses = (tabId: DetailTab) => {
    const base =
      "px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer border-b-2";
    const active =
      props.activeTab === tabId
        ? "border-spoosh-primary text-spoosh-primary"
        : "border-transparent text-spoosh-text-muted hover:text-spoosh-text";

    return `${base} ${active}`;
  };

  return (
    <div class="flex-shrink-0 flex border-b border-spoosh-border">
      {tabs.map((tab) => (
        <button
          class={tabClasses(tab.id)}
          onClick={() => props.onTabChange(tab.id)}
        >
          {tab.label()}
        </button>
      ))}
    </div>
  );
};
