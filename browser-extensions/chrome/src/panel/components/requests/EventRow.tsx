import type { Component } from "solid-js";
import type { StandaloneEvent } from "@spoosh/core";
import { formatTime } from "../../utils/format";

interface EventRowProps {
  event: StandaloneEvent;
}

const COLOR_MAP: Record<string, string> = {
  success: "bg-spoosh-success",
  warning: "bg-spoosh-warning",
  error: "bg-spoosh-error",
  info: "bg-spoosh-primary",
  muted: "bg-spoosh-text-muted",
};

function formatQueryKeyDisplay(queryKey: string): string {
  try {
    const parsed = JSON.parse(queryKey) as {
      path?: string;
      options?: { params?: Record<string, string | number> };
    };

    if (!parsed.path) {
      return queryKey;
    }

    return parsed.path;
  } catch {
    return queryKey;
  }
}

export const EventRow: Component<EventRowProps> = (props) => {
  const pluginName = () => props.event.plugin.replace("spoosh:", "");
  const time = () => formatTime(props.event.timestamp);
  const dotColorClass = () =>
    props.event.color ? COLOR_MAP[props.event.color] : "bg-spoosh-primary";
  const queryKeyDisplay = () =>
    props.event.queryKey ? formatQueryKeyDisplay(props.event.queryKey) : null;

  return (
    <div class="flex items-start gap-2 px-3 py-2 hover:bg-spoosh-surface transition-colors">
      <div class={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${dotColorClass()}`} />

      <div class="flex-1 min-w-0">
        <span class="text-2xs text-spoosh-text-muted">{pluginName()}</span>
        <span class="text-xs text-spoosh-text ml-2">{props.event.message}</span>
        {queryKeyDisplay() && (
          <span class="text-2xs text-spoosh-text-muted ml-2 truncate">
            {queryKeyDisplay()}
          </span>
        )}
      </div>

      <span class="text-2xs text-spoosh-text-muted shrink-0">{time()}</span>
    </div>
  );
};
