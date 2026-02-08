import type { DevToolTheme } from "../../types";

export const darkTheme: DevToolTheme = {
  colors: {
    background: "#0d1117",
    surface: "#161b22",
    text: "#e6edf3",
    textMuted: "#8b949e",
    border: "#30363d",
    primary: "#58a6ff",
    success: "#3fb950",
    warning: "#d29922",
    error: "#f85149",
  },
  fonts: {
    mono: 'ui-monospace, "SF Mono", Menlo, Consolas, monospace',
  },
};

export const lightTheme: DevToolTheme = {
  colors: {
    background: "#ffffff",
    surface: "#f6f8fa",
    text: "#1f2328",
    textMuted: "#656d76",
    border: "#d0d7de",
    primary: "#0969da",
    success: "#1a7f37",
    warning: "#9a6700",
    error: "#cf222e",
  },
  fonts: {
    mono: 'ui-monospace, "SF Mono", Menlo, Consolas, monospace',
  },
};

export function resolveTheme(
  theme: "light" | "dark" | DevToolTheme
): DevToolTheme {
  if (theme === "light") return lightTheme;
  if (theme === "dark") return darkTheme;
  return theme;
}

export function getThemeCSS(theme: DevToolTheme): string {
  return `
    :root {
      --spoosh-bg: ${theme.colors.background};
      --spoosh-surface: ${theme.colors.surface};
      --spoosh-text: ${theme.colors.text};
      --spoosh-text-muted: ${theme.colors.textMuted};
      --spoosh-border: ${theme.colors.border};
      --spoosh-primary: ${theme.colors.primary};
      --spoosh-success: ${theme.colors.success};
      --spoosh-warning: ${theme.colors.warning};
      --spoosh-error: ${theme.colors.error};
      --spoosh-font: ${theme.fonts.mono};
    }

    #spoosh-devtool-fab {
      position: fixed;
      width: 48px;
      height: 48px;
      border-radius: 50%;
      background: linear-gradient(135deg, ${theme.colors.primary}, ${theme.colors.success});
      border: none;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 22px;
      box-shadow: 0 4px 14px rgba(0, 0, 0, 0.25);
      z-index: 999998;
      transition: transform 0.2s, box-shadow 0.2s;
    }

    #spoosh-devtool-fab:hover {
      transform: scale(1.08);
      box-shadow: 0 6px 20px rgba(0, 0, 0, 0.3);
    }

    #spoosh-devtool-fab.bottom-right { bottom: 20px; right: 20px; }
    #spoosh-devtool-fab.bottom-left { bottom: 20px; left: 20px; }
    #spoosh-devtool-fab.top-right { top: 20px; right: 20px; }
    #spoosh-devtool-fab.top-left { top: 20px; left: 20px; }

    #spoosh-devtool-fab .badge {
      position: absolute;
      top: -4px;
      right: -4px;
      background: ${theme.colors.error};
      color: white;
      font-size: 10px;
      font-weight: 600;
      min-width: 18px;
      height: 18px;
      border-radius: 9px;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 0 5px;
      font-family: ${theme.fonts.mono};
    }

    #spoosh-devtool-sidebar {
      position: fixed;
      top: 0;
      right: 0;
      width: 700px;
      height: 100vh;
      background: var(--spoosh-bg);
      border-left: 1px solid var(--spoosh-border);
      z-index: 999999;
      font-family: var(--spoosh-font);
      font-size: 13px;
      color: var(--spoosh-text);
      transform: translateX(100%);
      transition: transform 0.25s ease;
      box-shadow: -4px 0 24px rgba(0, 0, 0, 0.15);
    }

    #spoosh-devtool-sidebar.open {
      transform: translateX(0);
    }

    .spoosh-resize-handle {
      position: absolute;
      left: 0;
      top: 0;
      width: 3px;
      height: 100%;
      cursor: ew-resize;
      background: transparent;
      transition: background 0.15s;
      z-index: 10;
    }

    .spoosh-resize-handle:hover {
      background: var(--spoosh-primary);
    }

    .spoosh-divider-handle {
      width: 3px;
      cursor: col-resize;
      background: var(--spoosh-border);
      transition: background 0.15s;
      flex-shrink: 0;
    }

    .spoosh-divider-handle:hover {
      background: var(--spoosh-primary);
    }

    .spoosh-panel {
      display: flex;
      height: 100%;
    }

    .spoosh-list-panel {
      width: 280px;
      min-width: 280px;
      display: flex;
      flex-direction: column;
      background: var(--spoosh-surface);
    }

    .spoosh-detail-panel {
      flex: 1;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }

    .spoosh-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 12px 14px;
      border-bottom: 1px solid var(--spoosh-border);
    }

    .spoosh-title {
      display: flex;
      align-items: center;
      gap: 8px;
      font-weight: 600;
      font-size: 14px;
    }

    .spoosh-logo {
      font-size: 16px;
    }

    .spoosh-actions {
      display: flex;
      gap: 4px;
    }

    .spoosh-icon-btn {
      background: transparent;
      border: none;
      color: var(--spoosh-text-muted);
      cursor: pointer;
      padding: 6px;
      border-radius: 6px;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: background 0.15s, color 0.15s;
    }

    .spoosh-icon-btn:hover {
      background: var(--spoosh-border);
      color: var(--spoosh-text);
    }

    .spoosh-filters {
      display: flex;
      gap: 6px;
      padding: 10px 14px;
      border-bottom: 1px solid var(--spoosh-border);
    }

    .spoosh-filter {
      padding: 5px 12px;
      border: 1px solid var(--spoosh-border);
      border-radius: 6px;
      background: transparent;
      color: var(--spoosh-text-muted);
      cursor: pointer;
      font-size: 12px;
      font-family: inherit;
      transition: all 0.15s;
    }

    .spoosh-filter:hover {
      border-color: var(--spoosh-text-muted);
    }

    .spoosh-filter.active {
      background: var(--spoosh-primary);
      border-color: var(--spoosh-primary);
      color: white;
    }

    .spoosh-traces {
      flex: 1;
      overflow-y: auto;
    }

    .spoosh-trace {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 10px 14px;
      cursor: pointer;
      border-bottom: 1px solid var(--spoosh-border);
      transition: background 0.15s;
    }

    .spoosh-trace:hover {
      background: var(--spoosh-bg);
    }

    .spoosh-trace.selected {
      background: var(--spoosh-bg);
      border-left: 3px solid var(--spoosh-primary);
      padding-left: 11px;
    }

    .spoosh-trace-status {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      flex-shrink: 0;
    }

    .spoosh-trace-status.success { background: var(--spoosh-success); }
    .spoosh-trace-status.error { background: var(--spoosh-error); }
    .spoosh-trace-status.pending {
      background: var(--spoosh-primary);
      animation: spoosh-pulse 1.5s ease-in-out infinite;
    }

    @keyframes spoosh-pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.4; }
    }

    .spoosh-trace-info {
      flex: 1;
      min-width: 0;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .spoosh-trace-method {
      font-weight: 600;
      font-size: 11px;
    }

    .method-GET { color: var(--spoosh-success); }
    .method-POST { color: var(--spoosh-primary); }
    .method-PUT, .method-PATCH { color: var(--spoosh-warning); }
    .method-DELETE { color: var(--spoosh-error); }

    .spoosh-trace-path {
      color: var(--spoosh-text-muted);
      font-size: 12px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .spoosh-trace-query {
      color: var(--spoosh-primary);
      font-size: 11px;
      opacity: 0.8;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      max-width: 120px;
    }

    .spoosh-trace-time {
      color: var(--spoosh-text-muted);
      font-size: 11px;
      flex-shrink: 0;
    }

    .spoosh-empty {
      padding: 40px 20px;
      text-align: center;
      color: var(--spoosh-text-muted);
      font-size: 13px;
    }

    .spoosh-detail-empty {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 12px;
      color: var(--spoosh-text-muted);
    }

    .spoosh-detail-empty-icon {
      font-size: 40px;
      opacity: 0.5;
    }

    .spoosh-detail-header {
      padding: 16px;
      border-bottom: 1px solid var(--spoosh-border);
      background: var(--spoosh-surface);
    }

    .spoosh-detail-title {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 10px;
    }

    .spoosh-detail-path {
      font-size: 14px;
      word-break: break-all;
    }

    .spoosh-detail-meta {
      display: flex;
      gap: 8px;
    }

    .spoosh-badge {
      padding: 3px 8px;
      border-radius: 4px;
      font-size: 11px;
      font-weight: 500;
    }

    .spoosh-badge.success {
      background: rgba(63, 185, 80, 0.15);
      color: var(--spoosh-success);
    }

    .spoosh-badge.error {
      background: rgba(248, 81, 73, 0.15);
      color: var(--spoosh-error);
    }

    .spoosh-badge.neutral {
      background: var(--spoosh-border);
      color: var(--spoosh-text-muted);
    }

    .spoosh-badge.pending {
      background: rgba(88, 166, 255, 0.15);
      color: var(--spoosh-primary);
    }

    .spoosh-tabs {
      display: flex;
      border-bottom: 1px solid var(--spoosh-border);
      background: var(--spoosh-surface);
    }

    .spoosh-tab {
      padding: 10px 16px;
      background: transparent;
      border: none;
      border-bottom: 2px solid transparent;
      color: var(--spoosh-text-muted);
      cursor: pointer;
      font-size: 13px;
      font-family: inherit;
      transition: color 0.15s, border-color 0.15s;
    }

    .spoosh-tab:hover {
      color: var(--spoosh-text);
    }

    .spoosh-tab.active {
      color: var(--spoosh-primary);
      border-bottom-color: var(--spoosh-primary);
    }

    .spoosh-tab-content {
      flex: 1;
      overflow-y: auto;
      padding: 16px;
    }

    .spoosh-empty-tab {
      color: var(--spoosh-text-muted);
      text-align: center;
      padding: 40px;
    }

    .spoosh-pending-tab {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 12px;
    }

    .spoosh-spinner {
      width: 24px;
      height: 24px;
      border: 2px solid var(--spoosh-border);
      border-top-color: var(--spoosh-primary);
      border-radius: 50%;
      animation: spoosh-spin 0.8s linear infinite;
    }

    @keyframes spoosh-spin {
      to { transform: rotate(360deg); }
    }

    .spoosh-data-section {
      margin-bottom: 16px;
    }

    .spoosh-data-section:last-child {
      margin-bottom: 0;
    }

    .spoosh-data-label {
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      color: var(--spoosh-text-muted);
      margin-bottom: 8px;
      letter-spacing: 0.5px;
    }

    .spoosh-json {
      background: var(--spoosh-surface);
      border: 1px solid var(--spoosh-border);
      border-radius: 8px;
      padding: 12px;
      margin: 0;
      font-size: 12px;
      line-height: 1.5;
      overflow-x: auto;
      white-space: pre-wrap;
      word-break: break-word;
    }

    .spoosh-json.error {
      border-color: var(--spoosh-error);
      background: rgba(248, 81, 73, 0.05);
    }

    .spoosh-plugins-header {
      display: flex;
      justify-content: flex-end;
      margin-bottom: 12px;
    }

    .spoosh-toggle-passed {
      background: transparent;
      border: 1px solid var(--spoosh-border);
      color: var(--spoosh-text-muted);
      padding: 4px 10px;
      border-radius: 4px;
      font-size: 11px;
      cursor: pointer;
      font-family: inherit;
      transition: all 0.15s;
    }

    .spoosh-toggle-passed:hover {
      border-color: var(--spoosh-text-muted);
      color: var(--spoosh-text);
    }

    .spoosh-plugins-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .spoosh-plugin-item {
      background: var(--spoosh-surface);
      border: 1px solid var(--spoosh-border);
      border-radius: 8px;
      overflow: hidden;
    }

    .spoosh-plugin-item.passed {
      opacity: 0.4;
    }

    .spoosh-plugin-item.passed .spoosh-plugin-header {
      cursor: default;
    }

    .spoosh-plugin-item.passed .spoosh-plugin-header:hover {
      background: transparent;
    }

    .spoosh-plugin-header {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 10px 12px;
      cursor: pointer;
      transition: background 0.15s;
    }

    .spoosh-plugin-header:hover {
      background: var(--spoosh-bg);
    }

    .spoosh-plugin-status {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      flex-shrink: 0;
    }

    .spoosh-plugin-info {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .spoosh-plugin-name {
      font-weight: 500;
    }

    .spoosh-plugin-stage {
      font-size: 11px;
      padding: 2px 6px;
      border-radius: 4px;
      background: var(--spoosh-border);
      color: var(--spoosh-text-muted);
    }

    .spoosh-plugin-reason {
      flex: 1;
      color: var(--spoosh-text-muted);
      font-size: 12px;
      text-align: right;
    }

    .spoosh-plugin-expand {
      color: var(--spoosh-text-muted);
      font-size: 10px;
    }

    .spoosh-plugin-diff {
      padding: 12px;
      border-top: 1px solid var(--spoosh-border);
      background: var(--spoosh-bg);
    }

    .spoosh-diff-block {
      margin-bottom: 12px;
    }

    .spoosh-diff-block:last-child {
      margin-bottom: 0;
    }

    .spoosh-diff-label {
      font-size: 11px;
      font-weight: 600;
      margin-bottom: 6px;
      padding: 2px 6px;
      border-radius: 3px;
      display: inline-block;
    }

    .spoosh-diff-label.removed {
      background: rgba(248, 81, 73, 0.15);
      color: var(--spoosh-error);
    }

    .spoosh-diff-label.added {
      background: rgba(63, 185, 80, 0.15);
      color: var(--spoosh-success);
    }

    .spoosh-diff-json {
      background: var(--spoosh-surface);
      border: 1px solid var(--spoosh-border);
      border-radius: 6px;
      padding: 10px;
      margin: 0;
      font-size: 11px;
      line-height: 1.4;
      overflow-x: auto;
      white-space: pre-wrap;
      word-break: break-word;
      max-height: 150px;
      overflow-y: auto;
    }

    .spoosh-syn-key {
      color: ${theme.colors.primary};
    }

    .spoosh-syn-str {
      color: ${theme.colors.success};
    }

    .spoosh-syn-num {
      color: ${theme.colors.warning};
    }

    .spoosh-syn-bool {
      color: ${theme.colors.error};
    }

    .spoosh-syn-null {
      color: var(--spoosh-text-muted);
    }

    .spoosh-diff-header {
      display: flex;
      justify-content: flex-end;
      margin-bottom: 8px;
    }

    .spoosh-diff-toggle {
      background: transparent;
      border: 1px solid var(--spoosh-border);
      color: var(--spoosh-text-muted);
      padding: 3px 8px;
      border-radius: 4px;
      font-size: 10px;
      cursor: pointer;
      font-family: inherit;
      transition: all 0.15s;
    }

    .spoosh-diff-toggle:hover {
      border-color: var(--spoosh-text-muted);
      color: var(--spoosh-text);
    }

    .spoosh-diff-lines {
      background: var(--spoosh-surface);
      border: 1px solid var(--spoosh-border);
      border-radius: 6px;
      padding: 8px 0;
      margin: 0;
      font-size: 11px;
      line-height: 1.5;
      white-space: pre-wrap;
      word-break: break-word;
    }

    .spoosh-diff-line-added {
      background: rgba(63, 185, 80, 0.15);
      color: ${theme.colors.success};
      padding: 0 10px;
    }

    .spoosh-diff-line-removed {
      background: rgba(248, 81, 73, 0.15);
      color: ${theme.colors.error};
      padding: 0 10px;
    }

    .spoosh-diff-line-unchanged {
      color: var(--spoosh-text-muted);
      padding: 0 10px;
    }

    .spoosh-diff-prefix {
      display: inline-block;
      width: 16px;
      user-select: none;
    }
  `;
}
