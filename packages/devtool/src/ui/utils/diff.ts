import type { DiffLine } from "../../types";
import { highlightJson } from "./format";

function jsonToLines(obj: unknown, indent = 0): string[] {
  if (obj === undefined) return ["undefined"];
  if (obj === null) return ["null"];

  const spaces = "  ".repeat(indent);

  if (Array.isArray(obj)) {
    if (obj.length === 0) return ["[]"];

    const lines = ["["];

    obj.forEach((item, i) => {
      const itemLines = jsonToLines(item, indent + 1);
      const comma = i < obj.length - 1 ? "," : "";
      itemLines[itemLines.length - 1] += comma;
      lines.push(...itemLines.map((l) => spaces + "  " + l));
    });

    lines.push(spaces + "]");
    return lines;
  }

  if (typeof obj === "object") {
    const entries = Object.entries(obj);

    if (entries.length === 0) return ["{}"];

    const lines = ["{"];

    entries.forEach(([key, value], i) => {
      const valueLines = jsonToLines(value, indent + 1);
      const comma = i < entries.length - 1 ? "," : "";

      if (valueLines.length === 1) {
        lines.push(`${spaces}  "${key}": ${valueLines[0]}${comma}`);
      } else {
        lines.push(`${spaces}  "${key}": ${valueLines[0]}`);
        valueLines.slice(1, -1).forEach((l) => lines.push(spaces + "  " + l));
        lines.push(spaces + "  " + valueLines[valueLines.length - 1] + comma);
      }
    });

    lines.push(spaces + "}");
    return lines;
  }

  if (typeof obj === "string") return [`"${obj}"`];

  return [String(obj)];
}

function diffLines(before: string[], after: string[]): DiffLine[] {
  const result: DiffLine[] = [];
  const beforeSet = new Set(before);
  const afterSet = new Set(after);

  let bi = 0;
  let ai = 0;

  while (bi < before.length || ai < after.length) {
    const beforeLine = before[bi];
    const afterLine = after[ai];

    if (bi >= before.length && afterLine !== undefined) {
      result.push({ type: "added", content: afterLine });
      ai++;
    } else if (ai >= after.length && beforeLine !== undefined) {
      result.push({ type: "removed", content: beforeLine });
      bi++;
    } else if (beforeLine === afterLine && beforeLine !== undefined) {
      result.push({ type: "unchanged", content: beforeLine });
      bi++;
      ai++;
    } else if (beforeLine !== undefined && !afterSet.has(beforeLine)) {
      result.push({ type: "removed", content: beforeLine });
      bi++;
    } else if (afterLine !== undefined && !beforeSet.has(afterLine)) {
      result.push({ type: "added", content: afterLine });
      ai++;
    } else if (beforeLine !== undefined) {
      result.push({ type: "removed", content: beforeLine });
      bi++;
    }
  }

  return result;
}

export function computeDiff(before: unknown, after: unknown): DiffLine[] {
  const beforeLines = jsonToLines(before);
  const afterLines = jsonToLines(after);

  return diffLines(beforeLines, afterLines);
}

export function getDiffLinesWithContext(
  lines: DiffLine[],
  contextSize: number
): DiffLine[] {
  const result: DiffLine[] = [];
  const includeIndices = new Set<number>();

  lines.forEach((line, i) => {
    if (line.type !== "unchanged") {
      for (
        let j = Math.max(0, i - contextSize);
        j <= Math.min(lines.length - 1, i + contextSize);
        j++
      ) {
        includeIndices.add(j);
      }
    }
  });

  let lastIncluded = -2;
  const sortedIndices = Array.from(includeIndices).sort((a, b) => a - b);

  for (const i of sortedIndices) {
    if (lastIncluded >= 0 && i > lastIncluded + 1) {
      result.push({ type: "unchanged", content: "···" });
    }

    const line = lines[i];

    if (line) result.push(line);
    lastIncluded = i;
  }

  return result;
}

export function renderDiffLines(lines: DiffLine[]): string {
  return lines
    .map((line) => {
      const prefix =
        line.type === "added" ? "+" : line.type === "removed" ? "-" : " ";
      const className = `spoosh-diff-line-${line.type}`;
      return `<div class="${className}"><span class="spoosh-diff-prefix">${prefix}</span>${highlightJson(line.content)}</div>`;
    })
    .join("");
}
