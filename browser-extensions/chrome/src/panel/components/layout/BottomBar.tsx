import type { Component } from "solid-js";
import type { PanelView } from "@devtool/types";
import type { ThemeMode } from "../../types";

interface BottomBarProps {
  activeView: PanelView;
  theme: ThemeMode | undefined;
  onViewChange: (view: PanelView) => void;
  onThemeChange: (theme: ThemeMode) => void;
}

export const BottomBar: Component<BottomBarProps> = (props) => {
  const views: Array<{ id: PanelView; label: string; shortcut: string }> = [
    { id: "requests", label: "Requests", shortcut: "1" },
    { id: "state", label: "State", shortcut: "2" },
    { id: "import", label: "Import", shortcut: "3" },
  ];

  const toggleTheme = () => {
    const newTheme = props.theme === "light" ? "dark" : "light";
    props.onThemeChange(newTheme);
  };

  return (
    <div class="flex items-center justify-between px-2 py-1 bg-spoosh-surface border-t border-spoosh-border">
      <div class="flex items-center gap-1">
        {views.map((view) => (
          <button
            class={`px-3 py-1 text-xs font-medium rounded transition-colors ${
              props.activeView === view.id
                ? "bg-spoosh-primary/20 text-spoosh-primary"
                : "text-spoosh-text-muted hover:text-spoosh-text hover:bg-spoosh-bg"
            }`}
            onClick={() => props.onViewChange(view.id)}
            title={`${view.label} (${view.shortcut})`}
          >
            {view.label}
          </button>
        ))}
      </div>

      <button
        class="p-1.5 text-spoosh-text-muted hover:text-spoosh-text rounded transition-colors hover:bg-spoosh-bg"
        onClick={toggleTheme}
        title={`Switch to ${props.theme === "light" ? "dark" : "light"} theme`}
      >
        {props.theme === "light" ? <MoonIcon /> : <SunIcon />}
      </button>
    </div>
  );
};

const SunIcon: Component = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    class="w-4 h-4"
    viewBox="0 0 20 20"
    fill="currentColor"
  >
    <path
      fill-rule="evenodd"
      d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z"
      clip-rule="evenodd"
    />
  </svg>
);

const MoonIcon: Component = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    class="w-4 h-4"
    viewBox="0 0 20 20"
    fill="currentColor"
  >
    <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
  </svg>
);
