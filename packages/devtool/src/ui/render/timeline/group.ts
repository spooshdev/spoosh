import type { PluginStepEvent } from "../../../types";
import { escapeHtml } from "../../utils";
import { renderTimelineStep } from "./step";

export interface GroupedStepsContext {
  traceId: string;
  steps: PluginStepEvent[];
  isExpanded: boolean;
  expandedSteps: ReadonlySet<string>;
  fullDiffViews: ReadonlySet<string>;
}

const COLOR_MAP: Record<string, string> = {
  success: "var(--spoosh-success)",
  warning: "var(--spoosh-warning)",
  error: "var(--spoosh-error)",
  info: "var(--spoosh-primary)",
  muted: "var(--spoosh-text-muted)",
};

const STAGE_COLORS: Record<string, string> = {
  return: "var(--spoosh-success)",
  log: "var(--spoosh-primary)",
  skip: "var(--spoosh-text-muted)",
  "spoosh:fetch": "var(--spoosh-warning)",
};

export function groupConsecutiveSteps(
  steps: PluginStepEvent[]
): PluginStepEvent[][] {
  if (steps.length === 0) return [];

  const groups: PluginStepEvent[][] = [];
  let currentGroup: PluginStepEvent[] = [steps[0]!];

  for (let i = 1; i < steps.length; i++) {
    const step = steps[i]!;
    const prevStep = steps[i - 1]!;

    if (step.plugin === prevStep.plugin) {
      currentGroup.push(step);
    } else {
      groups.push(currentGroup);
      currentGroup = [step];
    }
  }

  groups.push(currentGroup);
  return groups;
}

export function renderGroupedSteps(ctx: GroupedStepsContext): string {
  const { traceId, steps, isExpanded, expandedSteps, fullDiffViews } = ctx;
  const firstStep = steps[0]!;
  const lastStep = steps[steps.length - 1]!;
  const groupKey = `${traceId}:group:${firstStep.plugin}:${firstStep.timestamp}`;
  const displayName = firstStep.plugin.replace("spoosh:", "");

  const dotColor = firstStep.color
    ? COLOR_MAP[firstStep.color]
    : STAGE_COLORS[firstStep.stage] || "var(--spoosh-text-muted)";

  const firstReason = firstStep.reason || "";
  const lastReason = lastStep.reason || "";
  const summaryReason =
    firstReason && lastReason && firstReason !== lastReason
      ? `${firstReason} → ${lastReason}`
      : firstReason || lastReason;

  if (isExpanded) {
    const expandedItems = steps
      .map((step) =>
        renderTimelineStep({
          traceId,
          step,
          isExpanded: expandedSteps.has(
            `${traceId}:${step.plugin}:${step.timestamp}`
          ),
          fullDiffViews,
        })
      )
      .join("");

    return `
      <div class="spoosh-timeline-group expanded" data-group-key="${groupKey}">
        <div class="spoosh-timeline-group-header" data-action="toggle-group">
          <div class="spoosh-timeline-dot" style="background: ${dotColor}"></div>
          <span class="spoosh-timeline-plugin">${displayName}</span>
          <span class="spoosh-timeline-stage">${firstStep.stage}</span>
          <span class="spoosh-timeline-group-count">${steps.length}×</span>
          <span class="spoosh-plugin-expand">▼</span>
        </div>
        <div class="spoosh-timeline-group-items">
          ${expandedItems}
        </div>
      </div>
    `;
  }

  return `
    <div class="spoosh-timeline-group" data-group-key="${groupKey}">
      <div class="spoosh-timeline-group-header" data-action="toggle-group">
        <div class="spoosh-timeline-dot" style="background: ${dotColor}"></div>
        <span class="spoosh-timeline-plugin">${displayName}</span>
        <span class="spoosh-timeline-stage">${firstStep.stage}</span>
        <span class="spoosh-timeline-group-count">${steps.length}×</span>
        ${summaryReason ? `<span class="spoosh-timeline-reason">${escapeHtml(summaryReason)}</span>` : ""}
        <span class="spoosh-plugin-expand">▶</span>
      </div>
    </div>
  `;
}
