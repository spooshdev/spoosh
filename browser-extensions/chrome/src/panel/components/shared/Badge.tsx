import type { Component, JSX } from "solid-js";

interface BadgeProps {
  variant?: "success" | "error" | "warning" | "pending" | "neutral" | "primary";
  children: JSX.Element;
  class?: string;
}

export const Badge: Component<BadgeProps> = (props) => {
  const variantClasses = {
    success: "bg-spoosh-success/20 text-spoosh-success",
    error: "bg-spoosh-error/20 text-spoosh-error",
    warning: "bg-spoosh-warning/20 text-spoosh-warning",
    pending: "bg-spoosh-primary/20 text-spoosh-primary",
    neutral: "bg-spoosh-border text-spoosh-text-muted",
    primary: "bg-spoosh-primary/20 text-spoosh-primary",
  };

  return (
    <span
      class={`inline-flex items-center px-1.5 py-0.5 rounded text-2xs font-medium ${variantClasses[props.variant ?? "neutral"]} ${props.class ?? ""}`}
    >
      {props.children}
    </span>
  );
};
