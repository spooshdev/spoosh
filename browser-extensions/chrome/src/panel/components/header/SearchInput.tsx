import type { Component } from "solid-js";

interface SearchInputProps {
  /** Current search query value */
  value: string;

  /** Callback when search value changes */
  onChange: (value: string) => void;

  /** Placeholder text for the input */
  placeholder?: string;
}

export const SearchInput: Component<SearchInputProps> = (props) => {
  return (
    <div class="relative flex items-center">
      <svg
        class="absolute left-2 w-3 h-3 text-spoosh-text-muted pointer-events-none"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
      >
        <circle cx="11" cy="11" r="8" />
        <path d="M21 21l-4.35-4.35" />
      </svg>

      <input
        type="text"
        class="w-full pl-7 pr-7 py-1 text-xs bg-spoosh-bg border border-spoosh-border rounded text-spoosh-text placeholder:text-spoosh-text-muted focus:outline-none focus:border-spoosh-primary"
        placeholder={props.placeholder ?? "Search..."}
        value={props.value}
        onInput={(e) => props.onChange(e.currentTarget.value)}
      />

      {props.value && (
        <button
          class="absolute right-2 p-0.5 text-spoosh-text-muted hover:text-spoosh-text bg-transparent border-none cursor-pointer"
          onClick={() => props.onChange("")}
          title="Clear search"
        >
          <svg
            class="w-3 h-3"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  );
};
