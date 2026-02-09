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
    :host {
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
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background: ${theme.colors.surface};
      border: 1px solid ${theme.colors.border};
      color: ${theme.colors.text};
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
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
      top: -6px;
      right: -6px;
      background: ${theme.colors.error};
      color: white;
      font-size: 9px;
      font-weight: 600;
      min-width: 16px;
      height: 16px;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 0 4px;
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
      font-size: 12px;
      color: var(--spoosh-text);
      transform: translateX(100%);
      transition: transform 0.25s ease;
      box-shadow: -4px 0 24px rgba(0, 0, 0, 0.15);
    }

    #spoosh-devtool-sidebar ::-webkit-scrollbar {
      width: 6px;
      height: 6px;
    }

    #spoosh-devtool-sidebar ::-webkit-scrollbar-track {
      background: transparent;
    }

    #spoosh-devtool-sidebar ::-webkit-scrollbar-thumb {
      background: var(--spoosh-border);
      border-radius: 3px;
    }

    #spoosh-devtool-sidebar ::-webkit-scrollbar-thumb:hover {
      background: var(--spoosh-text-muted);
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
      padding: 8px 10px;
      border-bottom: 1px solid var(--spoosh-border);
    }

    .spoosh-title {
      display: flex;
      align-items: center;
      gap: 6px;
      font-weight: 600;
      font-size: 12px;
    }

    .spoosh-logo {
      display: flex;
      align-items: center;
      color: var(--spoosh-text);
    }

    .spoosh-actions {
      display: flex;
      gap: 2px;
    }

    .spoosh-icon-btn {
      background: transparent;
      border: none;
      color: var(--spoosh-text-muted);
      cursor: pointer;
      padding: 4px;
      border-radius: 4px;
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
      gap: 4px;
      padding: 6px 10px;
      border-bottom: 1px solid var(--spoosh-border);
    }

    .spoosh-filter {
      padding: 3px 8px;
      border: 1px solid var(--spoosh-border);
      border-radius: 4px;
      background: transparent;
      color: var(--spoosh-text-muted);
      cursor: pointer;
      font-size: 11px;
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

    .spoosh-list-content {
      flex: 1;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }

    .spoosh-requests-section,
    .spoosh-events-section {
      display: flex;
      flex-direction: column;
      overflow: hidden;
      min-height: 60px;
    }

    .spoosh-section-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 4px 10px;
      background: var(--spoosh-bg);
      border-bottom: 1px solid var(--spoosh-border);
      flex-shrink: 0;
    }

    .spoosh-section-title {
      font-size: 10px;
      font-weight: 600;
      text-transform: uppercase;
      color: var(--spoosh-text-muted);
      letter-spacing: 0.5px;
    }

    .spoosh-section-count {
      font-size: 9px;
      padding: 1px 5px;
      border-radius: 8px;
      background: var(--spoosh-border);
      color: var(--spoosh-text-muted);
    }

    .spoosh-horizontal-divider {
      height: 3px;
      cursor: row-resize;
      background: var(--spoosh-border);
      transition: background 0.15s;
      flex-shrink: 0;
    }

    .spoosh-horizontal-divider:hover {
      background: var(--spoosh-primary);
    }

    .spoosh-traces {
      flex: 1;
      overflow-y: auto;
    }

    .spoosh-trace {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 6px 10px;
      cursor: pointer;
      border-bottom: 1px solid var(--spoosh-border);
      transition: background 0.15s;
    }

    .spoosh-trace:hover {
      background: var(--spoosh-bg);
    }

    .spoosh-trace.selected {
      background: var(--spoosh-bg);
      border-left: 2px solid var(--spoosh-primary);
      padding-left: 8px;
    }

    .spoosh-trace-status {
      width: 6px;
      height: 6px;
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
      gap: 6px;
    }

    .spoosh-trace-method {
      font-weight: 600;
      font-size: 10px;
    }

    .method-GET { color: var(--spoosh-success); }
    .method-POST { color: var(--spoosh-primary); }
    .method-PUT, .method-PATCH { color: var(--spoosh-warning); }
    .method-DELETE { color: var(--spoosh-error); }

    .spoosh-trace-path {
      color: var(--spoosh-text-muted);
      font-size: 11px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .spoosh-trace-query {
      color: var(--spoosh-primary);
      font-size: 10px;
      opacity: 0.8;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      max-width: 100px;
    }

    .spoosh-trace-time {
      color: var(--spoosh-text-muted);
      font-size: 10px;
      flex-shrink: 0;
    }

    /* Events list */
    .spoosh-events {
      flex: 1;
      overflow-y: auto;
    }

    .spoosh-event {
      display: flex;
      align-items: flex-start;
      gap: 6px;
      padding: 5px 10px;
      border-bottom: 1px solid var(--spoosh-border);
    }

    .spoosh-event-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      flex-shrink: 0;
      margin-top: 3px;
    }

    .spoosh-event-info {
      flex: 1;
      min-width: 0;
      display: flex;
      flex-direction: column;
      gap: 1px;
    }

    .spoosh-event-plugin {
      font-weight: 600;
      font-size: 10px;
      color: var(--spoosh-text);
    }

    .spoosh-event-message {
      font-size: 10px;
      color: var(--spoosh-text-muted);
    }

    .spoosh-event-query {
      font-size: 9px;
      color: var(--spoosh-text-muted);
      opacity: 0.7;
    }

    .spoosh-event-time {
      color: var(--spoosh-text-muted);
      font-size: 9px;
      flex-shrink: 0;
    }

    .spoosh-detail-empty-hint {
      color: var(--spoosh-text-muted);
      font-size: 12px;
      margin-top: 4px;
      opacity: 0.7;
    }

    .spoosh-empty {
      padding: 20px 14px;
      text-align: center;
      color: var(--spoosh-text-muted);
      font-size: 11px;
    }

    .spoosh-detail-empty {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 8px;
      color: var(--spoosh-text-muted);
    }

    .spoosh-detail-empty-icon {
      font-size: 32px;
      opacity: 0.5;
    }

    .spoosh-detail-header {
      padding: 10px 12px;
      border-bottom: 1px solid var(--spoosh-border);
      background: var(--spoosh-surface);
    }

    .spoosh-detail-title {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 6px;
    }

    .spoosh-detail-path {
      font-size: 12px;
      word-break: break-all;
    }

    .spoosh-detail-meta {
      display: flex;
      gap: 6px;
    }

    .spoosh-badge {
      padding: 2px 6px;
      border-radius: 3px;
      font-size: 10px;
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
      padding: 6px 12px;
      background: transparent;
      border: none;
      border-bottom: 2px solid transparent;
      color: var(--spoosh-text-muted);
      cursor: pointer;
      font-size: 11px;
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
      padding: 10px 12px;
    }

    .spoosh-empty-tab {
      color: var(--spoosh-text-muted);
      text-align: center;
      padding: 20px;
      font-size: 11px;
    }

    .spoosh-pending-tab {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
    }

    .spoosh-spinner {
      width: 20px;
      height: 20px;
      border: 2px solid var(--spoosh-border);
      border-top-color: var(--spoosh-primary);
      border-radius: 50%;
      animation: spoosh-spin 0.8s linear infinite;
    }

    @keyframes spoosh-spin {
      to { transform: rotate(360deg); }
    }

    .spoosh-data-section {
      margin-bottom: 10px;
    }

    .spoosh-data-section:last-child {
      margin-bottom: 0;
    }

    .spoosh-data-label {
      font-size: 10px;
      font-weight: 600;
      text-transform: uppercase;
      color: var(--spoosh-text-muted);
      margin-bottom: 4px;
      letter-spacing: 0.5px;
    }

    .spoosh-json {
      background: var(--spoosh-surface);
      border: 1px solid var(--spoosh-border);
      border-radius: 4px;
      padding: 8px;
      margin: 0;
      font-size: 11px;
      line-height: 1.4;
      overflow-x: auto;
      white-space: pre-wrap;
      word-break: break-word;
    }

    .spoosh-json.error {
      border-color: var(--spoosh-error);
      background: rgba(248, 81, 73, 0.05);
    }

    .spoosh-body-type {
      font-weight: 500;
      font-size: 9px;
      padding: 1px 4px;
      border-radius: 3px;
      margin-left: 6px;
      text-transform: lowercase;
    }

    .spoosh-body-type.json {
      color: var(--spoosh-text-muted);
      background: var(--spoosh-surface);
    }

    .spoosh-body-type.form {
      color: var(--spoosh-success);
      background: rgba(63, 185, 80, 0.15);
    }

    .spoosh-body-type.urlencoded {
      color: var(--spoosh-warning);
      background: rgba(210, 153, 34, 0.15);
    }

    .spoosh-plugins-header {
      display: flex;
      justify-content: flex-end;
      margin-bottom: 8px;
    }

    .spoosh-toggle-passed {
      background: transparent;
      border: 1px solid var(--spoosh-border);
      color: var(--spoosh-text-muted);
      padding: 2px 6px;
      border-radius: 3px;
      font-size: 10px;
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
      gap: 4px;
    }

    .spoosh-timeline {
      display: flex;
      flex-direction: column;
    }

    .spoosh-timeline-step {
      border-bottom: 1px solid var(--spoosh-border);
    }

    .spoosh-timeline-step.skipped {
      opacity: 0.5;
    }

    .spoosh-timeline-step-header {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 6px 0;
      cursor: pointer;
    }

    .spoosh-timeline-step-header:hover {
      background: var(--spoosh-surface);
    }

    .spoosh-timeline-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      flex-shrink: 0;
    }

    .spoosh-timeline-plugin {
      font-weight: 500;
      font-size: 11px;
    }

    .spoosh-timeline-stage {
      font-size: 9px;
      padding: 1px 4px;
      border-radius: 3px;
      background: var(--spoosh-border);
      color: var(--spoosh-text-muted);
    }

    .spoosh-timeline-reason {
      flex: 1;
      color: var(--spoosh-text-muted);
      font-size: 10px;
      text-align: right;
    }

    .spoosh-timeline-group {
      border-bottom: 1px solid var(--spoosh-border);
    }

    .spoosh-timeline-group-header {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 6px 0;
      cursor: pointer;
    }

    .spoosh-timeline-group-header:hover {
      background: var(--spoosh-surface);
    }

    .spoosh-timeline-group-count {
      font-size: 9px;
      padding: 1px 6px;
      border-radius: 3px;
      background: var(--spoosh-primary);
      color: var(--spoosh-bg);
      font-weight: 600;
    }

    .spoosh-timeline-group-items {
      padding-left: 12px;
      border-left: 2px solid var(--spoosh-border);
      margin-left: 2px;
    }

    .spoosh-timeline-group-items .spoosh-timeline-step {
      border-bottom: none;
    }

    .spoosh-timeline-group-items .spoosh-timeline-step-header {
      padding: 4px 0;
    }

    .spoosh-timeline-fetch {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 0;
    }

    .spoosh-fetch-line {
      flex: 1;
      height: 1px;
      background: var(--spoosh-warning);
      opacity: 0.5;
    }

    .spoosh-fetch-label {
      font-size: 9px;
      font-weight: 600;
      color: var(--spoosh-warning);
      padding: 2px 8px;
      border: 1px solid var(--spoosh-warning);
      border-radius: 10px;
      background: rgba(210, 153, 34, 0.1);
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

    .spoosh-plugin-count {
      font-size: 10px;
      padding: 1px 6px;
      border-radius: 10px;
      background: var(--spoosh-primary);
      color: white;
      font-weight: 600;
    }

    .spoosh-plugin-details {
      border-top: 1px solid var(--spoosh-border);
      background: var(--spoosh-bg);
    }

    .spoosh-step-detail {
      border-bottom: 1px solid var(--spoosh-border);
    }

    .spoosh-step-detail:last-child {
      border-bottom: none;
    }

    .spoosh-step-detail-header {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 12px;
      cursor: pointer;
      font-size: 12px;
    }

    .spoosh-step-detail-header:hover {
      background: var(--spoosh-surface);
    }

    .spoosh-step-index {
      font-size: 10px;
      color: var(--spoosh-text-muted);
      min-width: 16px;
    }

    .spoosh-step-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      flex-shrink: 0;
    }

    .spoosh-step-stage {
      font-size: 11px;
      padding: 1px 5px;
      border-radius: 3px;
      background: var(--spoosh-border);
      color: var(--spoosh-text-muted);
    }

    .spoosh-step-reason {
      flex: 1;
      color: var(--spoosh-text-muted);
      font-size: 11px;
    }

    .spoosh-plugin-diff {
      padding: 8px;
      border-top: 1px solid var(--spoosh-border);
      background: var(--spoosh-bg);
    }

    .spoosh-diff-block {
      margin-bottom: 8px;
    }

    .spoosh-diff-block:last-child {
      margin-bottom: 0;
    }

    .spoosh-diff-label {
      font-size: 9px;
      font-weight: 600;
      margin-bottom: 4px;
      padding: 1px 4px;
      border-radius: 2px;
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
      border-radius: 4px;
      padding: 6px;
      margin: 0;
      font-size: 10px;
      line-height: 1.3;
      overflow-x: auto;
      white-space: pre-wrap;
      word-break: break-word;
      max-height: 120px;
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
      margin-bottom: 4px;
    }

    .spoosh-diff-toggle {
      background: transparent;
      border: 1px solid var(--spoosh-border);
      color: var(--spoosh-text-muted);
      padding: 2px 6px;
      border-radius: 3px;
      font-size: 9px;
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
      border-radius: 4px;
      padding: 4px 0;
      margin: 0;
      font-size: 10px;
      line-height: 1.4;
      white-space: pre-wrap;
      word-break: break-word;
    }

    .spoosh-diff-line-added {
      background: rgba(63, 185, 80, 0.15);
      color: ${theme.colors.success};
      padding: 0 6px;
    }

    .spoosh-diff-line-removed {
      background: rgba(248, 81, 73, 0.15);
      color: ${theme.colors.error};
      padding: 0 6px;
    }

    .spoosh-diff-line-unchanged {
      color: var(--spoosh-text-muted);
      padding: 0 6px;
    }

    .spoosh-diff-prefix {
      display: inline-block;
      width: 12px;
      user-select: none;
    }

    .spoosh-icon-btn.active {
      background: var(--spoosh-primary);
      color: white;
    }

    .spoosh-icon-btn.active:hover {
      background: var(--spoosh-primary);
      color: white;
    }

    .spoosh-settings-header {
      padding: 12px 16px;
      border-bottom: 1px solid var(--spoosh-border);
      background: var(--spoosh-surface);
    }

    .spoosh-settings-title {
      font-weight: 600;
      font-size: 13px;
    }

    .spoosh-settings-content {
      padding: 16px;
    }

    .spoosh-settings-section {
      margin-bottom: 20px;
    }

    .spoosh-settings-section:last-child {
      margin-bottom: 0;
    }

    .spoosh-settings-section-title {
      font-size: 10px;
      font-weight: 600;
      text-transform: uppercase;
      color: var(--spoosh-text-muted);
      margin-bottom: 12px;
      letter-spacing: 0.5px;
    }

    .spoosh-settings-toggle {
      display: flex;
      align-items: center;
      gap: 10px;
      cursor: pointer;
      padding: 8px 0;
    }

    .spoosh-settings-toggle input {
      display: none;
    }

    .spoosh-toggle-slider {
      position: relative;
      width: 36px;
      height: 20px;
      background: var(--spoosh-border);
      border-radius: 10px;
      flex-shrink: 0;
      transition: background 0.2s;
    }

    .spoosh-toggle-slider::after {
      content: "";
      position: absolute;
      top: 2px;
      left: 2px;
      width: 16px;
      height: 16px;
      background: white;
      border-radius: 50%;
      transition: transform 0.2s;
    }

    .spoosh-settings-toggle input:checked + .spoosh-toggle-slider {
      background: var(--spoosh-primary);
    }

    .spoosh-settings-toggle input:checked + .spoosh-toggle-slider::after {
      transform: translateX(16px);
    }

    .spoosh-settings-label {
      font-size: 12px;
      color: var(--spoosh-text);
    }
  `;
}
