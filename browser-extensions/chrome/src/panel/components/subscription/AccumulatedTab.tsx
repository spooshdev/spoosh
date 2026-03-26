import { For, Show, createMemo, type Component } from "solid-js";
import type { SubscriptionTrace } from "@devtool/types";
import { JsonTree, CopyButton, Badge } from "../shared";
import { formatTime } from "../../utils/format";

interface AccumulatedTabProps {
  subscription: SubscriptionTrace;
  collapsedJsonPaths: Map<string, Set<string>>;
  onToggleJsonPath: (contextId: string, path: string) => void;
}

interface EventTypeStats {
  eventType: string;
  updateCount: number;
  lastUpdatedAt: number;
  data: unknown;
}

function isEventListened(
  eventType: string,
  listenedEvents?: string[]
): boolean {
  if (!listenedEvents || listenedEvents.length === 0) return true;
  if (listenedEvents.includes("*")) return true;

  return listenedEvents.includes(eventType);
}

function getEventTypeStats(subscription: SubscriptionTrace): EventTypeStats[] {
  const statsMap = new Map<string, { count: number; lastUpdatedAt: number }>();

  for (const msg of subscription.messages) {
    const existing = statsMap.get(msg.eventType);

    if (existing) {
      existing.count++;
      existing.lastUpdatedAt = Math.max(existing.lastUpdatedAt, msg.timestamp);
    } else {
      statsMap.set(msg.eventType, { count: 1, lastUpdatedAt: msg.timestamp });
    }
  }

  const eventTypes = Object.keys(subscription.accumulatedData);

  return eventTypes
    .map((eventType) => {
      const stats = statsMap.get(eventType) || { count: 0, lastUpdatedAt: 0 };

      return {
        eventType,
        updateCount: stats.count,
        lastUpdatedAt: stats.lastUpdatedAt,
        data: subscription.accumulatedData[eventType],
      };
    })
    .sort((a, b) => a.eventType.localeCompare(b.eventType));
}

interface EventTypeSectionProps {
  stats: EventTypeStats;
  isListened: boolean;
  collapsedPaths: Set<string>;
  onTogglePath: (contextId: string, path: string) => void;
}

const EventTypeSection: Component<EventTypeSectionProps> = (props) => {
  const timeStr = () =>
    props.stats.lastUpdatedAt ? formatTime(props.stats.lastUpdatedAt) : "-";
  const updateLabel = () =>
    props.stats.updateCount === 1 ? "update" : "updates";
  const jsonString = createMemo(() =>
    JSON.stringify(props.stats.data, null, 2)
  );

  const sectionClasses = createMemo(() => {
    const base = "border border-spoosh-border rounded mb-3";
    const muted = !props.isListened ? "opacity-50" : "";

    return `${base} ${muted}`;
  });

  return (
    <div class={sectionClasses()}>
      <div class="flex items-center justify-between px-3 py-2 bg-spoosh-surface border-b border-spoosh-border">
        <span class="text-sm font-medium text-spoosh-text">
          {props.stats.eventType}
        </span>

        <div class="flex items-center gap-3 text-2xs text-spoosh-text-muted">
          <span>
            {props.stats.updateCount} {updateLabel()}
          </span>
          <span>{timeStr()}</span>
        </div>
      </div>

      <div class="p-3">
        <div class="relative bg-spoosh-bg rounded border border-spoosh-border p-2">
          <CopyButton text={jsonString()} class="absolute top-1 right-1" />

          <JsonTree
            data={props.stats.data}
            contextId={`acc-${props.stats.eventType}`}
            collapsedPaths={props.collapsedPaths}
            onTogglePath={props.onTogglePath}
          />
        </div>
      </div>
    </div>
  );
};

export const AccumulatedTab: Component<AccumulatedTabProps> = (props) => {
  const eventStats = createMemo(() => getEventTypeStats(props.subscription));

  const hasData = () =>
    Object.keys(props.subscription.accumulatedData).length > 0;

  const sortedStats = createMemo(() => {
    const stats = eventStats();
    const listenedEvents = props.subscription.listenedEvents;

    return [...stats].sort((a, b) => {
      const aListened = isEventListened(a.eventType, listenedEvents);
      const bListened = isEventListened(b.eventType, listenedEvents);

      if (aListened && !bListened) return -1;
      if (!aListened && bListened) return 1;

      return a.eventType.localeCompare(b.eventType);
    });
  });

  const getCollapsedPaths = (eventType: string) => {
    return (
      props.collapsedJsonPaths.get(`acc-${eventType}`) ?? new Set<string>()
    );
  };

  return (
    <div class="flex flex-col h-full overflow-auto p-3">
      <Show
        when={hasData()}
        fallback={
          <div class="flex items-center justify-center flex-1 text-spoosh-text-muted text-sm">
            No accumulated data yet
          </div>
        }
      >
        <div class="flex items-center gap-2 mb-3">
          <Badge variant="neutral">{eventStats().length} event types</Badge>
          <Badge variant="neutral">
            {props.subscription.messageCount} total messages
          </Badge>
        </div>

        <For each={sortedStats()}>
          {(stats) => (
            <EventTypeSection
              stats={stats}
              isListened={isEventListened(
                stats.eventType,
                props.subscription.listenedEvents
              )}
              collapsedPaths={getCollapsedPaths(stats.eventType)}
              onTogglePath={props.onToggleJsonPath}
            />
          )}
        </For>
      </Show>
    </div>
  );
};
