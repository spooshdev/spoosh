import type { OperationTrace } from "../../../types";
import { formatJson } from "../../utils";

export function getMetaCount(trace: OperationTrace): number {
  return trace.meta ? Object.keys(trace.meta).length : 0;
}

export function renderMetaTab(trace: OperationTrace): string {
  const isPending = trace.duration === undefined;

  if (isPending) {
    return `
      <div class="spoosh-empty-tab spoosh-pending-tab">
        <div class="spoosh-spinner"></div>
        <div>Fetching...</div>
      </div>
    `;
  }

  const meta = trace.meta;

  if (!meta || Object.keys(meta).length === 0) {
    return `<div class="spoosh-empty-tab">No meta data from plugins</div>`;
  }

  return `
    <div class="spoosh-data-section">
      <div class="spoosh-data-label">Plugin Meta</div>
      <pre class="spoosh-json">${formatJson(meta)}</pre>
    </div>
  `;
}
