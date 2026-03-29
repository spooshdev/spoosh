import { For, Show, type Component, createMemo } from "solid-js";
import type { PluginStepEvent } from "@devtool/types";
import type { ViewState } from "../../App";
import type { PanelActions } from "../layout/Panel";
import { EmptyState } from "../shared";
import { JsonTree } from "../shared/JsonTree";
import { computeDiff, getDiffLinesWithContext } from "../../utils/diff";

interface PluginsTabProps {
  trace: {
    id: string;
    steps: PluginStepEvent[];
  };
  viewState: ViewState;
  actions: PanelActions;
  knownPlugins: string[];
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
};

function formatPluginName(name: string): string {
  return name.replace("spoosh:", "");
}

function groupConsecutiveSteps(steps: PluginStepEvent[]): PluginStepEvent[][] {
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

function highlightJson(content: string): Array<{ text: string; cls: string }> {
  const parts: Array<{ text: string; cls: string }> = [];
  let remaining = content;

  while (remaining.length > 0) {
    const keyMatch = remaining.match(/^("(?:\\.|[^"\\])*")\s*:/);
    if (keyMatch) {
      parts.push({ text: keyMatch[1]!, cls: "text-spoosh-primary" });
      parts.push({ text: ":", cls: "" });
      remaining = remaining.slice(keyMatch[0].length);
      continue;
    }

    const strMatch = remaining.match(/^"(?:\\.|[^"\\])*"/);
    if (strMatch) {
      parts.push({ text: strMatch[0], cls: "text-spoosh-success" });
      remaining = remaining.slice(strMatch[0].length);
      continue;
    }

    const numMatch = remaining.match(/^\b-?\d+\.?\d*\b/);
    if (numMatch) {
      parts.push({ text: numMatch[0], cls: "text-spoosh-warning" });
      remaining = remaining.slice(numMatch[0].length);
      continue;
    }

    const boolMatch = remaining.match(/^\b(true|false)\b/);
    if (boolMatch) {
      parts.push({ text: boolMatch[0], cls: "text-spoosh-error" });
      remaining = remaining.slice(boolMatch[0].length);
      continue;
    }

    const nullMatch = remaining.match(/^\bnull\b/);
    if (nullMatch) {
      parts.push({ text: "null", cls: "text-spoosh-text-muted" });
      remaining = remaining.slice(4);
      continue;
    }

    parts.push({ text: remaining[0]!, cls: "" });
    remaining = remaining.slice(1);
  }

  return parts;
}

interface StepRowProps {
  step: PluginStepEvent;
  stepKey: string;
  isExpanded: boolean;
  onToggle: () => void;
  fullDiffViews: Set<string>;
  onToggleDiff: (key: string) => void;
  collapsedJsonPaths: Map<string, Set<string>>;
  onTogglePath: (contextId: string, path: string) => void;
  hidePluginName?: boolean;
}

