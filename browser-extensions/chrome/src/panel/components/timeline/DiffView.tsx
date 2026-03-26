import { For, Show, type Component, createMemo } from "solid-js";
import type { DiffLine } from "@devtool/types";
import { computeDiff, getDiffLinesWithContext } from "../../utils/diff";

interface DiffViewProps {
  before: unknown;
  after: unknown;
  label?: string;
  diffKey: string;
  isFullView: boolean;
  onToggle: (diffKey: string) => void;
}

function highlightJsonLine(
  content: string
): Array<{ text: string; class: string }> {
  const parts: Array<{ text: string; class: string }> = [];
  let remaining = content;

  while (remaining.length > 0) {
    // Match key: "key":
    const keyMatch = remaining.match(/^("(?:\\.|[^"\\])*")\s*:/);
    if (keyMatch) {
      parts.push({ text: keyMatch[1]!, class: "text-spoosh-primary" });
      parts.push({ text: ":", class: "text-spoosh-text" });
      remaining = remaining.slice(keyMatch[0].length);
      continue;
    }

    // Match string value: "value"
    const strMatch = remaining.match(/^"(?:\\.|[^"\\])*"/);
    if (strMatch) {
      parts.push({ text: strMatch[0], class: "text-spoosh-success" });
      remaining = remaining.slice(strMatch[0].length);
      continue;
    }

    // Match number
    const numMatch = remaining.match(/^\b\d+\.?\d*\b/);
    if (numMatch) {
      parts.push({ text: numMatch[0], class: "text-spoosh-warning" });
      remaining = remaining.slice(numMatch[0].length);
      continue;
    }

    // Match boolean
    const boolMatch = remaining.match(/^\b(true|false)\b/);
    if (boolMatch) {
      parts.push({ text: boolMatch[0], class: "text-spoosh-primary" });
      remaining = remaining.slice(boolMatch[0].length);
      continue;
    }

    // Match null
    const nullMatch = remaining.match(/^\bnull\b/);
    if (nullMatch) {
      parts.push({ text: "null", class: "text-spoosh-text-muted" });
      remaining = remaining.slice(4);
      continue;
    }

    // Match undefined
    const undefinedMatch = remaining.match(/^\bundefined\b/);
    if (undefinedMatch) {
      parts.push({ text: "undefined", class: "text-spoosh-text-muted" });
      remaining = remaining.slice(9);
      continue;
    }

    // Take one character at a time
    parts.push({ text: remaining[0]!, class: "text-spoosh-text" });
    remaining = remaining.slice(1);
  }

  return parts;
}

const DiffLineView: Component<{
  line: DiffLine;
  lineNumber: number;
  lineNumWidth: number;
}> = (props) => {
  const bgClass = createMemo(() => {
    switch (props.line.type) {
      case "added":
        return "bg-spoosh-success/10";
      case "removed":
        return "bg-spoosh-error/10";
      default:
        return "";
    }
  });

  const prefixClass = createMemo(() => {
    switch (props.line.type) {
      case "added":
        return "text-spoosh-success";
      case "removed":
        return "text-spoosh-error";
      default:
        return "text-spoosh-text-muted";
    }
  });

  const prefix = createMemo(() => {
    switch (props.line.type) {
      case "added":
        return "+";
      case "removed":
        return "-";
      default:
        return " ";
    }
  });

  const lineNum = createMemo(() =>
    String(props.lineNumber).padStart(props.lineNumWidth, " ")
  );

  const highlightedParts = createMemo(() => {
    if (props.line.content === "···") {
      return [{ text: "···", class: "text-spoosh-text-muted" }];
    }

    return highlightJsonLine(props.line.content);
  });

  return (
    <div class={`flex font-mono text-xs leading-5 ${bgClass()}`}>
      <span
        class="text-spoosh-text-muted select-none px-2 text-right flex-shrink-0"
        style={{ width: `${props.lineNumWidth + 2}ch` }}
      >
        {lineNum()}
      </span>
      <span
        class={`select-none w-4 text-center flex-shrink-0 ${prefixClass()}`}
      >
        {prefix()}
      </span>
      <span class="whitespace-pre flex-1">
        <For each={highlightedParts()}>
          {(part) => <span class={part.class}>{part.text}</span>}
        </For>
      </span>
    </div>
  );
};

export const DiffView: Component<DiffViewProps> = (props) => {
  const diffLines = createMemo(() => computeDiff(props.before, props.after));

  const linesWithContext = createMemo(() =>
    getDiffLinesWithContext(diffLines(), 2)
  );

  const canToggle = createMemo(
    () => diffLines().length !== linesWithContext().length
  );

  const displayLines = createMemo(() =>
    props.isFullView ? diffLines() : linesWithContext()
  );

  const lineNumWidth = createMemo(() => String(displayLines().length).length);

  const handleToggle = () => {
    props.onToggle(props.diffKey);
  };

  return (
    <div class="border border-spoosh-border rounded overflow-hidden">
      <Show when={props.label || canToggle()}>
        <div class="px-2 py-1.5 flex items-center justify-between bg-spoosh-surface border-b border-spoosh-border">
          <Show when={props.label}>
            <span class="text-xs text-spoosh-text-muted">{props.label}</span>
          </Show>

          <Show when={canToggle()}>
            <button
              class="text-xs text-spoosh-primary hover:text-spoosh-primary/80 cursor-pointer bg-transparent border-none ml-auto"
              onClick={handleToggle}
            >
              {props.isFullView ? "Show changes only" : "Show full"}
            </button>
          </Show>
        </div>
      </Show>

      <Show
        when={displayLines().length > 0}
        fallback={
          <div class="px-2 py-3 text-xs text-spoosh-text-muted text-center">
            No changes
          </div>
        }
      >
        <div class="overflow-x-auto">
          <For each={displayLines()}>
            {(line, index) => (
              <DiffLineView
                line={line}
                lineNumber={index() + 1}
                lineNumWidth={lineNumWidth()}
              />
            )}
          </For>
        </div>
      </Show>
    </div>
  );
};
