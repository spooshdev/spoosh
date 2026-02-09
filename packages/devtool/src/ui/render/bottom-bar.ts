import type { PanelView } from "../view-model";

export interface BottomBarContext {
  activeView: PanelView;
}

export function renderBottomBar(ctx: BottomBarContext): string {
  const { activeView } = ctx;

  return `
    <div class="spoosh-bottom-bar">
      <select class="spoosh-view-select" data-setting="view">
        <option value="requests" ${activeView === "requests" ? "selected" : ""}>Requests</option>
        <option value="internal" ${activeView === "internal" ? "selected" : ""}>Internal</option>
      </select>
    </div>
  `;
}
