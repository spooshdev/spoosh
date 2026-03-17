import type { DiffLine } from "../../types";
import { highlightJson } from "./format";

function jsonToLines(obj: unknown, indent = 0): string[] {
  const spaces = "  ".repeat(indent);

  if (obj === undefined) return [`${spaces}undefined`];
  if (obj === null) return [`${spaces}null`];

  if (Array.isArray(obj)) {
    if (obj.length === 0) return [`${spaces}[]`];

    const lines = [`${spaces}[`];

    obj.forEach((item, i) => {
      const itemLines = jsonToLines(item, indent + 1);
      const comma = i < obj.length - 1 ? "," : "";
      itemLines[itemLines.length - 1] += comma;
      lines.push(...itemLines);
    });

    lines.push(`${spaces}]`);
    return lines;
  }

  if (typeof obj === "object") {
    const entries = Object.entries(obj);

    if (entries.length === 0) return [`${spaces}{}`];

    const lines = [`${spaces}{`];
    const childSpaces = "  ".repeat(indent + 1);

    entries.forEach(([key, value], i) => {
      const valueLines = jsonToLines(value, indent + 1);
      const comma = i < entries.length - 1 ? "," : "";

      const firstLine = valueLines[0];

      if (!firstLine) {
        lines.push(`${childSpaces}"${key}": undefined${comma}`);
      } else if (valueLines.length === 1) {
        const valueStr = firstLine.trimStart();
        lines.push(`${childSpaces}"${key}": ${valueStr}${comma}`);
      } else {
        lines.push(`${childSpaces}"${key}": ${firstLine.trimStart()}`);
        valueLines.slice(1, -1).forEach((l) => lines.push(l));
        const lastLine = valueLines[valueLines.length - 1] ?? "";
        lines.push(lastLine + comma);
      }
    });

    lines.push(`${spaces}}`);
    return lines;
  }

  if (typeof obj === "string") return [`${spaces}"${obj}"`];

  return [`${spaces}${String(obj)}`];
}

function computeLCS(before: string[], after: string[]): number[][] {
  const m = before.length;
  const n = after.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () =>
    Array<number>(n + 1).fill(0)
  );

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const dpRow = dp[i];
      const dpPrevRow = dp[i - 1];

      if (!dpRow || !dpPrevRow) continue;

      if (before[i - 1] === after[j - 1]) {
        dpRow[j] = (dpPrevRow[j - 1] ?? 0) + 1;
      } else {
        dpRow[j] = Math.max(dpPrevRow[j] ?? 0, dpRow[j - 1] ?? 0);
      }
    }
  }

  return dp;
}

function diffLines(before: string[], after: string[]): DiffLine[] {
  const result: DiffLine[] = [];
  const dp = computeLCS(before, after);

  let i = before.length;
  let j = after.length;
  const operations: DiffLine[] = [];

  while (i > 0 || j > 0) {
    const beforeContent = before[i - 1];
    const afterContent = after[j - 1];
    const dpRow = dp[i];
    const dpPrevRow = dp[i - 1];

    if (
      i > 0 &&
      j > 0 &&
      beforeContent === afterContent &&
      beforeContent !== undefined
    ) {
      operations.push({ type: "unchanged", content: beforeContent });
      i--;
      j--;
    } else if (
      j > 0 &&
      afterContent !== undefined &&
      (i === 0 || (dpRow?.[j - 1] ?? 0) >= (dpPrevRow?.[j] ?? 0))
    ) {
      operations.push({ type: "added", content: afterContent });
      j--;
    } else if (i > 0 && beforeContent !== undefined) {
      operations.push({ type: "removed", content: beforeContent });
      i--;
    } else {
      break;
    }
  }

  for (let k = operations.length - 1; k >= 0; k--) {
    const op = operations[k];
    if (op) result.push(op);
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
  const lineNumWidth = String(lines.length).length;

  return lines
    .map((line, index) => {
      const prefix =
        line.type === "added" ? "+" : line.type === "removed" ? "-" : " ";
      const className = `spoosh-diff-line-${line.type}`;
      const lineNum = String(index + 1).padStart(lineNumWidth, " ");
      return `<div class="${className}"><span class="spoosh-json-line-num">${lineNum}</span><span class="spoosh-diff-prefix">${prefix}</span>${highlightJson(line.content)}</div>`;
    })
    .join("");
}
