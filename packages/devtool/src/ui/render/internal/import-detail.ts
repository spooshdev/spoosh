import type { ExportedTrace, PluginStepEvent } from "../../../types";
import type { DetailTab } from "../../view-model";
import { escapeHtml, formatJson, formatTime } from "../../utils";
import { renderTimelineStep, groupConsecutiveSteps } from "../timeline";
import { renderGroupedSteps } from "../timeline/group";

export interface ImportDetailContext {
  trace: ExportedTrace | null;
  activeTab: DetailTab;
  expandedSteps?: ReadonlySet<string>;
  expandedGroups?: ReadonlySet<string>;
  fullDiffViews?: ReadonlySet<string>;
}

const copyIcon = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
  <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
  <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/>
</svg>`;

function renderCodeSection(
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

function toPluginStepEvents(
  traceId: string,
  steps: ExportedTrace["steps"]
): PluginStepEvent[] {
  return steps.map((step) => ({
    traceId,
    plugin: step.plugin,
    stage: step.stage,
    timestamp: step.timestamp,
    duration: step.duration,
    reason: step.reason,
    color: step.color,
    diff: step.diff,
    info: step.info,
  })) as PluginStepEvent[];
}

function renderImportDataTab(trace: ExportedTrace): string {
  const response = trace.response as Record<string, unknown> | undefined;

  if (!response) {
    return `<div class="spoosh-empty-tab">No response data</div>`;
  }

  if (response.error) {
    return renderCodeSection("Error", response.error, true);
  }

  return renderCodeSection("Response Data", response.data ?? response);
}

function renderHeadersSection(headers: Record<string, string>): string {
  const rows = Object.entries(headers)
    .map(
      ([name, value]) => `
      <div class="spoosh-header-row">
        <span class="spoosh-header-name">${escapeHtml(name)}</span>
        <span class="spoosh-header-value">${escapeHtml(String(value))}</span>
      </div>`
    )
    .join("");

  return `
    <div class="spoosh-data-section">
      <div class="spoosh-data-label">Headers</div>
      <div class="spoosh-headers-list">
        ${rows}
      </div>
    </div>
  `;
}

function renderImportRequestTab(trace: ExportedTrace): string {
  const request = trace.request as Record<string, unknown> | undefined;
  const { query, body, params, headers } = (request ?? {}) as Record<
    string,
    unknown
  >;
  const isReadOperation = trace.method === "GET";
  const hasTags = isReadOperation && trace.tags.length > 0;
  const hasParams =
    params &&
    typeof params === "object" &&
    Object.keys(params as object).length > 0;
  const hasQuery =
    query &&
    typeof query === "object" &&
    Object.keys(query as object).length > 0;
  const hasBody = body !== undefined;
  const hasHeaders =
    headers &&
    typeof headers === "object" &&
    Object.keys(headers as object).length > 0;

  if (!hasTags && !hasParams && !hasQuery && !hasBody && !hasHeaders) {
    return `<div class="spoosh-empty-tab">No request data</div>`;
  }

  return `
    ${hasHeaders ? renderHeadersSection(headers as Record<string, string>) : ""}
    ${hasTags ? renderCodeSection("Tags", trace.tags) : ""}
    ${hasParams ? renderCodeSection("Params", params) : ""}
    ${hasQuery ? renderCodeSection("Query", query) : ""}
    ${hasBody ? renderCodeSection("Body", body) : ""}
  `;
}

function renderImportMetaTab(trace: ExportedTrace): string {
  if (!trace.meta || Object.keys(trace.meta).length === 0) {
    return `<div class="spoosh-empty-tab">No meta data</div>`;
  }

  return renderCodeSection("Plugin Meta", trace.meta);
}

function renderImportPluginsTab(
  trace: ExportedTrace,
  expandedSteps: ReadonlySet<string>,
  expandedGroups: ReadonlySet<string>,
  fullDiffViews: ReadonlySet<string>
): string {
  const steps = toPluginStepEvents(trace.id, trace.steps);

  if (steps.length === 0) {
    return `<div class="spoosh-empty-tab">No plugin steps recorded</div>`;
  }

  const fetchIndex = steps.findIndex((s) => s.plugin === "spoosh:fetch");
  const fetchStep = fetchIndex >= 0 ? steps[fetchIndex] : undefined;

  const beforeFetchSteps =
    fetchIndex >= 0
      ? steps.slice(0, fetchIndex)
      : steps.filter((s) => s.plugin !== "spoosh:fetch");
  const afterFetchSteps = fetchIndex >= 0 ? steps.slice(fetchIndex + 1) : [];

  const timelineItems: string[] = [];

  const groupedBeforeSteps = groupConsecutiveSteps(beforeFetchSteps);

  for (const group of groupedBeforeSteps) {
    if (group.length === 1) {
      timelineItems.push(
        renderTimelineStep({
          traceId: trace.id,
          step: group[0]!,
          isExpanded: expandedSteps.has(
            `${trace.id}:${group[0]!.plugin}:${group[0]!.timestamp}`
          ),
          fullDiffViews,
        })
      );
    } else {
      timelineItems.push(
        renderGroupedSteps({
          traceId: trace.id,
          steps: group,
          isExpanded: expandedGroups.has(
            `${trace.id}:group:${group[0]!.plugin}:${group[0]!.timestamp}`
          ),
          expandedSteps,
          fullDiffViews,
        })
      );
    }
  }

  if (fetchStep) {
    timelineItems.push(
      renderTimelineStep({
        traceId: trace.id,
        step: fetchStep,
        isExpanded: false,
        fullDiffViews,
      })
    );
  }

  const groupedAfterSteps = groupConsecutiveSteps(afterFetchSteps);

  for (const group of groupedAfterSteps) {
    if (group.length === 1) {
      timelineItems.push(
        renderTimelineStep({
          traceId: trace.id,
          step: group[0]!,
          isExpanded: expandedSteps.has(
            `${trace.id}:${group[0]!.plugin}:${group[0]!.timestamp}`
          ),
          fullDiffViews,
        })
      );
    } else {
      timelineItems.push(
        renderGroupedSteps({
          traceId: trace.id,
          steps: group,
          isExpanded: expandedGroups.has(
            `${trace.id}:group:${group[0]!.plugin}:${group[0]!.timestamp}`
          ),
          expandedSteps,
          fullDiffViews,
        })
      );
    }
  }

  return `
    <div class="spoosh-timeline">
      ${timelineItems.join("")}
    </div>
  `;
}

function getImportPluginCount(trace: ExportedTrace): number {
  const activePlugins = new Set(
    trace.steps
      .filter((step) => step.stage !== "skip" && step.plugin !== "spoosh:fetch")
      .map((step) => step.plugin)
  );
  return activePlugins.size;
}

function getImportMetaCount(trace: ExportedTrace): number {
  return trace.meta ? Object.keys(trace.meta).length : 0;
}

function renderImportTabContent(ctx: ImportDetailContext): string {
  const {
    trace,
    activeTab,
    expandedSteps = new Set<string>(),
    expandedGroups = new Set<string>(),
    fullDiffViews = new Set<string>(),
  } = ctx;

  if (!trace) return "";

  switch (activeTab) {
    case "data":
      return renderImportDataTab(trace);
    case "request":
      return renderImportRequestTab(trace);
    case "meta":
      return renderImportMetaTab(trace);
    case "plugins":
      return renderImportPluginsTab(
        trace,
        expandedSteps,
        expandedGroups,
        fullDiffViews
      );
    default:
      return "";
  }
}

export function renderImportDetail(ctx: ImportDetailContext): string {
  const { trace, activeTab } = ctx;

  if (!trace) {
    return `
      <div class="spoosh-detail-panel">
        <div class="spoosh-detail-empty">
          <div class="spoosh-detail-empty-icon">📋</div>
          <div class="spoosh-detail-empty-text">Select an imported trace to inspect</div>
        </div>
      </div>
    `;
  }

  const hasError =
    trace.response !== undefined &&
    typeof trace.response === "object" &&
    trace.response !== null &&
    "error" in trace.response &&
    !!(trace.response as Record<string, unknown>).error;

  const statusClass = hasError ? "error" : "success";
  const statusLabel = hasError ? "Error" : "Success";
  const pluginCount = getImportPluginCount(trace);
  const metaCount = getImportMetaCount(trace);

  return `
    <div class="spoosh-detail-panel">
      <div class="spoosh-detail-header">
        <div class="spoosh-detail-title">
          <span class="spoosh-trace-method method-${trace.method}">${trace.method}</span>
          <span class="spoosh-detail-path">${escapeHtml(trace.path)}</span>
        </div>
        <div class="spoosh-detail-meta">
          <span class="spoosh-badge ${statusClass}">${statusLabel}</span>
          <span class="spoosh-badge neutral">${trace.duration?.toFixed(0) ?? "..."}ms</span>
          <span class="spoosh-badge neutral">${formatTime(trace.timestamp)}</span>
          <span class="spoosh-badge neutral">imported</span>
        </div>
      </div>

      <div class="spoosh-tabs">
        <button class="spoosh-tab ${activeTab === "data" ? "active" : ""}" data-tab="data">
          ${hasError ? "Error" : "Data"}
        </button>
        <button class="spoosh-tab ${activeTab === "request" ? "active" : ""}" data-tab="request">
          Request
        </button>
        <button class="spoosh-tab ${activeTab === "meta" ? "active" : ""}" data-tab="meta">
          Meta${metaCount > 0 ? ` (${metaCount})` : ""}
        </button>
        <button class="spoosh-tab ${activeTab === "plugins" ? "active" : ""}" data-tab="plugins">
          Plugins${pluginCount > 0 ? ` (${pluginCount})` : ""}
        </button>
      </div>

      <div class="spoosh-tab-content">
        ${renderImportTabContent(ctx)}
      </div>
    </div>
  `;
}
