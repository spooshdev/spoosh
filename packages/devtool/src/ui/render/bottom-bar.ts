import type { PanelView, SidebarPosition } from "../view-model";

export interface BottomBarContext {
  activeView: PanelView;
  sidebarPosition: SidebarPosition;
}

export function renderBottomBar(ctx: BottomBarContext): string {
  const { activeView, sidebarPosition } = ctx;

  const leftArrowActive = sidebarPosition === "left" ? "active" : "";
  const rightArrowActive = sidebarPosition === "right" ? "active" : "";

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
      <select class="spoosh-view-select" data-setting="view">
        <option value="requests" ${activeView === "requests" ? "selected" : ""}>Requests</option>
        <option value="cache" ${activeView === "cache" ? "selected" : ""}>Cache</option>
      </select>
    </div>
  `;
}
