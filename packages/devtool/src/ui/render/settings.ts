import type { PositionMode, SidebarPosition, ThemeMode } from "../view-model";

export interface SettingsRenderContext {
  showPassedPlugins: boolean;
  theme: ThemeMode;
  position: PositionMode;
  sidebarPosition: SidebarPosition;
  maxHistory: number;
  autoSelectIncoming: boolean;
}

export function renderSettings(ctx: SettingsRenderContext): string {
  const {
    showPassedPlugins,
    theme,
    position,
    sidebarPosition,
    maxHistory,
    autoSelectIncoming,
  } = ctx;

  return `
    <div class="spoosh-detail-panel">
      <div class="spoosh-settings-header">
        <span class="spoosh-settings-title">Settings</span>
      </div>
      <div class="spoosh-settings-content">
        <div class="spoosh-settings-section">
          <div class="spoosh-settings-section-title">Appearance</div>
          <div class="spoosh-settings-row">
            <span class="spoosh-settings-label">Theme</span>
            <select class="spoosh-settings-select" data-setting="theme">
              <option value="dark" ${theme === "dark" ? "selected" : ""}>Dark</option>
              <option value="light" ${theme === "light" ? "selected" : ""}>Light</option>
            </select>
          </div>
          <div class="spoosh-settings-row">
            <span class="spoosh-settings-label">Button Position</span>
            <select class="spoosh-settings-select" data-setting="position">
              <option value="bottom-right" ${position === "bottom-right" ? "selected" : ""}>Bottom Right</option>
              <option value="bottom-left" ${position === "bottom-left" ? "selected" : ""}>Bottom Left</option>
              <option value="top-right" ${position === "top-right" ? "selected" : ""}>Top Right</option>
              <option value="top-left" ${position === "top-left" ? "selected" : ""}>Top Left</option>
            </select>
          </div>
          <div class="spoosh-settings-row">
            <span class="spoosh-settings-label">Sidebar Position</span>
            <select class="spoosh-settings-select" data-setting="sidebarPosition">
              <option value="right" ${sidebarPosition === "right" ? "selected" : ""}>Right</option>
              <option value="left" ${sidebarPosition === "left" ? "selected" : ""}>Left</option>
              <option value="bottom" ${sidebarPosition === "bottom" ? "selected" : ""}>Bottom</option>
            </select>
          </div>
        </div>
        <div class="spoosh-settings-section">
          <div class="spoosh-settings-section-title">Display</div>
          <label class="spoosh-settings-toggle">
            <input type="checkbox" data-setting="showPassedPlugins" ${showPassedPlugins ? "checked" : ""} />
            <span class="spoosh-toggle-slider"></span>
            <span class="spoosh-settings-label">Show passed plugins in timeline</span>
          </label>

          <label class="spoosh-settings-toggle">
            <input type="checkbox" data-setting="autoSelectIncoming" ${autoSelectIncoming ? "checked" : ""} />
            <span class="spoosh-toggle-slider"></span>
            <span class="spoosh-settings-label">Auto-follow new requests</span>
          </label>
        </div>
        <div class="spoosh-settings-section">
          <div class="spoosh-settings-section-title">History</div>
          <div class="spoosh-settings-row">
            <span class="spoosh-settings-label">Max requests to keep</span>
            <select class="spoosh-settings-select" data-setting="maxHistory">
              <option value="25" ${maxHistory === 25 ? "selected" : ""}>25</option>
              <option value="50" ${maxHistory === 50 ? "selected" : ""}>50</option>
              <option value="100" ${maxHistory === 100 ? "selected" : ""}>100</option>
              <option value="200" ${maxHistory === 200 ? "selected" : ""}>200</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  `;
}
