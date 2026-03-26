import { Show, Switch, Match, For, type Component } from "solid-js";
import type { CacheEntryDisplay, InternalTab } from "@devtool/types";
import { Badge, CopyButton, JsonTree } from "../shared";
import { parseQueryKey, formatTime } from "../../utils/format";

interface StateDetailProps {
  entry: CacheEntryDisplay | null;
  activeTab: InternalTab;
  onTabChange: (tab: InternalTab) => void;
  collapsedJsonPaths: Map<string, Set<string>>;
  onToggleJsonPath: (contextId: string, path: string) => void;
  onRefetch: (key: string) => void;
  onDelete: (key: string) => void;
}

const tabs: { id: InternalTab; label: string }[] = [
  { id: "data", label: "Data" },
  { id: "meta", label: "Meta" },
  { id: "raw", label: "Raw" },
];

function getMetaEntries(
  meta: Map<string, unknown> | Record<string, unknown>
): Array<[string, unknown]> {
  if (meta instanceof Map) {
    return Array.from(meta.entries());
  }
  return Object.entries(meta);
}

export const StateDetail: Component<StateDetailProps> = (props) => {
  const parsed = () => {
    if (!props.entry) return null;
    return parseQueryKey(props.entry.queryKey, props.entry.resolvedPath);
  };

  const hasError = () => props.entry?.entry.state.error !== undefined;
  const isStale = () => props.entry?.entry.stale === true;

  const contextId = () => (props.entry ? `state-${props.entry.queryKey}` : "");
  const collapsedPaths = () =>
    props.collapsedJsonPaths.get(contextId()) ?? new Set<string>();

  const handleTogglePath = (ctxId: string, path: string) => {
    props.onToggleJsonPath(ctxId, path);
  };

  return (
    <div class="flex flex-col h-full w-full">
      <Show
        when={props.entry}
        fallback={
          <div class="flex flex-col items-center justify-center h-full text-spoosh-text-muted">
            <svg
              width="32"
              height="32"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="1.5"
              class="mb-2 opacity-50"
            >
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
              <line x1="3" y1="9" x2="21" y2="9" />
              <line x1="9" y1="21" x2="9" y2="9" />
            </svg>
            <span class="text-sm">Select a state entry to inspect</span>
          </div>
        }
      >
        <div class="p-3 border-b border-spoosh-border">
          <div class="flex items-center gap-2 mb-2">
            <span
              class={`px-1.5 py-0.5 text-2xs font-semibold rounded uppercase method-${parsed()?.method}`}
            >
              {parsed()?.method}
            </span>
            <span class="text-sm font-medium text-spoosh-text truncate">
              {parsed()?.queryParams
                ? `${parsed()?.path}?${parsed()?.queryParams}`
                : parsed()?.path}
            </span>
          </div>
          <div class="flex items-center gap-2">
            <Badge
              variant={hasError() ? "error" : isStale() ? "warning" : "success"}
            >
              {hasError() ? "Error" : isStale() ? "Stale" : "Fresh"}
            </Badge>
            <Badge variant="neutral">
              {props.entry!.subscriberCount} subscriber
              {props.entry!.subscriberCount !== 1 ? "s" : ""}
            </Badge>
          </div>
        </div>

        <div class="flex border-b border-spoosh-border">
          <For each={tabs}>
            {(tab) => (
              <button
                class={`px-4 py-2 text-xs font-medium transition-colors ${
                  props.activeTab === tab.id
                    ? "text-spoosh-primary border-b-2 border-spoosh-primary"
                    : "text-spoosh-text-muted hover:text-spoosh-text"
                }`}
                onClick={() => props.onTabChange(tab.id)}
              >
                {tab.label}
              </button>
            )}
          </For>
        </div>

        <div class="flex-1 flex flex-col min-h-0 min-w-0 w-full p-3 overflow-hidden">
          <Switch>
            <Match when={props.activeTab === "data"}>
              <DataTab
                entry={props.entry!}
                contextId={contextId()}
                collapsedPaths={collapsedPaths()}
                onTogglePath={handleTogglePath}
              />
            </Match>
            <Match when={props.activeTab === "meta"}>
              <MetaTab
                entry={props.entry!}
                contextId={contextId()}
                collapsedPaths={collapsedPaths()}
                onTogglePath={handleTogglePath}
              />
            </Match>
            <Match when={props.activeTab === "raw"}>
              <RawTab
                entry={props.entry!}
                contextId={contextId()}
                collapsedPaths={collapsedPaths()}
                onTogglePath={handleTogglePath}
              />
            </Match>
          </Switch>
        </div>

        <div class="flex gap-2 px-3 py-2.5 border-t border-spoosh-border bg-spoosh-surface">
          <button
            class="px-2.5 py-1 text-[10px] font-medium rounded border border-[#14b8a6] text-[#14b8a6] bg-spoosh-surface hover:bg-[rgba(20,184,166,0.1)] transition-all"
            onClick={() => props.onRefetch(props.entry!.queryKey)}
          >
            Refetch
          </button>
          <button
            class="px-2.5 py-1 text-[10px] font-medium rounded border border-spoosh-error text-spoosh-error bg-spoosh-surface hover:bg-spoosh-error/10 transition-all"
            onClick={() => props.onDelete(props.entry!.queryKey)}
          >
            Delete
          </button>
        </div>
      </Show>
    </div>
  );
};

