import type {
  ExportedTrace,
  ExportedSSE,
  ExportedItem,
  PluginStepEvent,
} from "../../../types";
import type { DetailTab, SubscriptionDetailTab } from "../../view-model";
import { escapeHtml, formatTime, formatDuration } from "../../utils";
import { formatJsonTree } from "../../utils/json-tree";
import { renderTimelineStep, groupConsecutiveSteps } from "../timeline";
import { renderGroupedSteps } from "../timeline/group";

export interface ImportDetailContext {
  item: ExportedItem | null;
  activeTab: DetailTab;
  subscriptionTab?: SubscriptionDetailTab;
  expandedSteps?: ReadonlySet<string>;
  expandedGroups?: ReadonlySet<string>;
  fullDiffViews?: ReadonlySet<string>;
  selectedMessageId?: string | null;
  expandedEventTypes?: ReadonlySet<string>;
  collapsedJsonPaths?: ReadonlyMap<string, ReadonlySet<string>>;
}

const copyIcon = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
  <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
  <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/>
</svg>`;

function renderCodeSection(
  label: string,
  data: unknown,
  contextId: string,
  collapsedPaths: ReadonlySet<string>,
  isError = false,
  badge?: string
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
      <div class="spoosh-data-label">${label}${badge ? ` <span class="spoosh-body-type ${badge}">${badge}</span>` : ""}</div>
      <div class="spoosh-code-block">
        <button class="spoosh-code-copy-btn" data-action="copy" data-copy-content="${escapeHtml(copyContent)}" title="Copy">
          ${copyIcon}
        </button>
        <pre class="spoosh-json${isError ? " error" : ""}">${formattedContent}</pre>
      </div>
    </div>
  `;
}

interface SpooshBody {
  __spooshBody: boolean;
  kind: "form" | "json" | "urlencoded";
  value: unknown;
}

function isSpooshBody(value: unknown): value is SpooshBody {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const obj = value as Record<string, unknown>;
  return (
    obj.__spooshBody === true &&
    typeof obj.kind === "string" &&
    ["form", "json", "urlencoded"].includes(obj.kind) &&
    "value" in obj
  );
}

function isFormDataWrapper(
  value: unknown
): value is { "[FormData]": Record<string, unknown> } {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const obj = value as Record<string, unknown>;
  return "[FormData]" in obj && typeof obj["[FormData]"] === "object";
}

