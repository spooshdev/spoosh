import { Show, Switch, Match, For, type Component } from "solid-js";
import type {
  ExportedItem,
  ExportedTrace,
  ExportedSSE,
  DetailTab,
} from "@devtool/types";
import type { SubscriptionDetailTab } from "../../types";
import { Badge, CopyButton, JsonTree } from "../shared";
import { formatTime, formatDuration } from "../../utils/format";

interface ImportDetailProps {
  item: ExportedItem | null;
  viewState: {
    activeTab: DetailTab;
    subscriptionTab: SubscriptionDetailTab;
    selectedMessageId: string | null;
    expandedEventTypes: Set<string>;
    collapsedJsonPaths: Map<string, Set<string>>;
  };
  actions: {
    updateViewState: <K extends string>(key: K, value: unknown) => void;
    selectMessage: (messageId: string | null) => void;
    toggleEventType: (eventType: string) => void;
    toggleJsonPath: (contextId: string, path: string) => void;
  };
}

const traceTabs: { id: DetailTab; label: string }[] = [
  { id: "data", label: "Data" },
  { id: "request", label: "Request" },
  { id: "meta", label: "Meta" },
  { id: "plugins", label: "Plugins" },
];

const sseTabs: { id: SubscriptionDetailTab; label: string }[] = [
  { id: "messages", label: "Messages" },
  { id: "accumulated", label: "Accumulated" },
  { id: "connection", label: "Connection" },
  { id: "plugins", label: "Plugins" },
];

export const ImportDetail: Component<ImportDetailProps> = (props) => {
  return (
    <div class="flex flex-col h-full">
      <Show
        when={props.item}
        fallback={
          <div class="flex flex-col items-center justify-center h-full text-spoosh-text-muted">
            <span class="text-2xl mb-2">&#x1F4CB;</span>
            <span class="text-sm">Select an imported trace to inspect</span>
          </div>
        }
      >
        <Switch>
          <Match when={props.item?.type === "sse"}>
            <SSEDetail
              item={props.item as ExportedSSE}
              viewState={props.viewState}
              actions={props.actions}
            />
          </Match>
          <Match when={props.item?.type === "request"}>
            <TraceDetail
              item={props.item as ExportedTrace}
              viewState={props.viewState}
              actions={props.actions}
            />
          </Match>
        </Switch>
      </Show>
    </div>
  );
};

const DataSection: Component<{
  label: string;
  data: unknown;
  contextId: string;
  collapsedPaths: Set<string>;
  onTogglePath: (contextId: string, path: string) => void;
  isError?: boolean;
  badge?: string;
}> = (componentProps) => {
  const jsonStr = () => JSON.stringify(componentProps.data, null, 2);

  return (
    <div class="flex-1 flex flex-col min-h-0">
      <div class="flex items-center justify-between mb-2">
        <div class="flex items-center gap-2">
          <span class="text-xs font-medium text-spoosh-text-muted">
            {componentProps.label}
          </span>
          {componentProps.badge && (
            <span class="text-2xs px-1 py-0.5 rounded bg-spoosh-border text-spoosh-text-muted">
              {componentProps.badge}
            </span>
          )}
        </div>
        <CopyButton text={jsonStr()} />
      </div>
      <div
        class={`flex-1 flex flex-col min-h-0 bg-spoosh-surface rounded p-2 ${componentProps.isError ? "border border-spoosh-error/50" : ""}`}
      >
        <JsonTree
          data={componentProps.data}
          contextId={componentProps.contextId}
          collapsedPaths={componentProps.collapsedPaths}
          onTogglePath={componentProps.onTogglePath}
          withLineNumbers
        />
      </div>
    </div>
  );
};

interface TraceDetailInternalProps {
  item: ExportedTrace;
  viewState: ImportDetailProps["viewState"];
  actions: ImportDetailProps["actions"];
}

