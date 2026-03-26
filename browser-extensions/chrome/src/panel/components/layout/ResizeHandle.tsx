import type { Component } from "solid-js";
import { useResize } from "../../hooks/useResize";

interface ResizeHandleProps {
  onResize: (delta: number) => void;
  onResizeEnd?: () => void;
}

export const ResizeHandle: Component<ResizeHandleProps> = (props) => {
  let handleRef: HTMLDivElement | undefined;

  useResize(() => handleRef, {
    direction: "horizontal",
    onResize: props.onResize,
    onResizeEnd: props.onResizeEnd,
  });

  return (
    <div
      ref={handleRef}
      class="w-1 cursor-col-resize bg-spoosh-border hover:bg-spoosh-primary transition-colors flex-shrink-0"
    />
  );
};
