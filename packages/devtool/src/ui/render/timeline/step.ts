import type { PluginStepEvent } from "../../../types";
import { escapeHtml } from "../../utils";
import { renderPluginDiff } from "./diff-view";
import { renderTraceInfo } from "./info-view";

export interface TimelineStepContext {
  traceId: string;
  step: PluginStepEvent;
  isExpanded: boolean;
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
  fetch: "var(--spoosh-warning)",
};

export function renderTimelineStep(ctx: TimelineStepContext): string {
  const { traceId, step, isExpanded, fullDiffViews } = ctx;
  const isFetch = step.plugin === "fetch";
  const isSkip = step.stage === "skip";
  const stepKey = `${traceId}:${step.plugin}:${step.timestamp}`;
  const hasDiff =
    step.diff &&
    JSON.stringify(step.diff.before) !== JSON.stringify(step.diff.after);
  const hasInfo = step.info && step.info.length > 0;
  const hasExpandableContent = hasDiff || hasInfo;

  const dotColor = step.color
    ? COLOR_MAP[step.color]
    : STAGE_COLORS[step.stage] || "var(--spoosh-text-muted)";

  const displayName = step.plugin.replace("spoosh:", "");

  if (isFetch) {
    return `
      <div class="spoosh-timeline-fetch">
        <div class="spoosh-fetch-line"></div>
        <div class="spoosh-fetch-label">⚡ Fetch</div>
        <div class="spoosh-fetch-line"></div>
      </div>
    `;
  }

  const expandedContent =
    isExpanded && hasExpandableContent
      ? `<div class="spoosh-plugin-details">
          ${step.info ? renderTraceInfo(step.info) : ""}
          ${hasDiff && step.diff ? renderPluginDiff({ stepKey, diff: step.diff, showFull: fullDiffViews.has(stepKey) }) : ""}
        </div>`
      : "";

  return `
    <div class="spoosh-timeline-step ${isSkip ? "skipped" : ""} ${isExpanded ? "expanded" : ""}" data-step-key="${stepKey}">
      <div class="spoosh-timeline-step-header" ${hasExpandableContent ? 'data-action="toggle-step"' : ""}>
        <div class="spoosh-timeline-dot" style="background: ${dotColor}"></div>
        <span class="spoosh-timeline-plugin">${displayName}</span>
        <span class="spoosh-timeline-stage">${step.stage}</span>
        ${step.reason ? `<span class="spoosh-timeline-reason">${escapeHtml(step.reason)}</span>` : ""}
        ${hasExpandableContent ? `<span class="spoosh-plugin-expand">${isExpanded ? "▼" : "▶"}</span>` : ""}
      </div>
      ${expandedContent}
    </div>
  `;
}

export function renderPassedPlugin(pluginName: string): string {
  const displayName = pluginName.replace("spoosh:", "");

  return `
    <div class="spoosh-timeline-step skipped">
      <div class="spoosh-timeline-step-header">
        <div class="spoosh-timeline-dot" style="background: var(--spoosh-border)"></div>
        <span class="spoosh-timeline-plugin">${displayName}</span>
      </div>
    </div>
  `;
}