const TraceDetail: Component<TraceDetailInternalProps> = (props) => {
  const response = () =>
    props.item.response as Record<string, unknown> | undefined;
  const isAborted = () => !!response()?.aborted;
  const hasError = () => !!response()?.error && !isAborted();

  const statusClass = () => {
    if (isAborted()) return "warning";
    if (hasError()) return "error";
    return "success";
  };

  const statusLabel = () => {
    if (isAborted()) return "Aborted";
    if (hasError()) return "Error";
    return "Success";
  };

  const pluginCount = () => {
    const activePlugins = new Set(
      props.item.steps
        .filter(
          (step) => step.stage !== "skip" && step.plugin !== "spoosh:fetch"
        )
        .map((step) => step.plugin)
    );
    return activePlugins.size;
  };

  const metaCount = () =>
    props.item.meta ? Object.keys(props.item.meta).length : 0;
  const contextId = () => `import-${props.item.id}`;
  const collapsedPaths = () =>
    props.viewState.collapsedJsonPaths.get(contextId()) ?? new Set<string>();

  return (
    <>
      <div class="p-3 border-b border-spoosh-border">
        <div class="flex items-center gap-2 mb-2">
          <span
            class={`px-1.5 py-0.5 text-2xs font-semibold rounded uppercase method-${props.item.method}`}
          >
            {props.item.method}
          </span>
          <span class="text-sm font-medium text-spoosh-text truncate">
            {props.item.path}
          </span>
        </div>
        <div class="flex items-center gap-2 flex-wrap">
          <Badge variant={statusClass()}>{statusLabel()}</Badge>
          <Badge variant="neutral">
            {props.item.duration?.toFixed(0) ?? "..."}ms
          </Badge>
          <Badge variant="neutral">{formatTime(props.item.timestamp)}</Badge>
          <Badge variant="neutral">imported</Badge>
        </div>
      </div>

      <div class="flex border-b border-spoosh-border">
        <For each={traceTabs}>
          {(tab) => (
            <button
              class={`px-4 py-2 text-xs font-medium transition-colors ${
                props.viewState.activeTab === tab.id
                  ? "text-spoosh-primary border-b-2 border-spoosh-primary"
                  : "text-spoosh-text-muted hover:text-spoosh-text"
              }`}
              onClick={() => props.actions.updateViewState("activeTab", tab.id)}
            >
              {tab.label}
              {tab.id === "meta" && metaCount() > 0 && ` (${metaCount()})`}
              {tab.id === "plugins" &&
                pluginCount() > 0 &&
                ` (${pluginCount()})`}
            </button>
          )}
        </For>
      </div>

      <div class="flex-1 flex flex-col min-h-0 p-3">
        <Switch>
          <Match when={props.viewState.activeTab === "data"}>
            <TraceDataTab
              item={props.item}
              contextId={contextId()}
              collapsedPaths={collapsedPaths()}
              onTogglePath={props.actions.toggleJsonPath}
            />
          </Match>
          <Match when={props.viewState.activeTab === "request"}>
            <TraceRequestTab
              item={props.item}
              contextId={contextId()}
              collapsedPaths={collapsedPaths()}
              onTogglePath={props.actions.toggleJsonPath}
            />
          </Match>
          <Match when={props.viewState.activeTab === "meta"}>
            <TraceMetaTab
              item={props.item}
              contextId={contextId()}
              collapsedPaths={collapsedPaths()}
              onTogglePath={props.actions.toggleJsonPath}
            />
          </Match>
          <Match when={props.viewState.activeTab === "plugins"}>
            <TracePluginsTab item={props.item} />
          </Match>
        </Switch>
      </div>
    </>
  );
};

interface TabProps {
  item: ExportedTrace;
  contextId: string;
  collapsedPaths: Set<string>;
  onTogglePath: (contextId: string, path: string) => void;
}

const TraceDataTab: Component<TabProps> = (props) => {
  const response = () =>
    props.item.response as Record<string, unknown> | undefined;

  return (
    <>
      <Show when={!response()}>
        <div class="text-sm text-spoosh-text-muted text-center py-8">
          No response data
        </div>
      </Show>

      <Show when={response()?.aborted}>
        <DataSection
          label="Aborted"
          data={response()?.error ?? "Request was aborted"}
          contextId={props.contextId}
          collapsedPaths={props.collapsedPaths}
          onTogglePath={props.onTogglePath}
        />
      </Show>

      <Show when={response()?.error && !response()?.aborted}>
        <DataSection
          label="Error"
          data={response()?.error}
          contextId={props.contextId}
          collapsedPaths={props.collapsedPaths}
          onTogglePath={props.onTogglePath}
          isError
        />
      </Show>

      <Show when={response() && !response()?.error && !response()?.aborted}>
        <DataSection
          label="Response Data"
          data={response()?.data ?? response()}
          contextId={props.contextId}
          collapsedPaths={props.collapsedPaths}
          onTogglePath={props.onTogglePath}
        />
      </Show>
    </>
  );
};

