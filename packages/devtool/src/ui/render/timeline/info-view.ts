import type { TraceInfo } from "../../../types";
import { formatJsonTree } from "../../utils/json-tree";

export interface TraceInfoContext {
  info: TraceInfo[];
  contextId: string;
  collapsedPaths: ReadonlySet<string>;
}

export function renderTraceInfo(ctx: TraceInfoContext): string {
  const { info, contextId, collapsedPaths } = ctx;

  if (!info || info.length === 0) {
    return "";
  }

  const items = info
    .map((item) => {
      const label = item.label
        ? `<div class="spoosh-info-label">${item.label}</div>`
        : "";

      return `
        <div class="spoosh-info-item">
          ${label}
          <pre class="spoosh-info-value">${formatJsonTree(item.value, {
            withLineNumbers: true,
            contextId,
            collapsedPaths,
          })}</pre>
        </div>
      `;
    })
    .join("");

  return `
    <div class="spoosh-trace-info-section">
      ${items}
    </div>
  `;
}
