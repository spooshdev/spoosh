import type { Component } from "solid-js";

interface NotDetectedProps {
  onGoImport: () => void;
}

export const NotDetected: Component<NotDetectedProps> = (props) => {
  return (
    <div class="flex flex-col items-center justify-center flex-1 p-10 text-center text-spoosh-text-muted bg-spoosh-bg">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        class="w-16 h-16 mb-4 opacity-50 stroke-spoosh-text-muted"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
      <h2 class="m-0 mb-2 text-lg font-semibold text-spoosh-text">
        Spoosh not detected
      </h2>
      <p class="m-0 text-sm max-w-100 leading-relaxed">
        This page doesn't appear to be using Spoosh, or the devtool plugin is
        not enabled.
      </p>
      <button
        class="mt-4 px-4 py-2 bg-spoosh-primary text-white border-none rounded-md text-sm font-medium cursor-pointer transition-opacity hover:opacity-90"
        onClick={props.onGoImport}
      >
        Go to Import View
      </button>
    </div>
  );
};
