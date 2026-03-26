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
        <span class="text-xs font-medium">
          {formatPluginName(props.step.plugin)}
        </span>
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

  const pluginsWithSteps = createMemo(
    () => new Set(steps().map((s) => s.plugin))
  );

  const passedPlugins = createMemo(() =>
    props.knownPlugins.filter(
      (p) => !pluginsWithSteps().has(p) && p !== "spoosh:fetch"
    )
  );

  const showPassedPlugins = () => props.viewState.showPassedPlugins;
  const passedCount = () => passedPlugins().length;

  const getStepKey = (step: PluginStepEvent) =>
    `${traceId()}:${step.plugin}:${step.timestamp}`;
  const isStepExpanded = (step: PluginStepEvent) =>
    props.viewState.expandedSteps.has(getStepKey(step));

  const hasNoData = () =>
    steps().length === 0 && props.knownPlugins.length === 0;

  return (
    <Show
      when={!hasNoData()}
      fallback={<EmptyState message="No plugin events recorded" />}
    >
      <Show when={passedCount() > 0}>
        <div class="flex justify-end mb-2">
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

      <div>
        <Show when={showPassedPlugins()}>
          <For each={passedPlugins()}>
            {(name) => <PassedStep name={name} />}
          </For>
        </Show>

        <For each={beforeFetchSteps()}>
          {(step) => (
            <StepRow
              step={step}
              stepKey={getStepKey(step)}
              isExpanded={isStepExpanded(step)}
              onToggle={() => props.actions.toggleStep(getStepKey(step))}
              fullDiffViews={props.viewState.fullDiffViews}
              onToggleDiff={props.actions.toggleDiffView}
              collapsedJsonPaths={props.viewState.collapsedJsonPaths}
              onTogglePath={props.actions.toggleJsonPath}
            />
          )}
        </For>

        <Show when={fetchIndex() >= 0}>
          <FetchDivider />
        </Show>

        <For each={afterFetchSteps()}>
          {(step) => (
            <StepRow
              step={step}
              stepKey={getStepKey(step)}
              isExpanded={isStepExpanded(step)}
              onToggle={() => props.actions.toggleStep(getStepKey(step))}
              fullDiffViews={props.viewState.fullDiffViews}
              onToggleDiff={props.actions.toggleDiffView}
              collapsedJsonPaths={props.viewState.collapsedJsonPaths}
              onTogglePath={props.actions.toggleJsonPath}
            />
          )}
        </For>
      </div>
    </Show>
  );
};
