import type { OperationTrace, PluginStepEvent } from "../../../types";
import {
  renderTimelineStep,
  renderPassedPlugin,
  groupConsecutiveSteps,
} from "../timeline";
import { renderGroupedSteps } from "../timeline/group";

export interface PluginsTabContext {
  trace: OperationTrace;
  knownPlugins: string[];
  showPassedPlugins: boolean;
  expandedSteps: ReadonlySet<string>;
  expandedGroups: ReadonlySet<string>;
  fullDiffViews: ReadonlySet<string>;
}

export function renderPluginsTab(ctx: PluginsTabContext): string {
  const {
    trace,
    knownPlugins,
    showPassedPlugins,
    expandedSteps,
    expandedGroups,
    fullDiffViews,
  } = ctx;
  const steps = trace.steps;

  const fetchIndex = steps.findIndex((s) => s.plugin === "spoosh:fetch");
  const fetchStep = fetchIndex >= 0 ? steps[fetchIndex] : undefined;

  const beforeFetchSteps =
    fetchIndex >= 0
      ? steps.slice(0, fetchIndex)
      : steps.filter((s) => s.plugin !== "spoosh:fetch");
  const afterFetchSteps = fetchIndex >= 0 ? steps.slice(fetchIndex + 1) : [];

  const beforeFetchByPlugin = new Map<string, PluginStepEvent[]>();

  for (const step of beforeFetchSteps) {
    const existing = beforeFetchByPlugin.get(step.plugin) || [];
    existing.push(step);
    beforeFetchByPlugin.set(step.plugin, existing);
  }

  const pluginsWithBeforeEvents = new Set(
    beforeFetchSteps.map((s) => s.plugin)
  );
  const passedPlugins = knownPlugins.filter(
    (p) => !pluginsWithBeforeEvents.has(p)
  );

  if (steps.length === 0 && knownPlugins.length === 0) {
    return `<div class="spoosh-empty-tab">No plugin events recorded</div>`;
  }

  const timelineItems: string[] = [];

  for (const pluginName of knownPlugins) {
    const pluginSteps = beforeFetchByPlugin.get(pluginName);

    if (pluginSteps && pluginSteps.length > 0) {
      if (pluginSteps.length === 1) {
        timelineItems.push(
          renderTimelineStep({
            traceId: trace.id,
            step: pluginSteps[0]!,
            isExpanded: expandedSteps.has(
              `${trace.id}:${pluginSteps[0]!.plugin}:${pluginSteps[0]!.timestamp}`
            ),
            fullDiffViews,
          })
        );
      } else {
        timelineItems.push(
          renderGroupedSteps({
            traceId: trace.id,
            steps: pluginSteps,
            isExpanded: expandedGroups.has(
              `${trace.id}:group:${pluginSteps[0]!.plugin}:${pluginSteps[0]!.timestamp}`
            ),
            expandedSteps,
            fullDiffViews,
          })
        );
      }
    } else if (showPassedPlugins) {
      timelineItems.push(renderPassedPlugin(pluginName));
    }
  }

  if (fetchStep) {
    timelineItems.push(
      renderTimelineStep({
        traceId: trace.id,
        step: fetchStep,
        isExpanded: false,
        fullDiffViews,
      })
    );
  }

  const groupedAfterSteps = groupConsecutiveSteps(afterFetchSteps);

  for (const group of groupedAfterSteps) {
    if (group.length === 1) {
      timelineItems.push(
        renderTimelineStep({
          traceId: trace.id,
          step: group[0]!,
          isExpanded: expandedSteps.has(
            `${trace.id}:${group[0]!.plugin}:${group[0]!.timestamp}`
          ),
          fullDiffViews,
        })
      );
    } else {
      timelineItems.push(
        renderGroupedSteps({
          traceId: trace.id,
          steps: group,
          isExpanded: expandedGroups.has(
            `${trace.id}:group:${group[0]!.plugin}:${group[0]!.timestamp}`
          ),
          expandedSteps,
          fullDiffViews,
        })
      );
    }
  }

  return `
    ${
      passedPlugins.length > 0
        ? `
      <div class="spoosh-plugins-header">
        <button class="spoosh-toggle-passed" data-action="toggle-passed">
          ${showPassedPlugins ? "Hide" : "Show"} ${passedPlugins.length} passed
        </button>
      </div>
    `
        : ""
    }
    <div class="spoosh-timeline">
      ${timelineItems.join("")}
    </div>
  `;
}