interface TabProps {
  entry: CacheEntryDisplay;
  contextId: string;
  collapsedPaths: Set<string>;
  onTogglePath: (contextId: string, path: string) => void;
}

const DataSection: Component<{
  label: string;
  data: unknown;
  contextId: string;
  collapsedPaths: Set<string>;
  onTogglePath: (contextId: string, path: string) => void;
  isError?: boolean;
}> = (props) => {
  const jsonStr = () => JSON.stringify(props.data, null, 2);

  return (
    <div class="flex-1 flex flex-col min-h-0 min-w-0 w-full">
      <div class="flex items-center justify-between mb-2 flex-shrink-0">
        <span class="text-xs font-medium text-spoosh-text-muted">
          {props.label}
        </span>
        <CopyButton text={jsonStr()} />
      </div>
      <div
        class={`flex-1 flex flex-col min-h-0 min-w-0 w-full bg-spoosh-surface rounded p-2 overflow-auto ${props.isError ? "border border-spoosh-error/50" : ""}`}
      >
        <JsonTree
          data={props.data}
          contextId={props.contextId}
          collapsedPaths={props.collapsedPaths}
          onTogglePath={props.onTogglePath}
          withLineNumbers
        />
      </div>
    </div>
  );
};

const DataTab: Component<TabProps> = (props) => {
  const state = () => props.entry.entry.state;

  return (
    <>
      <Show when={state().error}>
        <DataSection
          label="Error"
          data={state().error}
          contextId={props.contextId}
          collapsedPaths={props.collapsedPaths}
          onTogglePath={props.onTogglePath}
          isError
        />
      </Show>

      <Show when={state().data === undefined && !state().error}>
        <div class="text-sm text-spoosh-text-muted text-center py-8">
          No data in state
        </div>
      </Show>

      <Show when={state().data !== undefined}>
        <DataSection
          label="Cached Data"
          data={state().data}
          contextId={props.contextId}
          collapsedPaths={props.collapsedPaths}
          onTogglePath={props.onTogglePath}
        />
      </Show>

      <Show when={props.entry.entry.previousData !== undefined}>
        <DataSection
          label="Previous Data"
          data={props.entry.entry.previousData}
          contextId={props.contextId}
          collapsedPaths={props.collapsedPaths}
          onTogglePath={props.onTogglePath}
        />
      </Show>
    </>
  );
};

const MetaTab: Component<TabProps> = (props) => {
  const stateEntry = () => props.entry.entry;
  const metaEntries = () => getMetaEntries(stateEntry().meta);

  const info = () => [
    {
      label: "Tags",
      value:
        stateEntry().tags.length > 0 ? stateEntry().tags.join(", ") : "(none)",
    },
    { label: "Self Tag", value: stateEntry().selfTag ?? "(none)" },
    { label: "Stale", value: stateEntry().stale ? "Yes" : "No" },
    { label: "Subscribers", value: String(props.entry.subscriberCount) },
    {
      label: "Timestamp",
      value: stateEntry().state.timestamp
        ? formatTime(stateEntry().state.timestamp)
        : "(none)",
    },
  ];

  return (
    <>
      <div class="mb-4">
        <For each={info()}>
          {(item) => (
            <div class="flex justify-between py-1.5 border-b border-spoosh-border last:border-b-0">
              <span class="text-xs text-spoosh-text-muted">{item.label}</span>
              <span class="text-xs text-spoosh-text">{item.value}</span>
            </div>
          )}
        </For>
      </div>

      <Show when={metaEntries().length > 0}>
        <DataSection
          label="Plugin Metadata"
          data={Object.fromEntries(metaEntries())}
          contextId={props.contextId}
          collapsedPaths={props.collapsedPaths}
          onTogglePath={props.onTogglePath}
        />
      </Show>
    </>
  );
};

const RawTab: Component<TabProps> = (props) => {
  const raw = () => ({
    queryKey: props.entry.queryKey,
    state: props.entry.entry.state,
    tags: props.entry.entry.tags,
    selfTag: props.entry.entry.selfTag,
    stale: props.entry.entry.stale,
    meta: Object.fromEntries(getMetaEntries(props.entry.entry.meta)),
    previousData: props.entry.entry.previousData,
    subscriberCount: props.entry.subscriberCount,
  });

  return (
    <DataSection
      label="Raw State Entry"
      data={raw()}
      contextId={props.contextId}
      collapsedPaths={props.collapsedPaths}
      onTogglePath={props.onTogglePath}
    />
  );
};
