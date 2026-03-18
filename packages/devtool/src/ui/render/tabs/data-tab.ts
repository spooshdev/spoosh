import type { OperationTrace } from "../../../types";
import type { ViewModelState } from "../../view-model";
import { escapeHtml } from "../../utils";
import { formatJsonTree } from "../../utils/json-tree";

const copyIcon = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
  <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
  <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/>
</svg>`;

function renderDataSection(
  label: string,
  data: unknown,
  contextId: string,
  collapsedPaths: ReadonlySet<string>,
  isError = false
): string {
  const isString = typeof data === "string";
  const copyContent = isString ? data : JSON.stringify(data, null, 2);
  const formattedContent = isString
    ? `<span class="spoosh-json-content">${escapeHtml(data)}</span>`
    : formatJsonTree(data, {
        withLineNumbers: true,
        contextId,
        collapsedPaths,
      });

  return `
    <div class="spoosh-data-section">
      <div class="spoosh-data-label">${label}</div>
      <div class="spoosh-code-block">
        <button class="spoosh-code-copy-btn" data-action="copy" data-copy-content="${escapeHtml(copyContent)}" title="Copy">
          ${copyIcon}
        </button>
        <pre class="spoosh-json${isError ? " error" : ""}">${formattedContent}</pre>
      </div>
    </div>
  `;
}

export function renderDataTab(
  trace: OperationTrace,
  state: ViewModelState
): string {
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

  const contextId = `data-${trace.id}`;
  const collapsedPaths = state.collapsedJsonPaths.get(contextId) ?? new Set();

  if (response.aborted) {
    return renderDataSection(
      "Aborted",
      response.error ?? "Request was aborted",
      contextId,
      collapsedPaths
    );
  }

  if (response.error) {
    return renderDataSection(
      "Error",
      response.error,
      contextId,
      collapsedPaths,
      true
    );
  }

  return renderDataSection(
    "Response Data",
    response.data,
    contextId,
    collapsedPaths
  );
}
