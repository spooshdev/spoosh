import { For, Show, type Component, createMemo } from "solid-js";
import type { PluginStepEvent } from "@devtool/types";
import { TimelineStep, PassedPluginStep } from "./TimelineStep";
import { TimelineGroup } from "./TimelineGroup";

interface TimelineProps {
  steps: PluginStepEvent[];
  knownPlugins: string[];
  showPassedPlugins: boolean;
  expandedSteps: Set<string>;
  expandedGroups: Set<string>;
  fullDiffViews: Set<string>;
  collapsedJsonPaths: Map<string, Set<string>>;
  onToggleStep: (stepKey: string) => void;
  onToggleGroup: (groupKey: string) => void;
  onToggleDiffView: (diffKey: string) => void;
  onToggleJsonPath: (contextId: string, path: string) => void;
  traceId: string;
}

interface StepGroup {
  type: "single" | "group";
  pluginName: string;
  steps: PluginStepEvent[];
  groupKey: string;
}

function groupConsecutiveSteps(
  steps: PluginStepEvent[],
  traceId: string
): StepGroup[] {
  if (steps.length === 0) return [];

  const groups: StepGroup[] = [];
  let currentGroup: PluginStepEvent[] = [steps[0]!];

  for (let i = 1; i < steps.length; i++) {
    const step = steps[i]!;
    const prevStep = steps[i - 1]!;

    if (step.plugin === prevStep.plugin) {
      currentGroup.push(step);
    } else {
      const firstStep = currentGroup[0]!;
      groups.push({
        type: currentGroup.length === 1 ? "single" : "group",
        pluginName: firstStep.plugin,
        steps: currentGroup,
        groupKey: `${traceId}:group:${firstStep.plugin}:${firstStep.timestamp}`,
      });
      currentGroup = [step];
    }
  }

  const firstStep = currentGroup[0]!;
  groups.push({
    type: currentGroup.length === 1 ? "single" : "group",
    pluginName: firstStep.plugin,
    steps: currentGroup,
    groupKey: `${traceId}:group:${firstStep.plugin}:${firstStep.timestamp}`,
  });

  return groups;
}

export const Timeline: Component<TimelineProps> = (props) => {
  const stepGroups = createMemo(() =>
    groupConsecutiveSteps(props.steps, props.traceId)
  );

  const activePlugins = createMemo(
    () => new Set(props.steps.map((s) => s.plugin))
  );

  const passedPlugins = createMemo(() => {
    if (!props.showPassedPlugins) return [];
    return props.knownPlugins.filter((p) => !activePlugins().has(p));
  });

  const getStepKey = (step: PluginStepEvent) =>
    `${props.traceId}:${step.plugin}:${step.timestamp}`;

  const getCollapsedPaths = (stepKey: string) =>
    props.collapsedJsonPaths.get(stepKey) ?? new Set<string>();

  return (
    <div class="py-2">
      <Show when={props.steps.length === 0}>
        <div class="text-xs text-spoosh-text-muted text-center py-4">
          No plugin steps recorded
        </div>
      </Show>

      <For each={stepGroups()}>
        {(group) => (
          <Show
            when={group.type === "group"}
            fallback={
              <TimelineStep
                step={group.steps[0]!}
                stepKey={getStepKey(group.steps[0]!)}
                isExpanded={props.expandedSteps.has(
                  getStepKey(group.steps[0]!)
                )}
                onToggle={props.onToggleStep}
                isFullDiffView={props.fullDiffViews.has(
                  getStepKey(group.steps[0]!)
                )}
                onToggleDiffView={props.onToggleDiffView}
                collapsedJsonPaths={getCollapsedPaths(
                  getStepKey(group.steps[0]!)
                )}
                onToggleJsonPath={props.onToggleJsonPath}
              />
            }
          >
            <TimelineGroup
              groupKey={group.groupKey}
              pluginName={group.pluginName}
              steps={group.steps}
              isExpanded={props.expandedGroups.has(group.groupKey)}
              onToggle={props.onToggleGroup}
              expandedSteps={props.expandedSteps}
              onToggleStep={props.onToggleStep}
              fullDiffViews={props.fullDiffViews}
              onToggleDiffView={props.onToggleDiffView}
              collapsedJsonPaths={props.collapsedJsonPaths}
              onToggleJsonPath={props.onToggleJsonPath}
              traceId={props.traceId}
            />
          </Show>
        )}
      </For>

      <Show when={passedPlugins().length > 0}>
        <div class="mt-2 pt-2 border-t border-spoosh-border">
          <div class="text-2xs text-spoosh-text-muted mb-1 px-1">
            Passed plugins:
          </div>
          <For each={passedPlugins()}>
            {(pluginName) => <PassedPluginStep pluginName={pluginName} />}
          </For>
        </div>
      </Show>
    </div>
  );
};