const TraceRequestTab: Component<TabProps> = (props) => {
  const request = () =>
    props.item.request as Record<string, unknown> | undefined;
  const query = () => request()?.query as Record<string, unknown> | undefined;
  const body = () => request()?.body;
  const params = () => request()?.params as Record<string, unknown> | undefined;
  const headers = () =>
    request()?.headers as Record<string, string> | undefined;

  const isReadOperation = () => props.item.method === "GET";
  const hasTags = () => isReadOperation() && props.item.tags.length > 0;
  const hasParams = () => params() && Object.keys(params()!).length > 0;
  const hasQuery = () => query() && Object.keys(query()!).length > 0;
  const hasBody = () => body() !== undefined;
  const hasHeaders = () => headers() && Object.keys(headers()!).length > 0;

  const hasAnyContent = () =>
    hasTags() || hasParams() || hasQuery() || hasBody() || hasHeaders();

  return (
    <>
      <Show when={!hasAnyContent()}>
        <div class="text-sm text-spoosh-text-muted text-center py-8">
          No request data
        </div>
      </Show>

      <Show when={hasHeaders()}>
        <div class="mb-4">
          <div class="text-xs font-medium text-spoosh-text-muted mb-2">
            Headers
          </div>
          <div class="bg-spoosh-surface rounded p-2">
            <For each={Object.entries(headers()!)}>
              {([name, value]) => (
                <div class="flex py-1 border-b border-spoosh-border last:border-b-0">
                  <span class="text-xs text-spoosh-primary w-1/3">{name}</span>
                  <span class="text-xs text-spoosh-text flex-1">{value}</span>
                </div>
              )}
            </For>
          </div>
        </div>
      </Show>

      <Show when={hasTags()}>
        <DataSection
          label="Tags"
          data={props.item.tags}
          contextId={props.contextId}
          collapsedPaths={props.collapsedPaths}
          onTogglePath={props.onTogglePath}
        />
      </Show>

      <Show when={hasParams()}>
        <DataSection
          label="Params"
          data={params()}
          contextId={props.contextId}
          collapsedPaths={props.collapsedPaths}
          onTogglePath={props.onTogglePath}
        />
      </Show>

      <Show when={hasQuery()}>
        <DataSection
          label="Query"
          data={query()}
          contextId={props.contextId}
          collapsedPaths={props.collapsedPaths}
          onTogglePath={props.onTogglePath}
        />
      </Show>

      <Show when={hasBody()}>
        <DataSection
          label="Body"
          data={body()}
          contextId={props.contextId}
          collapsedPaths={props.collapsedPaths}
          onTogglePath={props.onTogglePath}
          badge="json"
        />
      </Show>
    </>
  );
};

const TraceMetaTab: Component<TabProps> = (props) => {
  const hasMeta = () =>
    props.item.meta && Object.keys(props.item.meta).length > 0;

  return (
    <>
      <Show when={!hasMeta()}>
        <div class="text-sm text-spoosh-text-muted text-center py-8">
          No meta data
        </div>
      </Show>

      <Show when={hasMeta()}>
        <DataSection
          label="Plugin Meta"
          data={props.item.meta}
          contextId={props.contextId}
          collapsedPaths={props.collapsedPaths}
          onTogglePath={props.onTogglePath}
        />
      </Show>
    </>
  );
};

