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
    <input
      type="text"
      class="flex-1 bg-transparent border-none text-[11px] font-inherit text-spoosh-text placeholder:text-spoosh-text-muted placeholder:opacity-60 outline-none"
      placeholder={props.placeholder ?? "Search..."}
      value={props.value}
      onInput={(e) => props.onChange(e.currentTarget.value)}
    />
  );
};
