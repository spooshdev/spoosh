import type { Component, JSX } from "solid-js";

interface EmptyStateProps {
  message: string;
  action?: JSX.Element;
}

export const EmptyState: Component<EmptyStateProps> = (props) => {
  return (
    <div class="flex flex-col items-center justify-center p-8 text-center text-spoosh-text-muted">
      <p class="m-0 text-sm">{props.message}</p>
      {props.action}
    </div>
  );
};
