import type { PanelView, ThemeMode } from "../view-model";

export interface BottomBarContext {
  activeView: PanelView;
  theme: ThemeMode;
}

const VIEWS: PanelView[] = ["requests", "state", "import"];

const VIEW_LABELS: Record<PanelView, string> = {
  requests: "Requests",
  state: "State",
  import: "Import",
};

const sunIcon = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
  <circle cx="12" cy="12" r="5"/>
  <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
</svg>`;

const moonIcon = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
</svg>`;

export function renderBottomBar(ctx: BottomBarContext): string {
  const { activeView, theme } = ctx;

  const currentIndex = Math.max(0, VIEWS.indexOf(activeView));
  const prevView = VIEWS[(currentIndex - 1 + VIEWS.length) % VIEWS.length]!;
  const nextView = VIEWS[(currentIndex + 1) % VIEWS.length]!;

  const themeIcon = theme === "dark" ? sunIcon : moonIcon;
  const themeTitle =
    theme === "dark" ? "Switch to light mode" : "Switch to dark mode";
  const nextTheme = theme === "dark" ? "light" : "dark";

  return `
    <div class="spoosh-bottom-bar">
      <div class="spoosh-view-nav">
        <button class="spoosh-view-nav-btn" data-view="${prevView}" title="${VIEW_LABELS[prevView]}">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M19 12H5M12 19l-7-7 7-7"/>
          </svg>
        </button>
        <select class="spoosh-view-select" data-setting="view">
          <option value="requests" ${activeView === "requests" ? "selected" : ""}>${VIEW_LABELS.requests}</option>
          <option value="state" ${activeView === "state" ? "selected" : ""}>${VIEW_LABELS.state}</option>
          <option value="import" ${activeView === "import" ? "selected" : ""}>${VIEW_LABELS.import}</option>
        </select>
        <button class="spoosh-view-nav-btn" data-view="${nextView}" title="${VIEW_LABELS[nextView]}">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M5 12h14M12 5l7 7-7 7"/>
          </svg>
        </button>
      </div>
      <button class="spoosh-theme-toggle" data-theme="${nextTheme}" title="${themeTitle}">
        ${themeIcon}
      </button>
    </div>
  `;
}
