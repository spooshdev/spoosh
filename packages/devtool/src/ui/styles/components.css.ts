import type { DevToolTheme } from "../../types";

export function getFabCSS(theme: DevToolTheme): string {
  return `
    /* ===== Floating Action Button ===== */
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
    }

    #spoosh-devtool-fab.bottom-right { bottom: 20px; right: 20px; }
    #spoosh-devtool-fab.bottom-left { bottom: 20px; left: 20px; }
    #spoosh-devtool-fab.top-right { top: 20px; right: 20px; }
    #spoosh-devtool-fab.top-left { top: 20px; left: 20px; }

    #spoosh-devtool-fab {
      transition: top 0.2s ease, left 0.2s ease, bottom 0.2s ease, right 0.2s ease;
    }

    #spoosh-devtool-fab:active {
      cursor: grabbing;
    }

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
  `;
}

export const componentsCSS = `
  /* ===== Header ===== */
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
    color: var(--spoosh-text);
    text-decoration: none;
  }

  .spoosh-title:hover {
    text-decoration: underline;
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

  /* ===== Icon Buttons ===== */
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
  }

  .spoosh-icon-btn.active {
    background: var(--spoosh-primary);
    color: white;
  }

  /* ===== Filters ===== */
  .spoosh-filters {
    display: flex;
    gap: 6px;
    padding: 6px 10px;
    border-bottom: 1px solid var(--spoosh-border);
  }

  .spoosh-filter {
    padding: 2px 8px;
    border: none;
    border-radius: 10px;
    background: var(--spoosh-border);
    color: var(--spoosh-text-muted);
    cursor: pointer;
    font-size: 10px;
    font-family: inherit;
    font-weight: 500;
    text-transform: uppercase;
    letter-spacing: 0.3px;
  }

  .spoosh-filter.active {
    background: rgba(88, 166, 255, 0.2);
    color: var(--spoosh-primary);
  }

  /* ===== Search ===== */
  .spoosh-search {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 6px 10px;
    border-bottom: 1px solid var(--spoosh-border);
  }

  .spoosh-search-icon {
    color: var(--spoosh-text-muted);
    flex-shrink: 0;
  }

  .spoosh-search-input {
    flex: 1;
    background: transparent;
    border: none;
    color: var(--spoosh-text);
    font-size: 11px;
    font-family: inherit;
    outline: none;
  }

  .spoosh-search-input::placeholder {
    color: var(--spoosh-text-muted);
    opacity: 0.6;
  }

  /* ===== Section Header ===== */
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

  .spoosh-active-count {
    color: var(--spoosh-primary);
    font-weight: 600;
  }

  /* ===== Trace List ===== */
  .spoosh-requests-section .spoosh-section-header {
    background: linear-gradient(90deg, rgba(136, 87, 255, 0.08) 0%, transparent 100%);
    border-left: 2px solid #8857ff;
  }

  .spoosh-trace {
    display: flex;
    align-items: flex-start;
    gap: 8px;
    padding: 8px 10px;
    cursor: pointer;
    border-bottom: 1px solid var(--spoosh-border);
  }

  .spoosh-trace:hover {
    background: rgba(136, 87, 255, 0.05);
  }

  .spoosh-trace.selected {
    background: rgba(136, 87, 255, 0.08);
    border-left: 2px solid #8857ff;
    padding-left: 8px;
  }

  .spoosh-trace.error {
    background: rgba(248, 81, 73, 0.08);
  }

  .spoosh-trace.error:hover {
    background: rgba(248, 81, 73, 0.12);
  }

  .spoosh-trace.error.selected {
    background: rgba(248, 81, 73, 0.15);
    border-left-color: var(--spoosh-error);
  }

  .spoosh-trace-status {
    width: 8px;
    height: 8px;
    border-radius: 2px;
    flex-shrink: 0;
    margin-top: 2px;
  }

  .spoosh-trace-status.success { background: var(--spoosh-success); }
  .spoosh-trace-status.error { background: var(--spoosh-error); }
  .spoosh-trace-status.pending { background: #8857ff; }

  .spoosh-trace-info {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .spoosh-trace-key-row {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .spoosh-trace-method {
    font-weight: 600;
    font-size: 10px;
  }

  /* Method colors - semantic naming */
  .method-GET { color: var(--spoosh-success); }
  .method-POST { color: var(--spoosh-primary); }
  .method-PUT, .method-PATCH { color: var(--spoosh-warning); }
  .method-DELETE { color: var(--spoosh-error); }

  .spoosh-trace-path {
    color: var(--spoosh-text);
    font-size: 11px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .spoosh-trace-query {
    color: var(--spoosh-text-muted);
    font-size: 10px;
  }

  .spoosh-trace-preview-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 6px;
  }

  .spoosh-trace-preview {
    font-size: 10px;
    color: var(--spoosh-text-muted);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .spoosh-trace-time {
    font-size: 9px;
    padding: 0px 5px;
    border-radius: 3px;
    background: var(--spoosh-border);
    color: var(--spoosh-text-muted);
    font-weight: 500;
    flex-shrink: 0;
  }

  /* ===== Events List ===== */
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

  /* ===== Detail Header ===== */
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
    align-items: center;
    gap: 6px;
  }

  /* ===== Copy Button ===== */
  .spoosh-copy-btn {
    background: transparent;
    border: 1px solid var(--spoosh-border);
    color: var(--spoosh-text-muted);
    cursor: pointer;
    padding: 3px 5px;
    border-radius: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.15s;
  }

  .spoosh-copy-btn:hover {
    background: var(--spoosh-border);
    color: var(--spoosh-text);
  }

  .spoosh-detail-empty-hint {
    color: var(--spoosh-text-muted);
    font-size: 12px;
    margin-top: 4px;
    opacity: 0.7;
  }

  /* ===== Badges ===== */
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

  /* ===== Tabs ===== */
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
  }

  .spoosh-tab.active {
    color: var(--spoosh-primary);
    border-bottom-color: var(--spoosh-primary);
  }

  /* ===== JSON Display ===== */
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

  /* ===== Code Block with Copy ===== */
  .spoosh-code-block {
    position: relative;
  }

  .spoosh-code-copy-btn {
    position: absolute;
    top: 6px;
    right: 6px;
    background: var(--spoosh-surface);
    border: 1px solid var(--spoosh-border);
    border-radius: 4px;
    padding: 4px 6px;
    cursor: pointer;
    color: var(--spoosh-text-muted);
    opacity: 0;
    transition: opacity 0.15s, background 0.15s, color 0.15s;
    z-index: 1;
  }

  .spoosh-code-block:hover .spoosh-code-copy-btn {
    opacity: 1;
  }

  .spoosh-code-copy-btn:hover {
    background: var(--spoosh-border);
    color: var(--spoosh-text);
  }

  .spoosh-code-copy-btn svg {
    display: block;
  }

  /* ===== Body Type Badge ===== */
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

  /* ===== Plugins Header ===== */
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
  }

  /* ===== Timeline Step ===== */
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

  /* ===== Timeline Group ===== */
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

  .spoosh-timeline-group-count {
    font-size: 9px;
    padding: 1px 6px;
    border-radius: 3px;
    background: var(--spoosh-primary);
    color: var(--spoosh-bg);
    font-weight: 600;
  }

  /* ===== Fetch Divider ===== */
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

  /* ===== Plugin Item (Card Style) ===== */
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

  .spoosh-plugin-header {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 12px;
    cursor: pointer;
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

  /* ===== Step Detail ===== */
  .spoosh-step-detail-header {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 12px;
    cursor: pointer;
    font-size: 12px;
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

  /* ===== Info Display ===== */
  .spoosh-trace-info-section {
    padding: 8px;
    border-top: 1px solid var(--spoosh-border);
    background: var(--spoosh-bg);
  }

  .spoosh-info-item {
    margin-bottom: 8px;
  }

  .spoosh-info-item:last-child {
    margin-bottom: 0;
  }

  .spoosh-info-label {
    font-size: 10px;
    font-weight: 600;
    color: var(--spoosh-text-muted);
    margin-bottom: 4px;
  }

  .spoosh-info-value {
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
  }

  /* ===== Diff Display ===== */
  .spoosh-diff-description {
    font-size: 10px;
    color: var(--spoosh-text-muted);
    margin-bottom: 6px;
    font-style: italic;
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

  .spoosh-diff-toggle {
    background: transparent;
    border: 1px solid var(--spoosh-border);
    color: var(--spoosh-text-muted);
    padding: 2px 6px;
    border-radius: 3px;
    font-size: 9px;
    cursor: pointer;
    font-family: inherit;
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

  .spoosh-diff-prefix {
    display: inline-block;
    width: 12px;
    user-select: none;
  }

  /* ===== Spinner ===== */
  .spoosh-spinner {
    width: 20px;
    height: 20px;
    border: 2px solid var(--spoosh-border);
    border-top-color: var(--spoosh-primary);
    border-radius: 50%;
  }

  /* ===== Settings ===== */
  .spoosh-settings-header {
    padding: 12px 16px;
    border-bottom: 1px solid var(--spoosh-border);
    background: var(--spoosh-surface);
  }

  .spoosh-settings-title {
    font-weight: 600;
    font-size: 13px;
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

  .spoosh-settings-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px 0;
  }

  .spoosh-settings-select {
    background: var(--spoosh-surface);
    border: 1px solid var(--spoosh-border);
    color: var(--spoosh-text);
    padding: 4px 8px;
    border-radius: 4px;
    font-size: 12px;
    font-family: inherit;
    cursor: pointer;
  }

  .spoosh-settings-select:focus {
    outline: none;
    border-color: var(--spoosh-primary);
  }

  /* ===== Bottom Bar ===== */
  .spoosh-bottom-bar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 4px 8px;
    border-top: 1px solid var(--spoosh-border);
    background: var(--spoosh-surface);
    flex-shrink: 0;
  }

  .spoosh-sidebar-position-btns {
    display: flex;
    gap: 2px;
  }

  .spoosh-sidebar-pos-btn {
    background: transparent;
    border: 1px solid var(--spoosh-border);
    color: var(--spoosh-text-muted);
    cursor: pointer;
    padding: 3px 6px;
    border-radius: 3px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.15s;
  }

  .spoosh-sidebar-pos-btn:hover {
    background: var(--spoosh-border);
    color: var(--spoosh-text);
  }

  .spoosh-sidebar-pos-btn.active {
    background: var(--spoosh-primary);
    border-color: var(--spoosh-primary);
    color: white;
  }

  .spoosh-bottom-bar-right {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .spoosh-view-select {
    background: var(--spoosh-bg);
    border: 1px solid var(--spoosh-border);
    color: var(--spoosh-text);
    padding: 2px 6px;
    border-radius: 3px;
    font-size: 10px;
    font-family: inherit;
    cursor: pointer;
  }

  .spoosh-view-select:focus {
    outline: none;
    border-color: var(--spoosh-primary);
  }

  .spoosh-theme-toggle {
    background: transparent;
    border: 1px solid var(--spoosh-border);
    color: var(--spoosh-text-muted);
    cursor: pointer;
    padding: 3px 5px;
    border-radius: 3px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.15s;
  }

  .spoosh-theme-toggle:hover {
    background: var(--spoosh-border);
    color: var(--spoosh-text);
  }

  /* ===== Cache Entry List ===== */
  .spoosh-cache-section {
    flex: 1;
    display: flex;
    flex-direction: column;
    min-height: 0;
    overflow: hidden;
  }

  .spoosh-cache-section .spoosh-section-header {
    background: linear-gradient(90deg, rgba(20, 184, 166, 0.1) 0%, transparent 100%);
    border-left: 2px solid #14b8a6;
  }

  .spoosh-cache-entries {
    flex: 1;
    overflow-y: auto;
  }

  .spoosh-cache-entry {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 12px;
    cursor: pointer;
    border-bottom: 1px solid var(--spoosh-border);
    background: var(--spoosh-surface);
    margin: 4px 6px;
    border-radius: 6px;
    border: 1px solid var(--spoosh-border);
  }

  .spoosh-cache-entry:hover {
    border-color: #14b8a6;
    background: rgba(20, 184, 166, 0.05);
  }

  .spoosh-cache-entry.selected {
    border-color: #14b8a6;
    background: rgba(20, 184, 166, 0.08);
    box-shadow: 0 0 0 1px rgba(20, 184, 166, 0.3);
  }

  .spoosh-cache-status {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    flex-shrink: 0;
    border: 2px solid var(--spoosh-surface);
    box-shadow: 0 0 0 2px currentColor;
  }

  .spoosh-cache-status.success { color: var(--spoosh-success); background: var(--spoosh-success); }
  .spoosh-cache-status.error { color: var(--spoosh-error); background: var(--spoosh-error); }
  .spoosh-cache-status.stale { color: var(--spoosh-warning); background: var(--spoosh-warning); }
  .spoosh-cache-status.empty { color: var(--spoosh-border); background: var(--spoosh-border); }

  .spoosh-cache-info {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 3px;
  }

  .spoosh-cache-key-row {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .spoosh-cache-method {
    font-weight: 600;
    font-size: 9px;
    padding: 2px 5px;
    border-radius: 3px;
    background: rgba(20, 184, 166, 0.15);
    color: #14b8a6;
  }

  .spoosh-cache-path {
    color: var(--spoosh-text);
    font-size: 11px;
    font-weight: 500;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .spoosh-cache-query {
    color: #14b8a6;
    font-size: 10px;
    font-weight: 400;
  }

  .spoosh-cache-preview {
    font-size: 10px;
    color: var(--spoosh-text-muted);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-family: var(--spoosh-font);
    padding-left: 1px;
  }

  .spoosh-cache-meta {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 4px;
    flex-shrink: 0;
  }

  .spoosh-cache-subscribers {
    font-size: 9px;
    padding: 2px 6px;
    border-radius: 10px;
    background: #14b8a6;
    color: white;
    font-weight: 600;
  }

  .spoosh-cache-stale-badge {
    font-size: 9px;
    padding: 2px 5px;
    border-radius: 3px;
    background: rgba(210, 153, 34, 0.15);
    color: var(--spoosh-warning);
    font-weight: 500;
  }

  /* ===== Cache Detail ===== */
  .spoosh-cache-info-list {
    padding: 12px;
  }

  .spoosh-cache-info-row {
    display: flex;
    justify-content: space-between;
    padding: 4px 0;
    border-bottom: 1px solid var(--spoosh-border);
  }

  .spoosh-cache-info-row:last-child {
    border-bottom: none;
  }

  .spoosh-cache-info-label {
    font-size: 11px;
    color: var(--spoosh-text-muted);
  }

  .spoosh-cache-info-value {
    font-size: 11px;
    color: var(--spoosh-text);
    text-align: right;
  }

  .spoosh-tab-section {
    padding: 12px;
  }

  .spoosh-tab-section + .spoosh-tab-section {
    border-top: 1px solid var(--spoosh-border);
  }

  /* ===== Cache Actions ===== */
  .spoosh-cache-actions {
    display: flex;
    gap: 8px;
    padding: 10px 12px;
    border-top: 1px solid var(--spoosh-border);
    background: var(--spoosh-surface);
  }

  .spoosh-cache-action-btn {
    padding: 5px 10px;
    border-radius: 4px;
    font-size: 10px;
    font-family: inherit;
    font-weight: 500;
    cursor: pointer;
    background: var(--spoosh-surface);
    border: 1px solid #14b8a6;
    color: #14b8a6;
    transition: all 0.15s;
  }

  .spoosh-cache-action-btn:hover {
    background: rgba(20, 184, 166, 0.1);
  }

  .spoosh-cache-action-btn.danger {
    border-color: var(--spoosh-error);
    color: var(--spoosh-error);
  }

  .spoosh-cache-action-btn.danger:hover {
    background: rgba(248, 81, 73, 0.1);
  }

  .spoosh-cache-clear-all {
    padding: 6px 10px;
    border-top: 1px solid var(--spoosh-border);
    background: var(--spoosh-surface);
  }

  .spoosh-cache-clear-all .spoosh-cache-action-btn {
    width: 100%;
  }

  /* ===== Detail Empty State ===== */
  .spoosh-detail-empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100%;
    padding: 40px;
    text-align: center;
  }

  .spoosh-detail-empty-icon {
    color: var(--spoosh-text-muted);
    opacity: 0.5;
    margin-bottom: 12px;
  }

  .spoosh-detail-empty-text {
    color: var(--spoosh-text-muted);
    font-size: 12px;
  }
`;
