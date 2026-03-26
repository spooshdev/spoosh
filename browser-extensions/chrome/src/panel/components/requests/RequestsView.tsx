import { createSignal, type Component } from "solid-js";
import type { Trace } from "@devtool/types";
import type { StandaloneEvent } from "@spoosh/core";
import type { ViewState } from "../../App";
import { useStore } from "../../store";
import { TraceList } from "./TraceList";
import { EventList } from "./EventList";

type Actions = {
  updateViewState: <K extends keyof ViewState>(
    key: K,
    value: ViewState[K]
  ) => void;
  selectTrace: (traceId: string | null) => void;
  selectSubscription: (subscriptionId: string | null) => void;
};

interface RequestsViewProps {
  viewState: ViewState;
  actions: Actions;
}

export const RequestsView: Component<RequestsViewProps> = (props) => {
  const store = useStore();
  const [isDragging, setIsDragging] = createSignal(false);

  const traces = (): Trace[] => store.getAllTraces(props.viewState.searchQuery);
  const events = (): StandaloneEvent[] => store.state.events;
  const requestsPanelHeight = () => props.viewState.requestsPanelHeight;

  const handleSelect = (id: string) => {
    const allTraces = traces();
    const selectedTrace = allTraces.find((t) => t.id === id);

    if (selectedTrace?.type === "subscription") {
      props.actions.selectSubscription(id);
    } else {
      props.actions.selectTrace(id);
    }
  };

  const handleMouseDown = (e: MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);

    const container = (e.target as HTMLElement).closest(
      ".requests-view-container"
    );

    if (!container) {
      return;
    }

    const containerRect = container.getBoundingClientRect();

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const relativeY = moveEvent.clientY - containerRect.top;
      const ratio = Math.max(
        0.2,
        Math.min(0.9, relativeY / containerRect.height)
      );
      props.actions.updateViewState("requestsPanelHeight", ratio);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  };

  return (
    <div class="requests-view-container flex flex-col h-full">
      <div
        class="flex flex-col"
        style={{ height: `${requestsPanelHeight() * 100}%` }}
      >
        <div class="px-3 py-2 text-xs font-medium text-spoosh-text-muted border-b border-spoosh-border bg-spoosh-surface/50">
          Requests
        </div>
        <TraceList
          traces={traces()}
          selectedId={props.viewState.selectedTraceId}
          onSelect={handleSelect}
        />
      </div>

      <div
        class={`h-1 bg-spoosh-border cursor-row-resize hover:bg-spoosh-primary/50 transition-colors shrink-0 ${isDragging() ? "bg-spoosh-primary/50" : ""}`}
        onMouseDown={handleMouseDown}
      />

      <div class="flex flex-col flex-1 min-h-0">
        <div class="px-3 py-2 text-xs font-medium text-spoosh-text-muted border-b border-spoosh-border bg-spoosh-surface/50">
          Events
        </div>
        <EventList events={events()} />
      </div>
    </div>
  );
};
