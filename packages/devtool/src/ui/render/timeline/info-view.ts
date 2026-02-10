import type { TraceInfo } from "../../../types";
import { formatJson } from "../../utils";

export function renderTraceInfo(info: TraceInfo[]): string {
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
          <pre class="spoosh-info-value">${formatJson(item.value)}</pre>
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