const TracePluginsTab: Component<{ item: ExportedTrace }> = (props) => {
  const steps = () => props.item.steps;
  const hasSteps = () => steps().length > 0;

  return (
    <>
      <Show when={!hasSteps()}>
        <div class="text-sm text-spoosh-text-muted text-center py-8">
          No plugin steps recorded
        </div>
      </Show>

      <Show when={hasSteps()}>
        <div class="space-y-1">
          <For each={steps()}>
            {(step) => (
              <div class="flex items-center gap-2 px-2 py-1.5 bg-spoosh-surface rounded text-xs">
                <span
                  class="w-2 h-2 rounded-full shrink-0"
                  style={{ "background-color": step.color ?? "#666" }}
                />
                <span class="font-medium text-spoosh-text">{step.plugin}</span>
                <span class="text-spoosh-text-muted">{step.stage}</span>
                {step.duration !== undefined && (
                  <span class="text-spoosh-text-muted ml-auto">
                    {step.duration.toFixed(1)}ms
                  </span>
                )}
              </div>
            )}
          </For>
        </div>
      </Show>
    </>
  );
};

interface SSEDetailInternalProps {
  item: ExportedSSE;
  viewState: ImportDetailProps["viewState"];
  actions: ImportDetailProps["actions"];
}

const SSEDetail: Component<SSEDetailInternalProps> = (props) => {
  const statusClass = () => {
    switch (props.item.status) {
      case "connected":
        return "success";
      case "error":
        return "error";
      case "connecting":
        return "pending";
      default:
        return "neutral";
    }
  };

  const duration = () => {
    if (props.item.status === "connecting") return "connecting...";

    const startTime = props.item.connectedAt ?? props.item.timestamp;
    const endTime = props.item.disconnectedAt ?? props.item.timestamp;

    return formatDuration(endTime - startTime);
  };

  const pluginCount = () => {
    const activePlugins = new Set(
      props.item.steps
        .filter(
          (step) => step.stage !== "skip" && step.plugin !== "spoosh:fetch"
        )
        .map((step) => step.plugin)
    );
    return activePlugins.size;
  };

  return (
    <>
      <div class="p-3 border-b border-spoosh-border">
        <div class="flex items-center gap-2 mb-2">
          <span class="px-1.5 py-0.5 text-2xs font-semibold rounded uppercase method-sse">
            SSE
          </span>
          <span class="text-sm font-medium text-spoosh-text truncate">
            {props.item.channel}
          </span>
        </div>
        <div class="flex items-center gap-2 flex-wrap">
          <Badge variant={statusClass()}>{props.item.status}</Badge>
          <Badge variant="neutral">{duration()}</Badge>
          <Badge variant="neutral">{props.item.messageCount} msgs</Badge>
          <Badge variant="neutral">imported</Badge>
        </div>
      </div>

      <div class="flex border-b border-spoosh-border">
        <For each={sseTabs}>
          {(tab) => (
            <button
              class={`px-4 py-2 text-xs font-medium transition-colors ${
                props.viewState.subscriptionTab === tab.id
                  ? "text-spoosh-primary border-b-2 border-spoosh-primary"
                  : "text-spoosh-text-muted hover:text-spoosh-text"
              }`}
              onClick={() =>
                props.actions.updateViewState("subscriptionTab", tab.id)
              }
            >
              {tab.label}
              {tab.id === "messages" && ` (${props.item.messages.length})`}
              {tab.id === "plugins" &&
                pluginCount() > 0 &&
                ` (${pluginCount()})`}
            </button>
          )}
        </For>
      </div>

      <div class="flex-1 overflow-y-auto p-3">
        <Switch>
          <Match when={props.viewState.subscriptionTab === "messages"}>
            <SSEMessagesTab
              item={props.item}
              selectedMessageId={props.viewState.selectedMessageId}
              collapsedJsonPaths={props.viewState.collapsedJsonPaths}
              onSelectMessage={props.actions.selectMessage}
              onTogglePath={props.actions.toggleJsonPath}
            />
          </Match>
          <Match when={props.viewState.subscriptionTab === "accumulated"}>
            <SSEAccumulatedTab
              item={props.item}
              expandedEventTypes={props.viewState.expandedEventTypes}
              collapsedJsonPaths={props.viewState.collapsedJsonPaths}
              onToggleEventType={props.actions.toggleEventType}
              onTogglePath={props.actions.toggleJsonPath}
            />
          </Match>
          <Match when={props.viewState.subscriptionTab === "connection"}>
            <SSEConnectionTab item={props.item} />
          </Match>
          <Match when={props.viewState.subscriptionTab === "plugins"}>
            <SSEPluginsTab item={props.item} />
          </Match>
        </Switch>
      </div>
    </>
  );
};

