import { For, Show, type Component } from "solid-js";
import type { StandaloneEvent } from "@spoosh/core";
import { EventRow } from "./EventRow";
import { EmptyState } from "../shared/EmptyState";

interface EventListProps {
  events: StandaloneEvent[];
}

export const EventList: Component<EventListProps> = (props) => {
  const reversedEvents = () => [...props.events].reverse();

  return (
    <div class="flex-1 overflow-y-auto">
      <Show when={props.events.length === 0}>
        <EmptyState message="No events yet" />
      </Show>

      <Show when={props.events.length > 0}>
        <div class="divide-y divide-spoosh-border">
          <For each={reversedEvents()}>
            {(event) => <EventRow event={event} />}
          </For>
        </div>
      </Show>
    </div>
  );
};
