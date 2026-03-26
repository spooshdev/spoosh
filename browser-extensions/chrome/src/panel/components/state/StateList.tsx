import { For, Show, type Component } from "solid-js";
import type { CacheEntryDisplay } from "@devtool/types";
import { EmptyState } from "../shared";
import { StateEntry } from "./StateEntry";

interface StateListProps {
  entries: CacheEntryDisplay[];
  selectedKey: string | null;
  onSelect: (key: string) => void;
}

export const StateList: Component<StateListProps> = (props) => {
  return (
    <div class="flex-1 overflow-y-auto">
      <Show
        when={props.entries.length > 0}
        fallback={<EmptyState message="No state entries" />}
      >
        <For each={props.entries}>
          {(entry) => (
            <StateEntry
              entry={entry}
              isSelected={entry.queryKey === props.selectedKey}
              onSelect={props.onSelect}
            />
          )}
        </For>
      </Show>
    </div>
  );
};
