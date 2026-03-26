import { For, Show, type Component } from "solid-js";
import type { Trace } from "@devtool/types";
import { TraceCard } from "./TraceCard";
import { SubscriptionCard } from "./SubscriptionCard";
import { EmptyState } from "../shared/EmptyState";

interface TraceListProps {
  traces: Trace[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export const TraceList: Component<TraceListProps> = (props) => {
  return (
    <div class="flex-1 overflow-y-auto">
      <Show when={props.traces.length === 0}>
        <EmptyState message="No requests yet" />
      </Show>

      <Show when={props.traces.length > 0}>
        <div class="divide-y divide-spoosh-border">
          <For each={props.traces}>
            {(trace) => (
              <Show
                when={trace.type === "subscription"}
                fallback={
                  <TraceCard
                    trace={trace as Trace & { type: "request" }}
                    selected={trace.id === props.selectedId}
                    onClick={() => props.onSelect(trace.id)}
                  />
                }
              >
                <SubscriptionCard
                  subscription={trace as Trace & { type: "subscription" }}
                  selected={trace.id === props.selectedId}
                  onClick={() => props.onSelect(trace.id)}
                />
              </Show>
            )}
          </For>
        </div>
      </Show>
    </div>
  );
};
