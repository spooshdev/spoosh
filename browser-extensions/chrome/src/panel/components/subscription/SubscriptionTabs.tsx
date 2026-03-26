import type { Component } from "solid-js";
import type { SubscriptionTrace } from "@devtool/types";
import type { SubscriptionDetailTab } from "../../types";

interface SubscriptionTabsProps {
  activeTab: SubscriptionDetailTab;
  onTabChange: (tab: SubscriptionDetailTab) => void;
  subscription: SubscriptionTrace;
}

export const SubscriptionTabs: Component<SubscriptionTabsProps> = (props) => {
  const messageCount = () => props.subscription.messages.length;

  const activePluginCount = () => {
    const uniquePlugins = new Set(
      props.subscription.steps
        .filter((step) => step.stage !== "skip")
        .map((step) => step.plugin)
    );
    return uniquePlugins.size;
  };

  const tabClasses = (tab: SubscriptionDetailTab) => {
    const base =
      "px-3 py-1.5 text-xs font-medium border-b-2 transition-colors cursor-pointer";
    const active =
      props.activeTab === tab
        ? "border-spoosh-primary text-spoosh-primary"
        : "border-transparent text-spoosh-text-muted hover:text-spoosh-text hover:border-spoosh-border";

    return `${base} ${active}`;
  };

  return (
    <div class="flex border-b border-spoosh-border bg-spoosh-surface">
      <button
        class={tabClasses("messages")}
        onClick={() => props.onTabChange("messages")}
      >
        Messages ({messageCount()})
      </button>

      <button
        class={tabClasses("accumulated")}
        onClick={() => props.onTabChange("accumulated")}
      >
        Accumulated
      </button>

      <button
        class={tabClasses("connection")}
        onClick={() => props.onTabChange("connection")}
      >
        Connection
      </button>

      <button
        class={tabClasses("plugins")}
        onClick={() => props.onTabChange("plugins")}
      >
        Plugins {activePluginCount() > 0 ? `(${activePluginCount()})` : ""}
      </button>
    </div>
  );
};