const SSEMessagesTab: Component<{
  item: ExportedSSE;
  selectedMessageId: string | null;
  collapsedJsonPaths: Map<string, Set<string>>;
  onSelectMessage: (id: string | null) => void;
  onTogglePath: (contextId: string, path: string) => void;
}> = (props) => {
  const reversedMessages = () => [...props.item.messages].reverse();

  return (
    <>
      <Show when={props.item.messages.length === 0}>
        <div class="text-sm text-spoosh-text-muted text-center py-8">
          No messages received
        </div>
      </Show>

      <Show when={props.item.messages.length > 0}>
        <div class="space-y-1">
          <For each={reversedMessages()}>
            {(msg) => {
              const isExpanded = () => msg.id === props.selectedMessageId;
              const contextId = () =>
                `import-sse-msg-${props.item.id}-${msg.id}`;
              const collapsedPaths = () =>
                props.collapsedJsonPaths.get(contextId()) ?? new Set<string>();

              return (
                <div
                  class={`bg-spoosh-surface rounded overflow-hidden ${isExpanded() ? "ring-1 ring-spoosh-primary/30" : ""}`}
                >
                  <div
                    class="flex items-center gap-2 px-2 py-1.5 cursor-pointer hover:bg-spoosh-hover"
                    onClick={() => props.onSelectMessage(msg.id)}
                  >
                    <span class="text-2xs text-spoosh-text-muted">
                      {isExpanded() ? "▼" : "▶"}
                    </span>
                    <span class="text-2xs text-spoosh-text-muted">
                      {formatTime(msg.timestamp)}
                    </span>
                    <span class="text-xs font-medium text-spoosh-primary">
                      {msg.eventType}
                    </span>
                    <span class="text-xs text-spoosh-text-muted truncate flex-1">
                      {JSON.stringify(msg.rawData)}
                    </span>
                  </div>

                  <Show when={isExpanded()}>
                    <div class="px-2 pb-2 border-t border-spoosh-border">
                      <div class="flex justify-end py-1">
                        <CopyButton
                          text={JSON.stringify(msg.rawData, null, 2)}
                        />
                      </div>
                      <JsonTree
                        data={msg.rawData}
                        contextId={contextId()}
                        collapsedPaths={collapsedPaths()}
                        onTogglePath={props.onTogglePath}
                        withLineNumbers
                      />
                    </div>
                  </Show>
                </div>
              );
            }}
          </For>
        </div>
      </Show>
    </>
  );
};

const SSEAccumulatedTab: Component<{
  item: ExportedSSE;
  expandedEventTypes: Set<string>;
  collapsedJsonPaths: Map<string, Set<string>>;
  onToggleEventType: (eventType: string) => void;
  onTogglePath: (contextId: string, path: string) => void;
}> = (props) => {
  const eventTypes = () => Object.keys(props.item.accumulatedData);

  return (
    <>
      <Show when={eventTypes().length === 0}>
        <div class="text-sm text-spoosh-text-muted text-center py-8">
          No accumulated data
        </div>
      </Show>

      <Show when={eventTypes().length > 0}>
        <div class="flex items-center gap-2 mb-4">
          <Badge variant="neutral">{eventTypes().length} event types</Badge>
          <Badge variant="neutral">
            {props.item.messageCount} total messages
          </Badge>
        </div>

        <div class="space-y-2">
          <For each={eventTypes()}>
            {(eventType) => {
              const isExpanded = () => !props.expandedEventTypes.has(eventType);
              const data = () => props.item.accumulatedData[eventType];
              const contextId = () =>
                `import-sse-acc-${props.item.id}-${eventType}`;
              const collapsedPaths = () =>
                props.collapsedJsonPaths.get(contextId()) ?? new Set<string>();

              return (
                <div
                  class={`bg-spoosh-surface rounded overflow-hidden ${isExpanded() ? "ring-1 ring-spoosh-primary/30" : ""}`}
                >
                  <div
                    class="flex items-center gap-2 px-2 py-1.5 cursor-pointer hover:bg-spoosh-hover"
                    onClick={() => props.onToggleEventType(eventType)}
                  >
                    <span class="text-2xs text-spoosh-text-muted">
                      {isExpanded() ? "▼" : "▶"}
                    </span>
                    <span class="text-xs font-medium text-spoosh-text">
                      {eventType}
                    </span>
                  </div>

                  <Show when={isExpanded()}>
                    <div class="px-2 pb-2 border-t border-spoosh-border">
                      <div class="flex justify-end py-1">
                        <CopyButton text={JSON.stringify(data(), null, 2)} />
                      </div>
                      <JsonTree
                        data={data()}
                        contextId={contextId()}
                        collapsedPaths={collapsedPaths()}
                        onTogglePath={props.onTogglePath}
                        withLineNumbers
                      />
                    </div>
                  </Show>
                </div>
              );
            }}
          </For>
        </div>
      </Show>
    </>
  );
};

