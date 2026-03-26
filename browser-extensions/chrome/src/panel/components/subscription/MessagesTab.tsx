import { For, Show, createMemo, type Component } from "solid-js";
import type { SubscriptionTrace, SubscriptionMessage } from "@devtool/types";
import { JsonTree, CopyButton } from "../shared";
import { formatTime } from "../../utils/format";

interface MessagesTabProps {
  subscription: SubscriptionTrace;
  selectedMessageId: string | null;
  expandedEventTypes: Set<string>;
  showUnlistenedEvents: boolean;
  onSelectMessage: (messageId: string) => void;
  onToggleEventType: (eventType: string) => void;
  onToggleUnlistenedEvents: () => void;
  collapsedJsonPaths: Map<string, Set<string>>;
  onToggleJsonPath: (contextId: string, path: string) => void;
}

function isEventListened(
  eventType: string,
  listenedEvents?: string[]
): boolean {
  if (!listenedEvents || listenedEvents.length === 0) return true;
  if (listenedEvents.includes("*")) return true;

  return listenedEvents.includes(eventType);
}

function parseRawData(rawData: unknown): unknown {
  if (typeof rawData === "string") {
    try {
      return JSON.parse(rawData);
    } catch {
      return rawData;
    }
  }

  return rawData;
}

interface MessageRowProps {
  message: SubscriptionMessage;
  isExpanded: boolean;
  isListened: boolean;
  onSelect: () => void;
  collapsedPaths: Set<string>;
  onTogglePath: (contextId: string, path: string) => void;
}

const MessageRow: Component<MessageRowProps> = (props) => {
  const time = () => formatTime(props.message.timestamp);
  const parsedData = createMemo(() => parseRawData(props.message.rawData));

  const preview = createMemo(() => {
    try {
      const dataStr = JSON.stringify(parsedData());
      return String(dataStr);
    } catch {
      return String(parsedData());
    }
  });

  const jsonString = createMemo(() => JSON.stringify(parsedData(), null, 2));

  const rowClasses = createMemo(() => {
    const base = "border-b border-spoosh-border";
    const expanded = props.isExpanded ? "bg-spoosh-surface" : "";
    const muted = !props.isListened ? "opacity-50" : "";

    return `${base} ${expanded} ${muted}`;
  });

  return (
    <div class={rowClasses()}>
      <div
        class="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-spoosh-surface/50"
        onClick={props.onSelect}
      >
        <span class="text-spoosh-text-muted text-xs w-4 flex-shrink-0">
          {props.isExpanded ? "▼" : "▶"}
        </span>

        <span class="text-2xs text-spoosh-text-muted w-20 flex-shrink-0">
          {time()}
        </span>

        <span class="text-xs font-medium text-spoosh-primary flex-shrink-0">
          {props.message.eventType}
        </span>

        <span class="text-xs text-spoosh-text-muted truncate flex-1">
          {preview()}
        </span>
      </div>

      <Show when={props.isExpanded}>
        <div class="px-3 pb-3">
          <div class="relative bg-spoosh-bg rounded border border-spoosh-border p-2">
            <CopyButton text={jsonString()} class="absolute top-1 right-1" />

            <JsonTree
              data={parsedData()}
              contextId={`msg-${props.message.id}`}
              collapsedPaths={props.collapsedPaths}
              onTogglePath={props.onTogglePath}
            />
          </div>
        </div>
      </Show>
    </div>
  );
};

export const MessagesTab: Component<MessagesTabProps> = (props) => {
  const unlistenedCount = createMemo(() => {
    if (
      !props.subscription.listenedEvents ||
      props.subscription.listenedEvents.length === 0
    ) {
      return 0;
    }

    return props.subscription.messages.filter(
      (msg) =>
        !isEventListened(msg.eventType, props.subscription.listenedEvents)
    ).length;
  });

  const hasUnlistened = () => unlistenedCount() > 0;

  const filteredMessages = createMemo(() => {
    if (props.showUnlistenedEvents) {
      return props.subscription.messages;
    }

    return props.subscription.messages.filter((msg) =>
      isEventListened(msg.eventType, props.subscription.listenedEvents)
    );
  });

  const listenedEventsLabel = () => {
    return props.subscription.listenedEvents?.length
      ? props.subscription.listenedEvents.join(", ")
      : "subscribed events";
  };

  const getCollapsedPaths = (messageId: string) => {
    return (
      props.collapsedJsonPaths.get(`msg-${messageId}`) ?? new Set<string>()
    );
  };

  return (
    <div class="flex flex-col h-full">
      <Show when={hasUnlistened()}>
        <div class="px-3 py-2 border-b border-spoosh-border bg-spoosh-surface">
          <button
            class="text-xs text-spoosh-primary hover:underline"
            onClick={props.onToggleUnlistenedEvents}
          >
            {props.showUnlistenedEvents ? "Hide" : "Show"} {unlistenedCount()}{" "}
            unlistened
          </button>
        </div>
      </Show>

      <Show
        when={props.subscription.messages.length > 0}
        fallback={
          <div class="flex items-center justify-center flex-1 text-spoosh-text-muted text-sm">
            No messages received yet
          </div>
        }
      >
        <Show
          when={filteredMessages().length > 0}
          fallback={
            <div class="flex items-center justify-center flex-1 text-spoosh-text-muted text-sm">
              Waiting for {listenedEventsLabel()}...
            </div>
          }
        >
          <div class="flex-1 overflow-auto">
            <For each={[...filteredMessages()].reverse()}>
              {(message) => (
                <MessageRow
                  message={message}
                  isExpanded={message.id === props.selectedMessageId}
                  isListened={isEventListened(
                    message.eventType,
                    props.subscription.listenedEvents
                  )}
                  onSelect={() => props.onSelectMessage(message.id)}
                  collapsedPaths={getCollapsedPaths(message.id)}
                  onTogglePath={props.onToggleJsonPath}
                />
              )}
            </For>
          </div>
        </Show>
      </Show>
    </div>
  );
};