const StepRow: Component<StepRowProps> = (props) => {
  const isSkip = () => props.step.stage === "skip";

  const hasDiff = createMemo(() => {
    if (!props.step.diff) return false;
    return (
      JSON.stringify(props.step.diff.before) !==
      JSON.stringify(props.step.diff.after)
    );
  });

  const hasInfo = () => props.step.info && props.step.info.length > 0;
  const hasExpandable = () => hasDiff() || hasInfo();

  const dotColor = createMemo(() => {
    if (props.step.color)
      return COLOR_MAP[props.step.color] ?? "bg-spoosh-text-muted";
    return STAGE_COLORS[props.step.stage] ?? "bg-spoosh-text-muted";
  });

  const diffLines = createMemo(() => {
    if (!props.step.diff) return [];
    return computeDiff(props.step.diff.before, props.step.diff.after);
  });

  const displayDiffLines = createMemo(() => {
    const lines = diffLines();
    if (props.fullDiffViews.has(props.stepKey)) return lines;
    return getDiffLinesWithContext(lines, 2);
  });

  const canToggleDiff = createMemo(() => {
    return (
      diffLines().length !== getDiffLinesWithContext(diffLines(), 2).length
    );
  });

  const collapsedPaths = () =>
    props.collapsedJsonPaths.get(props.stepKey) ?? new Set<string>();

  return (
    <div
      class={`border-b border-spoosh-border ${isSkip() ? "opacity-50" : ""}`}
    >
      <div
        class={`flex items-center gap-1.5 py-1.5 px-1 ${hasExpandable() ? "cursor-pointer hover:bg-spoosh-surface" : ""}`}
        onClick={() => hasExpandable() && props.onToggle()}
      >
        <div class={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${dotColor()}`} />
        <Show when={!props.hidePluginName}>
          <span class="text-xs font-medium">
            {formatPluginName(props.step.plugin)}
          </span>
        </Show>
        <span class="text-2xs px-1 py-px rounded bg-spoosh-border text-spoosh-text-muted">
          {props.step.stage}
        </span>
        <Show when={hasExpandable()}>
          <span class="text-2xs text-spoosh-text-muted">
            {props.isExpanded ? "▼" : "▶"}
          </span>
        </Show>
        <span class="flex-1 text-right text-2xs text-spoosh-text-muted truncate">
          {props.step.reason}
        </span>
      </div>

      <Show when={props.isExpanded && hasExpandable()}>
        <div class="bg-spoosh-bg border-t border-spoosh-border p-2">
          <Show when={hasInfo()}>
            <For each={props.step.info}>
              {(info) => (
                <div class="mb-2 last:mb-0">
                  <Show when={info.label}>
                    <div class="text-2xs font-semibold text-spoosh-text-muted mb-1">
                      {info.label}
                    </div>
                  </Show>
                  <div class="bg-spoosh-surface border border-spoosh-border rounded p-1.5 overflow-x-auto">
                    <JsonTree
                      data={info.value}
                      contextId={props.stepKey}
                      collapsedPaths={collapsedPaths()}
                      onTogglePath={props.onTogglePath}
                    />
                  </div>
                </div>
              )}
            </For>
          </Show>

          <Show when={hasDiff() && props.step.diff}>
            <div>
              <Show when={props.step.diff!.label}>
                <div class="text-2xs text-spoosh-text-muted italic mb-1">
                  {props.step.diff!.label}
                </div>
              </Show>

              <Show when={canToggleDiff()}>
                <div class="mb-1">
                  <button
                    class="text-2xs px-1.5 py-0.5 rounded border border-spoosh-border text-spoosh-text-muted hover:text-spoosh-text hover:border-spoosh-text-muted bg-transparent cursor-pointer"
                    onClick={(e) => {
                      e.stopPropagation();
                      props.onToggleDiff(props.stepKey);
                    }}
                  >
                    {props.fullDiffViews.has(props.stepKey)
                      ? "Show changes only"
                      : "Show full"}
                  </button>
                </div>
              </Show>

              <div class="bg-spoosh-surface border border-spoosh-border rounded py-1 text-2xs font-mono leading-relaxed whitespace-pre-wrap break-words overflow-x-auto">
                <For each={displayDiffLines()}>
                  {(line, idx) => {
                    const lineNum = String(idx() + 1).padStart(3, " ");
                    const prefix =
                      line.type === "added"
                        ? "+"
                        : line.type === "removed"
                          ? "-"
                          : " ";
                    const bgClass =
                      line.type === "added"
                        ? "bg-spoosh-success/15"
                        : line.type === "removed"
                          ? "bg-spoosh-error/15"
                          : "";
                    const textClass =
                      line.type === "added"
                        ? "text-spoosh-success"
                        : line.type === "removed"
                          ? "text-spoosh-error"
                          : "text-spoosh-text-muted";

                    return (
                      <div class={`px-1.5 ${bgClass} ${textClass}`}>
                        <span class="text-spoosh-text-muted/50 select-none mr-1">
                          {lineNum}
                        </span>
                        <span class="select-none w-3 inline-block">
                          {prefix}
                        </span>
                        <For each={highlightJson(line.content)}>
                          {(part) => (
                            <span
                              class={line.type === "unchanged" ? "" : part.cls}
                            >
                              {part.text}
                            </span>
                          )}
                        </For>
                      </div>
                    );
                  }}
                </For>
              </div>
            </div>
          </Show>
        </div>
      </Show>
    </div>
  );
};

interface GroupedStepsProps {
  traceId: string;
  steps: PluginStepEvent[];
  groupKey: string;
  isExpanded: boolean;
  onToggle: () => void;
  expandedSteps: Set<string>;
  onToggleStep: (key: string) => void;
  fullDiffViews: Set<string>;
  onToggleDiff: (key: string) => void;
  collapsedJsonPaths: Map<string, Set<string>>;
  onTogglePath: (contextId: string, path: string) => void;
}

const GroupedSteps: Component<GroupedStepsProps> = (props) => {
  const firstStep = () => props.steps[0]!;
  const lastStep = () => props.steps[props.steps.length - 1]!;

  const dotColor = createMemo(() => {
    const step = firstStep();
    if (step.color) return COLOR_MAP[step.color] ?? "bg-spoosh-text-muted";
    return STAGE_COLORS[step.stage] ?? "bg-spoosh-text-muted";
  });

  const summaryReason = createMemo(() => {
    const first = firstStep().reason || "";
    const last = lastStep().reason || "";

    if (first && last && first !== last) {
      return `${first} → ${last}`;
    }

    return first || last;
  });

  const getStepKey = (step: PluginStepEvent) =>
    `${props.traceId}:${step.plugin}:${step.timestamp}`;

  return (
    <div class="border-b border-spoosh-border">
      <div
        class="flex items-center gap-1.5 py-1.5 px-1 cursor-pointer hover:bg-spoosh-surface"
        onClick={props.onToggle}
      >
        <div class={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${dotColor()}`} />
        <span class="text-xs font-medium">
          {formatPluginName(firstStep().plugin)}
        </span>
        <span class="text-2xs px-1 py-px rounded bg-spoosh-border text-spoosh-text-muted">
          {firstStep().stage}
        </span>
        <span class="text-2xs px-1 py-px rounded bg-spoosh-primary/20 text-spoosh-primary">
          {props.steps.length}×
        </span>
        <span class="text-2xs text-spoosh-text-muted">
          {props.isExpanded ? "▼" : "▶"}
        </span>
        <span class="flex-1 text-right text-2xs text-spoosh-text-muted truncate">
          {summaryReason()}
        </span>
      </div>

      <Show when={props.isExpanded}>
        <div class="pl-4 bg-spoosh-bg border-t border-spoosh-border">
          <For each={props.steps}>
            {(step) => (
              <StepRow
                step={step}
                stepKey={getStepKey(step)}
                isExpanded={props.expandedSteps.has(getStepKey(step))}
                onToggle={() => props.onToggleStep(getStepKey(step))}
                fullDiffViews={props.fullDiffViews}
                onToggleDiff={props.onToggleDiff}
                collapsedJsonPaths={props.collapsedJsonPaths}
                onTogglePath={props.onTogglePath}
                hidePluginName
              />
            )}
          </For>
        </div>
      </Show>
    </div>
  );
};