function renderBodySection(
  body: unknown,
  contextId: string,
  collapsedPaths: ReadonlySet<string>
): string {
  if (isSpooshBody(body)) {
    return renderCodeSection(
      "Body",
      body.value,
      contextId,
      collapsedPaths,
      false,
      body.kind
    );
  }

  if (isFormDataWrapper(body)) {
    return renderCodeSection(
      "Body",
      body["[FormData]"],
      contextId,
      collapsedPaths,
      false,
      "form"
    );
  }

  return renderCodeSection(
    "Body",
    body,
    contextId,
    collapsedPaths,
    false,
    "json"
  );
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

function renderImportDataTab(
  trace: ExportedTrace,
  collapsedPaths: ReadonlySet<string>
): string {
  const response = trace.response as Record<string, unknown> | undefined;
  const contextId = `import-data-${trace.id}`;

  if (!response) {
    return `<div class="spoosh-empty-tab">No response data</div>`;
  }

  if (response.aborted) {
    return renderCodeSection(
      "Aborted",
      response.error ?? "Request was aborted",
      contextId,
      collapsedPaths
    );
  }

  if (response.error) {
    return renderCodeSection(
      "Error",
      response.error,
      contextId,
      collapsedPaths,
      true
    );
  }

  return renderCodeSection(
    "Response Data",
    response.data ?? response,
    contextId,
    collapsedPaths
  );
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

function renderImportRequestTab(
  trace: ExportedTrace,
  collapsedPaths: ReadonlySet<string>
): string {
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

  const contextId = `import-request-${trace.id}`;

  return `
    ${hasHeaders ? renderHeadersSection(headers as Record<string, string>) : ""}
    ${hasTags ? renderCodeSection("Tags", trace.tags, contextId, collapsedPaths) : ""}
    ${hasParams ? renderCodeSection("Params", params, contextId, collapsedPaths) : ""}
    ${hasQuery ? renderCodeSection("Query", query, contextId, collapsedPaths) : ""}
    ${hasBody ? renderBodySection(body, contextId, collapsedPaths) : ""}
  `;
}

function renderImportMetaTab(
  trace: ExportedTrace,
  collapsedPaths: ReadonlySet<string>
): string {
  if (!trace.meta || Object.keys(trace.meta).length === 0) {
    return `<div class="spoosh-empty-tab">No meta data</div>`;
  }

  const contextId = `import-meta-${trace.id}`;

  return renderCodeSection(
    "Plugin Meta",
    trace.meta,
    contextId,
    collapsedPaths
  );
}

function renderImportPluginsTab(
  trace: ExportedTrace,
  expandedSteps: ReadonlySet<string>,
  expandedGroups: ReadonlySet<string>,
  fullDiffViews: ReadonlySet<string>,
  collapsedJsonPaths: ReadonlyMap<string, ReadonlySet<string>>
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
          collapsedJsonPaths,
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
          collapsedJsonPaths,
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
        collapsedJsonPaths,
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
          collapsedJsonPaths,
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
          collapsedJsonPaths,
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

function getImportPluginCount(item: ExportedItem): number {
  const activePlugins = new Set(
    item.steps
      .filter((step) => step.stage !== "skip" && step.plugin !== "spoosh:fetch")
      .map((step) => step.plugin)
  );
  return activePlugins.size;
}

function getImportMetaCount(trace: ExportedTrace): number {
  return trace.meta ? Object.keys(trace.meta).length : 0;
}

function renderImportTraceTabContent(ctx: ImportDetailContext): string {
  const {
    item,
    activeTab,
    expandedSteps = new Set<string>(),
    expandedGroups = new Set<string>(),
    fullDiffViews = new Set<string>(),
    collapsedJsonPaths = new Map<string, ReadonlySet<string>>(),
  } = ctx;

  if (!item || item.type !== "request") return "";

  const getCollapsedPaths = (contextId: string) =>
    collapsedJsonPaths.get(contextId) ?? new Set<string>();

  switch (activeTab) {
    case "data":
      return renderImportDataTab(
        item,
        getCollapsedPaths(`import-data-${item.id}`)
      );
    case "request":
      return renderImportRequestTab(
        item,
        getCollapsedPaths(`import-request-${item.id}`)
      );
    case "meta":
      return renderImportMetaTab(
        item,
        getCollapsedPaths(`import-meta-${item.id}`)
      );
    case "plugins":
      return renderImportPluginsTab(
        item,
        expandedSteps,
        expandedGroups,
        fullDiffViews,
        collapsedJsonPaths
      );
    default:
      return "";
  }
}

function renderImportTraceDetail(ctx: ImportDetailContext): string {
  const { item, activeTab } = ctx;

  if (!item || item.type !== "request") return "";

  const response = item.response as Record<string, unknown> | undefined;
  const isAborted = !!response?.aborted;
  const hasError = !!response?.error && !isAborted;
  const statusClass = isAborted ? "aborted" : hasError ? "error" : "success";
  const statusLabel = isAborted ? "Aborted" : hasError ? "Error" : "Success";
  const pluginCount = getImportPluginCount(item);
  const metaCount = getImportMetaCount(item);

  return `
    <div class="spoosh-detail-panel">
      <div class="spoosh-detail-header">
        <div class="spoosh-detail-title">
          <span class="spoosh-trace-method method-${item.method}">${item.method}</span>
          <span class="spoosh-detail-path">${escapeHtml(item.path)}</span>
        </div>
        <div class="spoosh-detail-meta">
          <span class="spoosh-badge ${statusClass}">${statusLabel}</span>
          <span class="spoosh-badge neutral">${item.duration?.toFixed(0) ?? "..."}ms</span>
          <span class="spoosh-badge neutral">${formatTime(item.timestamp)}</span>
          <span class="spoosh-badge neutral">imported</span>
        </div>
      </div>

      <div class="spoosh-tabs">
        <button class="spoosh-tab ${activeTab === "data" ? "active" : ""}" data-tab="data">
          ${isAborted ? "Aborted" : hasError ? "Error" : "Data"}
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
        ${renderImportTraceTabContent(ctx)}
      </div>
    </div>
  `;
}

function getSSEStatusClass(status: ExportedSSE["status"]): string {
  switch (status) {
    case "connected":
      return "success";
    case "error":
      return "error";
    case "connecting":
      return "pending";
    case "disconnected":
    default:
      return "neutral";
  }
}

function getSSEStatusIndicator(status: ExportedSSE["status"]): string {
  switch (status) {
    case "connecting":
      return `<span class="spoosh-status-indicator connecting">◌</span>`;
    case "connected":
      return `<span class="spoosh-status-indicator connected">●</span>`;
    case "disconnected":
      return `<span class="spoosh-status-indicator disconnected">○</span>`;
    case "error":
      return `<span class="spoosh-status-indicator error">●</span>`;
    default:
      return "";
  }
}

function getSSEDuration(sub: ExportedSSE): string {
  if (sub.status === "connecting") return "connecting...";

  const startTime = sub.connectedAt ?? sub.timestamp;
  const endTime = sub.disconnectedAt ?? sub.timestamp;

  return formatDuration(endTime - startTime);
}

function renderSSEMessagesTab(
  sub: ExportedSSE,
  selectedMessageId: string | null,
  collapsedJsonPaths: ReadonlyMap<string, ReadonlySet<string>>
): string {
  if (sub.messages.length === 0) {
    return `<div class="spoosh-empty">No messages received</div>`;
  }

  return `
    <div class="spoosh-messages-list">
      ${[...sub.messages]
        .reverse()
        .map((msg) => {
          const isExpanded = msg.id === selectedMessageId;
          const time = formatTime(msg.timestamp);
          const expandIcon = isExpanded ? "▼" : "▶";
          const jsonStr = JSON.stringify(msg.rawData, null, 2);
          const contextId = `import-sse-msg-${sub.id}-${msg.id}`;
          const collapsedPaths =
            collapsedJsonPaths.get(contextId) ?? new Set<string>();

          return `
            <div class="spoosh-message-row${isExpanded ? " expanded" : ""}">
              <div class="spoosh-message-header" data-message-id="${msg.id}">
                <span class="spoosh-message-expand">${expandIcon}</span>
                <span class="spoosh-message-time">${time}</span>
                <span class="spoosh-message-event">${escapeHtml(msg.eventType)}</span>
                <span class="spoosh-message-preview">${escapeHtml(JSON.stringify(msg.rawData))}</span>
              </div>
              ${
                isExpanded
                  ? `
                <div class="spoosh-message-content">
                  <div class="spoosh-code-block">
                    <button class="spoosh-code-copy-btn" data-action="copy" data-copy-content="${escapeHtml(jsonStr)}" title="Copy">
                      ${copyIcon}
                    </button>
                    <pre class="spoosh-json">${formatJsonTree(msg.rawData, { withLineNumbers: true, contextId, collapsedPaths })}</pre>
                  </div>
                </div>
              `
                  : ""
              }
            </div>
          `;
        })
        .join("")}
    </div>
  `;
}

function renderSSEAccumulatedTab(
  sub: ExportedSSE,
  expandedEventTypes: ReadonlySet<string>,
  collapsedJsonPaths: ReadonlyMap<string, ReadonlySet<string>>
): string {
  const eventTypes = Object.keys(sub.accumulatedData);

  if (eventTypes.length === 0) {
    return `<div class="spoosh-empty">No accumulated data</div>`;
  }

  return `
    <div class="spoosh-accumulated-container">
      <div class="spoosh-accumulated-summary">
        <span class="spoosh-badge neutral">${eventTypes.length} event types</span>
        <span class="spoosh-badge neutral">${sub.messageCount} total messages</span>
      </div>
      <div class="spoosh-event-list">
        ${eventTypes
          .map((eventType) => {
            const isExpanded = !expandedEventTypes.has(eventType);
            const data = sub.accumulatedData[eventType];
            const jsonStr = JSON.stringify(data, null, 2);
            const expandIcon = isExpanded ? "▼" : "▶";
            const contextId = `import-sse-acc-${sub.id}-${eventType}`;
            const collapsedPaths =
              collapsedJsonPaths.get(contextId) ?? new Set<string>();

            return `
              <div class="spoosh-event-section ${isExpanded ? "expanded" : ""}">
                <div class="spoosh-event-header" data-event-type="${escapeHtml(eventType)}">
                  <span class="spoosh-event-expand">${expandIcon}</span>
                  <span class="spoosh-event-name">${escapeHtml(eventType)}</span>
                </div>
                ${
                  isExpanded
                    ? `
                  <div class="spoosh-event-content">
                    <div class="spoosh-code-block">
                      <button class="spoosh-code-copy-btn" data-action="copy" data-copy-content="${escapeHtml(jsonStr)}" title="Copy">
                        ${copyIcon}
                      </button>
                      <pre class="spoosh-json">${formatJsonTree(data, { withLineNumbers: true, contextId, collapsedPaths })}</pre>
                    </div>
                  </div>
                `
                    : ""
                }
              </div>
            `;
          })
          .join("")}
      </div>
    </div>
  `;
}

function renderSSEConnectionTab(sub: ExportedSSE): string {
  const statusClass = getSSEStatusClass(sub.status);
  const connectedDuration = getSSEDuration(sub);

  return `
    <div class="spoosh-connection-container">
      <div class="spoosh-connection-info">
        <div class="spoosh-connection-row">
          <span class="spoosh-connection-label">Status</span>
          <span class="spoosh-badge ${statusClass}">${sub.status}</span>
        </div>

        <div class="spoosh-connection-row">
          <span class="spoosh-connection-label">Channel</span>
          <span class="spoosh-connection-value">${escapeHtml(sub.channel)}</span>
        </div>

        <div class="spoosh-connection-row">
          <span class="spoosh-connection-label">URL</span>
          <span class="spoosh-connection-value spoosh-connection-url">${escapeHtml(sub.connectionUrl)}</span>
        </div>

        <div class="spoosh-connection-row">
          <span class="spoosh-connection-label">Connected Duration</span>
          <span class="spoosh-connection-value">${connectedDuration}</span>
        </div>

        <div class="spoosh-connection-row">
          <span class="spoosh-connection-label">Messages</span>
          <span class="spoosh-connection-value">${sub.messageCount}</span>
        </div>

        <div class="spoosh-connection-row">
          <span class="spoosh-connection-label">Retry Count</span>
          <span class="spoosh-connection-value">${sub.retryCount}</span>
        </div>

        ${
          sub.error
            ? `
          <div class="spoosh-connection-row">
            <span class="spoosh-connection-label">Error</span>
            <span class="spoosh-connection-value error">${escapeHtml(sub.error.message)}</span>
          </div>
        `
            : ""
        }

        ${
          sub.connectedAt
            ? `
          <div class="spoosh-connection-row">
            <span class="spoosh-connection-label">Connected At</span>
            <span class="spoosh-connection-value">${formatTime(sub.connectedAt)}</span>
          </div>
        `
            : ""
        }

        ${
          sub.disconnectedAt
            ? `
          <div class="spoosh-connection-row">
            <span class="spoosh-connection-label">Disconnected At</span>
            <span class="spoosh-connection-value">${formatTime(sub.disconnectedAt)}</span>
          </div>
        `
            : ""
        }
      </div>
    </div>
  `;
}

function renderSSEPluginsTab(
  sub: ExportedSSE,
  expandedSteps: ReadonlySet<string>,
  expandedGroups: ReadonlySet<string>,
  fullDiffViews: ReadonlySet<string>,
  collapsedJsonPaths: ReadonlyMap<string, ReadonlySet<string>>
): string {
  const steps = toPluginStepEvents(sub.id, sub.steps);

  if (steps.length === 0) {
    return `<div class="spoosh-empty-tab">No plugin steps recorded</div>`;
  }

  const timelineItems: string[] = [];
  const groupedSteps = groupConsecutiveSteps(steps);

  for (const group of groupedSteps) {
    if (group.length === 1) {
      timelineItems.push(
        renderTimelineStep({
          traceId: sub.id,
          step: group[0]!,
          isExpanded: expandedSteps.has(
            `${sub.id}:${group[0]!.plugin}:${group[0]!.timestamp}`
          ),
          fullDiffViews,
          collapsedJsonPaths,
        })
      );
    } else {
      timelineItems.push(
        renderGroupedSteps({
          traceId: sub.id,
          steps: group,
          isExpanded: expandedGroups.has(
            `${sub.id}:group:${group[0]!.plugin}:${group[0]!.timestamp}`
          ),
          expandedSteps,
          fullDiffViews,
          collapsedJsonPaths,
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

function renderImportSSETabContent(ctx: ImportDetailContext): string {
  const {
    item,
    subscriptionTab = "messages",
    selectedMessageId = null,
    expandedEventTypes = new Set<string>(),
    expandedSteps = new Set<string>(),
    expandedGroups = new Set<string>(),
    fullDiffViews = new Set<string>(),
    collapsedJsonPaths = new Map<string, ReadonlySet<string>>(),
  } = ctx;

  if (!item || item.type !== "sse") return "";

  switch (subscriptionTab) {
    case "messages":
      return renderSSEMessagesTab(item, selectedMessageId, collapsedJsonPaths);
    case "accumulated":
      return renderSSEAccumulatedTab(
        item,
        expandedEventTypes,
        collapsedJsonPaths
      );
    case "connection":
      return renderSSEConnectionTab(item);
    case "plugins":
      return renderSSEPluginsTab(
        item,
        expandedSteps,
        expandedGroups,
        fullDiffViews,
        collapsedJsonPaths
      );
    default:
      return "";
  }
}

function renderImportSSEDetail(ctx: ImportDetailContext): string {
  const { item, subscriptionTab = "messages" } = ctx;

  if (!item || item.type !== "sse") return "";

  const statusClass = getSSEStatusClass(item.status);
  const statusIndicator = getSSEStatusIndicator(item.status);
  const duration = getSSEDuration(item);
  const pluginCount = getImportPluginCount(item);

  return `
    <div class="spoosh-detail-panel subscription">
      <div class="spoosh-detail-header">
        <div class="spoosh-detail-title">
          <span class="spoosh-trace-method method-sse">SSE</span>
          <span class="spoosh-detail-path">${escapeHtml(item.channel)}</span>
        </div>
        <div class="spoosh-detail-meta">
          ${statusIndicator}
          <span class="spoosh-badge ${statusClass}">${item.status}</span>
          <span class="spoosh-badge neutral">${duration}</span>
          <span class="spoosh-badge neutral">${item.messageCount} msgs</span>
          <span class="spoosh-badge neutral">imported</span>
        </div>
      </div>

      <div class="spoosh-tabs">
        <button class="spoosh-tab ${subscriptionTab === "messages" ? "active" : ""}" data-subscription-tab="messages">
          Messages (${item.messages.length})
        </button>
        <button class="spoosh-tab ${subscriptionTab === "accumulated" ? "active" : ""}" data-subscription-tab="accumulated">
          Accumulated
        </button>
        <button class="spoosh-tab ${subscriptionTab === "connection" ? "active" : ""}" data-subscription-tab="connection">
          Connection
        </button>
        <button class="spoosh-tab ${subscriptionTab === "plugins" ? "active" : ""}" data-subscription-tab="plugins">
          Plugins ${pluginCount > 0 ? `(${pluginCount})` : ""}
        </button>
      </div>

      <div class="spoosh-tab-content">
        ${renderImportSSETabContent(ctx)}
      </div>
    </div>
  `;
}

export function renderImportDetail(ctx: ImportDetailContext): string {
  const { item } = ctx;

  if (!item) {
    return `
      <div class="spoosh-detail-panel">
        <div class="spoosh-detail-empty">
          <div class="spoosh-detail-empty-icon">📋</div>
          <div class="spoosh-detail-empty-text">Select an imported trace to inspect</div>
        </div>
      </div>
    `;
  }

  if (item.type === "sse") {
    return renderImportSSEDetail(ctx);
  }

  return renderImportTraceDetail(ctx);
}
