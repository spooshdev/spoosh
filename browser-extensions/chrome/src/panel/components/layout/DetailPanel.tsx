import type { Component, JSX } from "solid-js";
import { Show } from "solid-js";
import type { PanelView } from "@devtool/types";
import { EmptyState } from "../shared/EmptyState";

interface DetailPanelProps {
  hasSelection: boolean;
  activeView: PanelView;
  children?: JSX.Element;
}

export const DetailPanel: Component<DetailPanelProps> = (props) => {
  return (
    <div class="flex flex-col flex-1 min-w-0 bg-spoosh-bg">
      <Show
        when={props.hasSelection}
        fallback={<DetailPanelEmpty activeView={props.activeView} />}
      >
        {props.children}
      </Show>
    </div>
  );
};

interface DetailPanelEmptyProps {
  activeView: PanelView;
}

const DetailPanelEmpty: Component<DetailPanelEmptyProps> = (props) => {
  const getMessage = () => {
    switch (props.activeView) {
      case "requests":
        return "Select a request to view details";
      case "state":
        return "Select a state entry to view details";
      case "import":
        return "Select an imported trace to view details";
      default:
        return "Nothing selected";
    }
  };

  return (
    <div class="flex items-center justify-center flex-1">
      <EmptyState message={getMessage()} />
    </div>
  );
};