const FetchDivider: Component = () => (
  <div class="flex items-center gap-2 py-2">
    <div class="flex-1 h-px bg-spoosh-warning/50" />
    <span class="text-2xs font-semibold text-spoosh-warning px-2 py-0.5 border border-spoosh-warning rounded-full bg-spoosh-warning/10">
      ⚡ Fetch
    </span>
    <div class="flex-1 h-px bg-spoosh-warning/50" />
  </div>
);

const PassedStep: Component<{ name: string }> = (props) => (
  <div class="border-b border-spoosh-border opacity-40">
    <div class="flex items-center gap-1.5 py-1.5 px-1">
      <div class="w-1.5 h-1.5 rounded-full flex-shrink-0 bg-spoosh-border" />
      <span class="text-xs text-spoosh-text-muted">
        {formatPluginName(props.name)}
      </span>
    </div>
  </div>
);

interface BeforeFetchItem {
  type: "steps" | "passed";
  pluginName: string;
  steps?: PluginStepEvent[];
}

export const PluginsTab: Component<PluginsTabProps> = (props) => {
  const steps = () => props.trace.steps;
  const traceId = () => props.trace.id;

  const fetchIndex = () =>
    steps().findIndex((s) => s.plugin === "spoosh:fetch");

  const beforeFetchSteps = () => {
    const idx = fetchIndex();
    if (idx < 0) return steps().filter((s) => s.plugin !== "spoosh:fetch");
    return steps().slice(0, idx);
  };

  const afterFetchSteps = () => {
    const idx = fetchIndex();
    if (idx < 0) return [];
    return steps().slice(idx + 1);
  };

  const beforeFetchByPlugin = createMemo(() => {
    const map = new Map<string, PluginStepEvent[]>();

    for (const step of beforeFetchSteps()) {
      const existing = map.get(step.plugin) || [];
      existing.push(step);
      map.set(step.plugin, existing);
    }

    return map;
  });

  const pluginsWithBeforeFetchEvents = createMemo(
    () => new Set(beforeFetchSteps().map((s) => s.plugin))
  );

  const passedPlugins = createMemo(() =>
    props.knownPlugins.filter(
      (p) => !pluginsWithBeforeFetchEvents().has(p) && p !== "spoosh:fetch"
    )
  );

  const beforeFetchItems = createMemo((): BeforeFetchItem[] => {
    const items: BeforeFetchItem[] = [];

    for (const pluginName of props.knownPlugins) {
      if (pluginName === "spoosh:fetch") continue;

      const pluginSteps = beforeFetchByPlugin().get(pluginName);

      if (pluginSteps && pluginSteps.length > 0) {
        items.push({ type: "steps", pluginName, steps: pluginSteps });
      } else if (props.viewState.showPassedPlugins) {
        items.push({ type: "passed", pluginName });
      }
    }

    return items;
  });

  const groupedAfterFetchSteps = createMemo(() =>
    groupConsecutiveSteps(afterFetchSteps())
  );

  const showPassedPlugins = () => props.viewState.showPassedPlugins;
  const passedCount = () => passedPlugins().length;

  const getStepKey = (step: PluginStepEvent) =>
    `${traceId()}:${step.plugin}:${step.timestamp}`;

  const getGroupKey = (pluginSteps: PluginStepEvent[]) =>
    `${traceId()}:group:${pluginSteps[0]!.plugin}:${pluginSteps[0]!.timestamp}`;

  const isStepExpanded = (step: PluginStepEvent) =>
    props.viewState.expandedSteps.has(getStepKey(step));

  const isGroupExpanded = (pluginSteps: PluginStepEvent[]) =>
    props.viewState.expandedGroups.has(getGroupKey(pluginSteps));

  const hasNoData = () =>
    steps().length === 0 && props.knownPlugins.length === 0;

  return (
    <Show
      when={!hasNoData()}
      fallback={<EmptyState message="No plugin events recorded" />}
    >
      <div class="flex flex-col h-full min-h-0">
        <Show when={passedCount() > 0}>
          <div class="flex justify-end mb-2 flex-shrink-0">
            <button
              class="text-2xs px-1.5 py-0.5 rounded border border-spoosh-border text-spoosh-text-muted hover:text-spoosh-text hover:border-spoosh-text-muted bg-transparent cursor-pointer"
              onClick={() =>
                props.actions.updateViewState(
                  "showPassedPlugins",
                  !showPassedPlugins()
                )
              }
            >
              {showPassedPlugins()
                ? `Hide ${passedCount()} passed`
                : `Show ${passedCount()} passed`}
            </button>
          </div>
        </Show>

        <div class="flex-1 overflow-auto min-h-0">
          <For each={beforeFetchItems()}>
            {(item) => (
              <Show
                when={item.type === "steps" && item.steps}
                fallback={<PassedStep name={item.pluginName} />}
              >
                {(stepsAccessor) => {
                  const pluginSteps = stepsAccessor();

                  return (
                    <Show
                      when={pluginSteps.length > 1}
                      fallback={
                        <StepRow
                          step={pluginSteps[0]!}
                          stepKey={getStepKey(pluginSteps[0]!)}
                          isExpanded={isStepExpanded(pluginSteps[0]!)}
                          onToggle={() =>
                            props.actions.toggleStep(
                              getStepKey(pluginSteps[0]!)
                            )
                          }
                          fullDiffViews={props.viewState.fullDiffViews}
                          onToggleDiff={props.actions.toggleDiffView}
                          collapsedJsonPaths={
                            props.viewState.collapsedJsonPaths
                          }
                          onTogglePath={props.actions.toggleJsonPath}
                        />
                      }
                    >
                      <GroupedSteps
                        traceId={traceId()}
                        steps={pluginSteps}
                        groupKey={getGroupKey(pluginSteps)}
                        isExpanded={isGroupExpanded(pluginSteps)}
                        onToggle={() =>
                          props.actions.toggleGroup(getGroupKey(pluginSteps))
                        }
                        expandedSteps={props.viewState.expandedSteps}
                        onToggleStep={props.actions.toggleStep}
                        fullDiffViews={props.viewState.fullDiffViews}
                        onToggleDiff={props.actions.toggleDiffView}
                        collapsedJsonPaths={props.viewState.collapsedJsonPaths}
                        onTogglePath={props.actions.toggleJsonPath}
                      />
                    </Show>
                  );
                }}
              </Show>
            )}
          </For>

          <Show when={fetchIndex() >= 0}>
            <FetchDivider />
          </Show>

          <For each={groupedAfterFetchSteps()}>
            {(group) => (
              <Show
                when={group.length > 1}
                fallback={
                  <StepRow
                    step={group[0]!}
                    stepKey={getStepKey(group[0]!)}
                    isExpanded={isStepExpanded(group[0]!)}
                    onToggle={() =>
                      props.actions.toggleStep(getStepKey(group[0]!))
                    }
                    fullDiffViews={props.viewState.fullDiffViews}
                    onToggleDiff={props.actions.toggleDiffView}
                    collapsedJsonPaths={props.viewState.collapsedJsonPaths}
                    onTogglePath={props.actions.toggleJsonPath}
                  />
                }
              >
                <GroupedSteps
                  traceId={traceId()}
                  steps={group}
                  groupKey={getGroupKey(group)}
                  isExpanded={isGroupExpanded(group)}
                  onToggle={() => props.actions.toggleGroup(getGroupKey(group))}
                  expandedSteps={props.viewState.expandedSteps}
                  onToggleStep={props.actions.toggleStep}
                  fullDiffViews={props.viewState.fullDiffViews}
                  onToggleDiff={props.actions.toggleDiffView}
                  collapsedJsonPaths={props.viewState.collapsedJsonPaths}
                  onTogglePath={props.actions.toggleJsonPath}
                />
              </Show>
            )}
          </For>
        </div>
      </div>
    </Show>
  );
};