const SSEConnectionTab: Component<{ item: ExportedSSE }> = (props) => {
  const statusClass = () => {
    switch (props.item.status) {
      case "connected":
        return "success";
      case "error":
        return "error";
      case "connecting":
        return "pending";
      default:
        return "neutral";
    }
  };

  const duration = () => {
    if (props.item.status === "connecting") return "connecting...";

    const startTime = props.item.connectedAt ?? props.item.timestamp;
    const endTime = props.item.disconnectedAt ?? props.item.timestamp;

    return formatDuration(endTime - startTime);
  };

  const rows = () => [
    { label: "Status", value: props.item.status, badge: statusClass() },
    { label: "Channel", value: props.item.channel },
    { label: "URL", value: props.item.connectionUrl },
    { label: "Connected Duration", value: duration() },
    { label: "Messages", value: String(props.item.messageCount) },
    { label: "Retry Count", value: String(props.item.retryCount) },
    ...(props.item.error
      ? [{ label: "Error", value: props.item.error.message, isError: true }]
      : []),
    ...(props.item.connectedAt
      ? [{ label: "Connected At", value: formatTime(props.item.connectedAt) }]
      : []),
    ...(props.item.disconnectedAt
      ? [
          {
            label: "Disconnected At",
            value: formatTime(props.item.disconnectedAt),
          },
        ]
      : []),
  ];

  return (
    <div class="space-y-1">
      <For each={rows()}>
        {(row) => (
          <div class="flex justify-between py-2 px-2 bg-spoosh-surface rounded">
            <span class="text-xs text-spoosh-text-muted">{row.label}</span>
            <Show
              when={row.badge}
              fallback={
                <span
                  class={`text-xs text-spoosh-text ${row.isError ? "text-spoosh-error" : ""}`}
                >
                  {row.value}
                </span>
              }
            >
              <Badge
                variant={
                  row.badge as "success" | "error" | "pending" | "neutral"
                }
              >
                {row.value}
              </Badge>
            </Show>
          </div>
        )}
      </For>
    </div>
  );
};

const SSEPluginsTab: Component<{ item: ExportedSSE }> = (props) => {
  const steps = () => props.item.steps;
  const hasSteps = () => steps().length > 0;

  return (
    <>
      <Show when={!hasSteps()}>
        <div class="text-sm text-spoosh-text-muted text-center py-8">
          No plugin steps recorded
        </div>
      </Show>

      <Show when={hasSteps()}>
        <div class="space-y-1">
          <For each={steps()}>
            {(step) => (
              <div class="flex items-center gap-2 px-2 py-1.5 bg-spoosh-surface rounded text-xs">
                <span
                  class="w-2 h-2 rounded-full shrink-0"
                  style={{ "background-color": step.color ?? "#666" }}
                />
                <span class="font-medium text-spoosh-text">{step.plugin}</span>
                <span class="text-spoosh-text-muted">{step.stage}</span>
                {step.duration !== undefined && (
                  <span class="text-spoosh-text-muted ml-auto">
                    {step.duration.toFixed(1)}ms
                  </span>
                )}
              </div>
            )}
          </For>
        </div>
      </Show>
    </>
  );
};
