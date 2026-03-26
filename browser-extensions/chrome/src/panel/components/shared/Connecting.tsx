import type { Component } from "solid-js";
import { Spinner } from "./Spinner";

export const Connecting: Component = () => {
  return (
    <div class="flex flex-col items-center justify-center flex-1 p-10 text-center text-spoosh-text-muted bg-spoosh-bg">
      <Spinner size="lg" />
      <h2 class="m-0 mb-2 text-lg font-semibold text-spoosh-text mt-4">
        Connecting...
      </h2>
      <p class="m-0 text-sm max-w-[400px] leading-relaxed">
        Waiting for Spoosh to initialize on this page.
      </p>
    </div>
  );
};
