import type { OperationTrace } from "../../../types";
import { escapeHtml, formatJson } from "../../utils";

const copyIcon = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
  <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
  <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/>
</svg>`;

function renderDataSection(
  label: string,
  data: unknown,
  isError = false
): string {
  const jsonStr = JSON.stringify(data, null, 2);

  return `
    <div class="spoosh-data-section">
      <div class="spoosh-data-label">${label}</div>
      <div class="spoosh-code-block">
        <button class="spoosh-code-copy-btn" data-action="copy" data-copy-content="${escapeHtml(jsonStr)}" title="Copy">
          ${copyIcon}
        </button>
        <pre class="spoosh-json${isError ? " error" : ""}">${formatJson(data)}</pre>
      </div>
    </div>
  `;
}

export function renderDataTab(trace: OperationTrace): string {
  const isPending = trace.duration === undefined;

  if (isPending) {
    return `
      <div class="spoosh-empty-tab spoosh-pending-tab">
        <div class="spoosh-spinner"></div>
        <div>Fetching...</div>
      </div>
    `;
  }

  const response = trace.response;

  if (!response) {
    return `<div class="spoosh-empty-tab">No response data</div>`;
  }

  if (response.error) {
    return renderDataSection("Error", response.error, true);
  }

  return renderDataSection("Response Data", response.data);
}
