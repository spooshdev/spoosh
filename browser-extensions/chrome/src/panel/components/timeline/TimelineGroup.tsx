import { For, Show, type Component, createMemo } from "solid-js";
import type { PluginStepEvent } from "@devtool/types";
import { Badge } from "../shared/Badge";
import { TimelineStep } from "./TimelineStep";

interface TimelineGroupProps {
  groupKey: string;
  pluginName: string;
  steps: PluginStepEvent[];
  isExpanded: boolean;
  onToggle: (groupKey: string) => void;
  expandedSteps: Set<string>;
  onToggleStep: (stepKey: string) => void;
  fullDiffViews: Set<string>;
  onToggleDiffView: (diffKey: string) => void;
  collapsedJsonPaths: Map<string, Set<string>>;
  onToggleJsonPath: (contextId: string, path: string) => void;
  traceId: string;
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

export const TimelineGroup: Component<TimelineGroupProps> = (props) => {
  const firstStep = createMemo(() => props.steps[0]!);
  const lastStep = createMemo(() => props.steps[props.steps.length - 1]!);

  const displayName = createMemo(() => props.pluginName.replace("spoosh:", ""));

  const dotColorClass = createMemo(() => {
    const step = firstStep();

    if (step.color) {
      return COLOR_MAP[step.color] ?? "bg-spoosh-text-muted";
    }

    return STAGE_COLORS[step.stage] ?? "bg-spoosh-text-muted";
  });

  const summaryReason = createMemo(() => {
    const firstReason = firstStep().reason ?? "";
    const lastReason = lastStep().reason ?? "";

    if (firstReason && lastReason && firstReason !== lastReason) {
      return `${firstReason} → ${lastReason}`;
    }

    return firstReason || lastReason;
  });

  const handleToggle = () => {
    props.onToggle(props.groupKey);
  };

  const getStepKey = (step: PluginStepEvent) =>
    `${props.traceId}:${step.plugin}:${step.timestamp}`;

  const getCollapsedPaths = (stepKey: string) =>
    props.collapsedJsonPaths.get(stepKey) ?? new Set<string>();

  return (
    <div class="py-1">
      <div
        class="flex items-center gap-2 cursor-pointer hover:bg-spoosh-surface/50 rounded px-1 py-0.5"
        onClick={handleToggle}
      >
        <div class={`w-2 h-2 rounded-full flex-shrink-0 ${dotColorClass()}`} />

        <span class="text-xs text-spoosh-text font-medium">
          {displayName()}
        </span>

        <Badge variant={getStageBadgeVariant(firstStep().stage)}>
          {firstStep().stage}
        </Badge>

        <span class="text-2xs text-spoosh-primary font-medium">
          {props.steps.length}×
        </span>

        <Show when={!props.isExpanded && summaryReason()}>
          <span class="text-2xs text-spoosh-text-muted truncate flex-1">
            {summaryReason()}
          </span>
        </Show>

        <span class="text-2xs text-spoosh-text-muted ml-auto">
          {props.isExpanded ? "▼" : "▶"}
        </span>
      </div>

      <Show when={props.isExpanded}>
        <div class="ml-4 pl-3 border-l border-spoosh-border">
          <For each={props.steps}>
            {(step) => {
              const stepKey = getStepKey(step);

              return (
                <TimelineStep
                  step={step}
                  stepKey={stepKey}
                  isExpanded={props.expandedSteps.has(stepKey)}
                  onToggle={props.onToggleStep}
                  isFullDiffView={props.fullDiffViews.has(stepKey)}
                  onToggleDiffView={props.onToggleDiffView}
                  collapsedJsonPaths={getCollapsedPaths(stepKey)}
                  onToggleJsonPath={props.onToggleJsonPath}
                />
              );
            }}
          </For>
        </div>
      </Show>
    </div>
  );
};
