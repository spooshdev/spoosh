import { onMount, type Component } from "solid-js";

interface FindBarProps {
  query: string;
  matchCount: number;
  currentMatch: number;
  onQueryChange: (query: string) => void;
  onNext: () => void;
  onPrev: () => void;
  onClose: () => void;
}

export const FindBar: Component<FindBarProps> = (props) => {
  let inputRef: HTMLInputElement | undefined;

  onMount(() => {
    inputRef?.focus();
  });

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();

      if (e.shiftKey) {
        props.onPrev();
      } else {
        props.onNext();
      }
    }

    if (e.key === "Escape") {
      e.preventDefault();
      props.onClose();
    }
  };

  return (
    <div class="flex items-center gap-2 px-3 py-2 bg-spoosh-surface border-b border-spoosh-border">
      <div class="flex items-center flex-1 gap-2">
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          class="text-spoosh-text-muted flex-shrink-0"
        >
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.35-4.35" />
        </svg>

        <input
          ref={inputRef}
          type="text"
          class="flex-1 bg-transparent border-none outline-none text-sm text-spoosh-text placeholder:text-spoosh-text-muted"
          placeholder="Find in detail..."
          value={props.query}
          onInput={(e) => props.onQueryChange(e.currentTarget.value)}
          onKeyDown={handleKeyDown}
        />
      </div>

      <div class="flex items-center gap-1">
        <span class="text-xs text-spoosh-text-muted min-w-[60px] text-center">
          {props.query
            ? props.matchCount > 0
              ? `${props.currentMatch} of ${props.matchCount}`
              : "No matches"
            : ""}
        </span>

        <button
          class="p-1 text-spoosh-text-muted hover:text-spoosh-text bg-transparent border-none cursor-pointer rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          onClick={props.onPrev}
          disabled={props.matchCount === 0}
          title="Previous match (Shift+Enter)"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <path d="m18 15-6-6-6 6" />
          </svg>
        </button>

        <button
          class="p-1 text-spoosh-text-muted hover:text-spoosh-text bg-transparent border-none cursor-pointer rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          onClick={props.onNext}
          disabled={props.matchCount === 0}
          title="Next match (Enter)"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <path d="m6 9 6 6 6-6" />
          </svg>
        </button>

        <button
          class="p-1 text-spoosh-text-muted hover:text-spoosh-text bg-transparent border-none cursor-pointer rounded transition-colors"
          onClick={props.onClose}
          title="Close (Escape)"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
};
