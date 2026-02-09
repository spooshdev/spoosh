import type { TraceInfo } from "../../../types";
import { formatJson } from "../../utils";

export function renderTraceInfo(info: TraceInfo[]): string {
  if (!info || info.length === 0) {
    return "";
  }

  const items = info
    .map(
      (item) => `
      <div class="spoosh-info-item">
        <div class="spoosh-info-label">${item.label}</div>
        <pre class="spoosh-info-value">${formatJson(item.value)}</pre>
      </div>
    `
    )
    .join("");

  return `
    <div class="spoosh-trace-info-section">
      ${items}
    </div>
  `;
}
