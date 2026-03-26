import type { Component } from "solid-js";

interface SpinnerProps {
  size?: "sm" | "md" | "lg";
}

export const Spinner: Component<SpinnerProps> = (props) => {
  const sizeClasses = {
    sm: "w-4 h-4 border-2",
    md: "w-6 h-6 border-2",
    lg: "w-10 h-10 border-3",
  };

  return (
    <div
      class={`${sizeClasses[props.size ?? "md"]} border-spoosh-border border-t-spoosh-primary rounded-full animate-spin`}
      style={{ "border-width": props.size === "lg" ? "3px" : "2px" }}
    />
  );
};
