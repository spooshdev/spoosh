import type { Component, JSX } from "solid-js";

interface ListPanelProps {
  width: number;
  children?: JSX.Element;
}

export const ListPanel: Component<ListPanelProps> = (props) => {
  return (
    <div
      class="flex flex-col bg-spoosh-surface border-r border-spoosh-border"
      style={{ width: `${props.width}px`, "min-width": `${props.width}px` }}
    >
      {props.children}
    </div>
  );
};
