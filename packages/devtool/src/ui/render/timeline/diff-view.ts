import {
  computeDiff,
  getDiffLinesWithContext,
  renderDiffLines,
} from "../../utils";

export interface PluginDiffContext {
  stepKey: string;
  diff: { before: unknown; after: unknown };
  showFull: boolean;
}

export function renderPluginDiff(ctx: PluginDiffContext): string {
  const { stepKey, diff, showFull } = ctx;
  const diffLines = computeDiff(diff.before, diff.after);
  const linesWithContext = getDiffLinesWithContext(diffLines, 2);

  const canToggle = diffLines.length !== linesWithContext.length;

  if (showFull) {
    return `
      <div class="spoosh-plugin-diff">
        ${
          canToggle
            ? `
          <div class="spoosh-diff-header">
            <button class="spoosh-diff-toggle" data-action="toggle-diff-view" data-diff-key="${stepKey}">
              Show changes only
            </button>
          </div>
        `
            : ""
        }
        <pre class="spoosh-diff-lines">${renderDiffLines(diffLines)}</pre>
      </div>
    `;
  }

  if (linesWithContext.length === 0) {
    return `<div class="spoosh-plugin-diff"><div class="spoosh-empty-tab">No changes</div></div>`;
  }

  return `
    <div class="spoosh-plugin-diff">
      ${
        canToggle
          ? `
        <div class="spoosh-diff-header">
          <button class="spoosh-diff-toggle" data-action="toggle-diff-view" data-diff-key="${stepKey}">
            Show full
          </button>
        </div>
      `
          : ""
      }
      <pre class="spoosh-diff-lines">${renderDiffLines(linesWithContext)}</pre>
    </div>
  `;
}
