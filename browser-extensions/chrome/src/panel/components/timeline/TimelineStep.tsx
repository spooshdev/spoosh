import { For, Show, type Component, createMemo } from "solid-js";
import type { PluginStepEvent } from "@devtool/types";
import { Badge } from "../shared/Badge";
import { DiffView } from "./DiffView";
import { JsonTree } from "../shared/JsonTree";

interface TimelineStepProps {
  step: PluginStepEvent;
  stepKey: string;
  isExpanded: boolean;
  onToggle: (stepKey: string) => void;
  isFullDiffView: boolean;
  onToggleDiffView: (diffKey: string) => void;
  collapsedJsonPaths: Set<string>;
  onToggleJsonPath: (contextId: string, path: string) => void;
}

const COLOR_MAP: Record<string, string> = {
  success: "bg-spoosh-success",
  warning: "bg-spoosh-warning",
  error: "bg-spoosh-error",
  info: "bg-spoosh-primary",
  muted: "bg-spoosh-text-muted",
};

const STAGE_COLORS: Record<string, string> = {
  return: "bg-spoosh-success",
  log: "bg-spoosh-primary",
  skip: "bg-spoosh-text-muted",
  "spoosh:fetch": "bg-spoosh-warning",
};

function getStageBadgeVariant(
  stage: string
): "success" | "error" | "warning" | "pending" | "neutral" | "primary" {
  switch (stage) {
    case "return":
      return "success";
    case "error":
      return "error";
    case "skip":
      return "neutral";
    case "log":
      return "primary";
    default:
      return "neutral";
  }
}

export const TimelineStep: Component<TimelineStepProps> = (props) => {
  const isFetch = createMemo(() => props.step.plugin === "spoosh:fetch");
  const isSkip = createMemo(() => props.step.stage === "skip");

  const hasDiff = createMemo(() => {
    if (!props.step.diff) return false;

    const beforeStr = JSON.stringify(props.step.diff.before);
    const afterStr = JSON.stringify(props.step.diff.after);

    return beforeStr !== afterStr;
  });

  const hasInfo = createMemo(() => {
    if (!props.step.info) return false;
    return props.step.info.length > 0;
  });

  const hasExpandableContent = createMemo(() => hasDiff() || hasInfo());

  const dotColorClass = createMemo(() => {
    if (props.step.color) {
      return COLOR_MAP[props.step.color] ?? "bg-spoosh-text-muted";
    }

    return STAGE_COLORS[props.step.stage] ?? "bg-spoosh-text-muted";
  });

  const displayName = createMemo(() =>
    props.step.plugin.replace("spoosh:", "")
  );

  const handleToggle = () => {
    if (hasExpandableContent()) {
      props.onToggle(props.stepKey);
    }
  };

  if (isFetch()) {
    return (
      <div class="flex items-center gap-2 py-2">
        <div class="flex-1 h-px bg-spoosh-warning/30" />
        <span class="text-xs text-spoosh-warning flex items-center gap-1">
          ⚡ Fetch
        </span>
        <div class="flex-1 h-px bg-spoosh-warning/30" />
      </div>
    );
  }

  return (
    <div class={`py-1.5 ${isSkip() ? "opacity-50" : ""}`}>
      <div
        class={`flex items-center gap-2 ${hasExpandableContent() ? "cursor-pointer hover:bg-spoosh-surface/50" : ""} rounded px-1 py-1`}
        onClick={handleToggle}
      >
        <div
          class={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${dotColorClass()}`}
        />

        <span class="text-sm text-spoosh-text font-medium">
          {displayName()}
        </span>

        <Badge variant={getStageBadgeVariant(props.step.stage)}>
          {props.step.stage}
        </Badge>

        <Show when={props.step.reason}>
          <span class="text-xs text-spoosh-text-muted truncate flex-1">
            {props.step.reason}
          </span>
        </Show>

        <Show when={hasExpandableContent()}>
          <span class="text-xs text-spoosh-text-muted ml-auto">
            {props.isExpanded ? "▼" : "▶"}
          </span>
        </Show>
      </div>

      <Show when={props.isExpanded && hasExpandableContent()}>
        <div class="ml-5 pl-3 mt-2 border-l-2 border-spoosh-border">
          <Show when={hasInfo()}>
            <div class="mb-3">
              <For each={props.step.info}>
                {(infoItem) => (
                  <div class="mb-2 last:mb-0">
                    <Show when={infoItem.label}>
                      <div class="text-xs text-spoosh-text-muted mb-1">
                        {infoItem.label}
                      </div>
                    </Show>
                    <div class="bg-spoosh-surface rounded border border-spoosh-border p-2 overflow-x-auto">
                      <JsonTree
                        data={infoItem.value}
                        contextId={props.stepKey}
                        collapsedPaths={props.collapsedJsonPaths}
                        onTogglePath={props.onToggleJsonPath}
                      />
                    </div>
                  </div>
                )}
              </For>
            </div>
          </Show>

          <Show when={hasDiff() && props.step.diff}>
            <DiffView
              before={props.step.diff!.before}
              after={props.step.diff!.after}
              label={props.step.diff!.label}
              diffKey={props.stepKey}
              isFullView={props.isFullDiffView}
              onToggle={props.onToggleDiffView}
            />
          </Show>
        </div>
      </Show>
    </div>
  );
};

export const PassedPluginStep: Component<{ pluginName: string }> = (props) => {
  const displayName = createMemo(() => props.pluginName.replace("spoosh:", ""));

  return (
    <div class="py-1 opacity-40">
      <div class="flex items-center gap-2 px-1 py-0.5">
        <div class="w-2.5 h-2.5 rounded-full flex-shrink-0 bg-spoosh-border" />
        <span class="text-sm text-spoosh-text-muted">{displayName()}</span>
      </div>
    </div>
  );
};
