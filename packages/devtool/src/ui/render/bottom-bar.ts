import type { PanelView, SidebarPosition, ThemeMode } from "../view-model";

export interface BottomBarContext {
  activeView: PanelView;
  sidebarPosition: SidebarPosition;
  theme: ThemeMode;
}

const sunIcon = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
  <circle cx="12" cy="12" r="5"/>
  <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
</svg>`;

const moonIcon = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
</svg>`;

export function renderBottomBar(ctx: BottomBarContext): string {
  const { activeView, sidebarPosition, theme } = ctx;

  const leftArrowActive = sidebarPosition === "left" ? "active" : "";
  const rightArrowActive = sidebarPosition === "right" ? "active" : "";
  const themeIcon = theme === "dark" ? sunIcon : moonIcon;
  const themeTitle =
    theme === "dark" ? "Switch to light mode" : "Switch to dark mode";
  const nextTheme = theme === "dark" ? "light" : "dark";

  return `
    <div class="spoosh-bottom-bar">
      <div class="spoosh-sidebar-position-btns">
        <button class="spoosh-sidebar-pos-btn ${leftArrowActive}" data-sidebar-position="left" title="Move sidebar to left">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M19 12H5M12 19l-7-7 7-7"/>
          </svg>
        </button>
        <button class="spoosh-sidebar-pos-btn ${rightArrowActive}" data-sidebar-position="right" title="Move sidebar to right">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M5 12h14M12 5l7 7-7 7"/>
          </svg>
        </button>
      </div>
      <div class="spoosh-bottom-bar-right">
        <select class="spoosh-view-select" data-setting="view">
          <option value="requests" ${activeView === "requests" ? "selected" : ""}>Requests</option>
          <option value="cache" ${activeView === "cache" ? "selected" : ""}>Cache</option>
        </select>
        <button class="spoosh-theme-toggle" data-theme="${nextTheme}" title="${themeTitle}">
          ${themeIcon}
        </button>
      </div>
    </div>
  `;
}
