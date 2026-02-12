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
    cursor: grab;
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
    position: relative;
  }

  .spoosh-icon-btn.active {
    background: var(--spoosh-primary);
    color: white;
  }

  /* ===== Tooltips ===== */
  .spoosh-icon-btn::after,
  .spoosh-view-nav-btn::after,
  .spoosh-theme-toggle::after {
    content: attr(title);
    position: absolute;
    left: 50%;
    transform: translateX(-50%);
    padding: 4px 8px;
    background: var(--spoosh-text);
    color: var(--spoosh-bg);
    font-size: 10px;
    font-weight: 500;
    border-radius: 4px;
    white-space: nowrap;
    opacity: 0;
    visibility: hidden;
    transition: opacity 0.15s, visibility 0.15s;
    pointer-events: none;
    z-index: 100;
  }

  .spoosh-icon-btn:hover::after,
  .spoosh-view-nav-btn:hover::after,
  .spoosh-theme-toggle:hover::after {
    opacity: 1;
    visibility: visible;
  }

  /* Header buttons - tooltip below */
  .spoosh-icon-btn::after {
    top: calc(100% + 6px);
  }

  /* Bottom bar buttons - tooltip above */
  .spoosh-view-nav-btn::after,
  .spoosh-theme-toggle::after {
    bottom: calc(100% + 6px);
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

  .spoosh-traces {
    padding: 4px 6px;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  /* ===== Trace Card ===== */
  .spoosh-trace-card {
    display: flex;
    flex-direction: column;
    padding: 8px 10px;
    cursor: pointer;
    background: var(--spoosh-surface);
    border: 1px solid var(--spoosh-border);
    border-radius: 6px;
    transition: border-color 0.15s, background 0.15s, box-shadow 0.15s;
  }

  .spoosh-trace-card:hover {
    border-color: #8857ff;
    background: rgba(136, 87, 255, 0.03);
  }

  .spoosh-trace-card.selected {
    border-color: #8857ff;
    background: rgba(136, 87, 255, 0.06);
    box-shadow: 0 0 0 1px rgba(136, 87, 255, 0.3);
  }

  .spoosh-trace-card.error {
    border-left: 3px solid var(--spoosh-error);
  }

  .spoosh-trace-card.error:hover {
    background: rgba(248, 81, 73, 0.05);
    border-color: var(--spoosh-error);
  }

  .spoosh-trace-card.error.selected {
    background: rgba(248, 81, 73, 0.08);
    border-color: var(--spoosh-error);
    box-shadow: 0 0 0 1px rgba(248, 81, 73, 0.3);
  }

  .spoosh-trace-card.aborted {
    opacity: 0.6;
  }

  .spoosh-trace-card.status-pending {
    border-left: 3px solid #8857ff;
  }

  .spoosh-trace-card.status-success {
    border-left: 3px solid var(--spoosh-success);
  }

  .spoosh-trace-card-header {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-bottom: 4px;
  }

  .spoosh-trace-method-badge {
    font-weight: 600;
    font-size: 9px;
    padding: 2px 6px;
    border-radius: 3px;
    text-transform: uppercase;
    flex-shrink: 0;
  }

  .spoosh-trace-method-badge.method-GET {
    background: rgba(63, 185, 80, 0.15);
    color: var(--spoosh-success);
  }

  .spoosh-trace-method-badge.method-POST {
    background: rgba(88, 166, 255, 0.15);
    color: var(--spoosh-primary);
  }

  .spoosh-trace-method-badge.method-PUT,
  .spoosh-trace-method-badge.method-PATCH {
    background: rgba(210, 153, 34, 0.15);
    color: var(--spoosh-warning);
  }

  .spoosh-trace-method-badge.method-DELETE {
    background: rgba(248, 81, 73, 0.15);
    color: var(--spoosh-error);
  }

  .spoosh-trace-card-header .spoosh-trace-path {
    flex: 1;
    min-width: 0;
  }

  .spoosh-trace-card-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
  }

  .spoosh-trace-duration {
    font-size: 9px;
    padding: 2px 6px;
    border-radius: 3px;
    font-weight: 600;
    flex-shrink: 0;
  }

  .spoosh-trace-duration.success {
    background: rgba(63, 185, 80, 0.12);
    color: var(--spoosh-success);
  }

  .spoosh-trace-duration.error {
    background: rgba(248, 81, 73, 0.12);
    color: var(--spoosh-error);
  }

  .spoosh-trace-duration.pending {
    background: rgba(136, 87, 255, 0.12);
    color: #8857ff;
  }

  .spoosh-trace-duration.aborted {
    background: var(--spoosh-border);
    color: var(--spoosh-text-muted);
  }

  /* Legacy trace styles (for backwards compatibility) */
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

  .spoosh-trace.aborted {
    opacity: 0.5;
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
  .spoosh-trace-status.aborted { background: var(--spoosh-text-muted); }

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
    color: #8857ff;
    font-size: 10px;
    font-weight: 400;
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
    cursor: grab;
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

  .spoosh-badge.aborted {
    background: var(--spoosh-border);
    color: var(--spoosh-text-muted);
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

  /* ===== Headers List ===== */
  .spoosh-headers-list {
    background: var(--spoosh-surface);
    border: 1px solid var(--spoosh-border);
    border-radius: 4px;
    overflow: hidden;
  }

  .spoosh-header-row {
    display: flex;
    align-items: flex-start;
    gap: 8px;
    padding: 4px 8px;
    font-size: 11px;
    line-height: 1.4;
    border-bottom: 1px solid var(--spoosh-border);
  }

  .spoosh-header-row:last-child {
    border-bottom: none;
  }

  .spoosh-header-name {
    color: var(--spoosh-primary);
    font-weight: 500;
    flex-shrink: 0;
  }

  .spoosh-header-value {
    color: var(--spoosh-text);
    word-break: break-all;
    flex: 1;
    min-width: 0;
  }

  .spoosh-header-value-wrap {
    display: flex;
    align-items: center;
    gap: 6px;
    flex: 1;
    min-width: 0;
  }

  .spoosh-header-masked {
    color: var(--spoosh-text-muted);
    letter-spacing: 1px;
  }

  .spoosh-header-revealed {
    display: none;
    color: var(--spoosh-text);
    word-break: break-all;
  }

  .spoosh-header-value-wrap.revealed .spoosh-header-masked {
    display: none;
  }

  .spoosh-header-value-wrap.revealed .spoosh-header-revealed {
    display: inline;
  }

  .spoosh-header-toggle {
    background: transparent;
    border: none;
    color: var(--spoosh-text-muted);
    cursor: pointer;
    padding: 2px;
    border-radius: 3px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    transition: color 0.15s;
  }

  .spoosh-header-toggle:hover {
    color: var(--spoosh-text);
  }

  .spoosh-eye-hide {
    display: none;
  }

  .spoosh-eye-show {
    display: flex;
  }

  .spoosh-header-value-wrap.revealed .spoosh-eye-show {
    display: none;
  }

  .spoosh-header-value-wrap.revealed .spoosh-eye-hide {
    display: flex;
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
    cursor: grab;
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

  .spoosh-view-nav {
    display: flex;
    align-items: center;
    gap: 2px;
  }

  .spoosh-view-nav-btn {
    position: relative;
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

  .spoosh-view-nav-btn:hover {
    background: var(--spoosh-border);
    color: var(--spoosh-text);
  }

  .spoosh-view-select {
    background: transparent;
    border: 1px solid var(--spoosh-border);
    color: var(--spoosh-text-muted);
    padding: 2px 6px;
    border-radius: 3px;
    font-size: 10px;
    font-family: inherit;
    cursor: pointer;
  }

  .spoosh-view-select:focus {
    outline: none;
  }

  .spoosh-theme-toggle {
    position: relative;
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

  /* ===== State Entry List ===== */
  .spoosh-state-section {
    flex: 1;
    display: flex;
    flex-direction: column;
    min-height: 0;
    overflow: hidden;
  }

  .spoosh-import-section {
    flex: 1;
    display: flex;
    flex-direction: column;
    min-height: 0;
    overflow: hidden;
  }

  .spoosh-state-section .spoosh-section-header {
    background: linear-gradient(90deg, rgba(20, 184, 166, 0.1) 0%, transparent 100%);
    border-left: 2px solid #14b8a6;
  }

  .spoosh-state-entries {
    flex: 1;
    overflow-y: auto;
  }

  .spoosh-state-entry {
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

  .spoosh-state-entry:hover {
    border-color: #14b8a6;
    background: rgba(20, 184, 166, 0.05);
  }

  .spoosh-state-entry.selected {
    border-color: #14b8a6;
    background: rgba(20, 184, 166, 0.08);
    box-shadow: 0 0 0 1px rgba(20, 184, 166, 0.3);
  }

  .spoosh-state-status {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    flex-shrink: 0;
    border: 2px solid var(--spoosh-surface);
    box-shadow: 0 0 0 2px currentColor;
  }

  .spoosh-state-status.success { color: var(--spoosh-success); background: var(--spoosh-success); }
  .spoosh-state-status.error { color: var(--spoosh-error); background: var(--spoosh-error); }
  .spoosh-state-status.stale { color: var(--spoosh-warning); background: var(--spoosh-warning); }
  .spoosh-state-status.empty { color: var(--spoosh-border); background: var(--spoosh-border); }

  .spoosh-state-info {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 3px;
  }

  .spoosh-state-key-row {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .spoosh-state-method {
    font-weight: 600;
    font-size: 9px;
    padding: 2px 5px;
    border-radius: 3px;
    background: rgba(20, 184, 166, 0.15);
    color: #14b8a6;
  }

  .spoosh-state-path {
    color: var(--spoosh-text);
    font-size: 11px;
    font-weight: 500;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .spoosh-state-query {
    color: #14b8a6;
    font-size: 10px;
    font-weight: 400;
  }

  .spoosh-state-preview {
    font-size: 10px;
    color: var(--spoosh-text-muted);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-family: var(--spoosh-font);
    padding-left: 1px;
  }

  .spoosh-state-meta {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 4px;
    flex-shrink: 0;
  }

  .spoosh-state-subscribers {
    font-size: 9px;
    padding: 2px 6px;
    border-radius: 10px;
    background: #14b8a6;
    color: white;
    font-weight: 600;
  }

  .spoosh-state-stale-badge {
    font-size: 9px;
    padding: 2px 5px;
    border-radius: 3px;
    background: rgba(210, 153, 34, 0.15);
    color: var(--spoosh-warning);
    font-weight: 500;
  }

  /* ===== State Detail ===== */
  .spoosh-state-info-list {
    padding: 12px;
  }

  .spoosh-state-info-row {
    display: flex;
    justify-content: space-between;
    padding: 4px 0;
    border-bottom: 1px solid var(--spoosh-border);
  }

  .spoosh-state-info-row:last-child {
    border-bottom: none;
  }

  .spoosh-state-info-label {
    font-size: 11px;
    color: var(--spoosh-text-muted);
  }

  .spoosh-state-info-value {
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

  /* ===== State Actions ===== */
  .spoosh-state-actions {
    display: flex;
    gap: 8px;
    padding: 10px 12px;
    border-top: 1px solid var(--spoosh-border);
    background: var(--spoosh-surface);
  }

  .spoosh-state-action-btn {
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

  .spoosh-state-action-btn:hover {
    background: rgba(20, 184, 166, 0.1);
  }

  .spoosh-state-action-btn.danger {
    border-color: var(--spoosh-error);
    color: var(--spoosh-error);
  }

  .spoosh-state-action-btn.danger:hover {
    background: rgba(248, 81, 73, 0.1);
  }

  .spoosh-state-clear-all {
    padding: 6px 10px;
    border-top: 1px solid var(--spoosh-border);
    background: var(--spoosh-surface);
  }

  .spoosh-state-clear-all .spoosh-state-action-btn {
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

  /* ===== Import Empty State ===== */
  .spoosh-import-empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100%;
    padding: 40px 20px;
    text-align: center;
    gap: 8px;
  }

  .spoosh-import-empty-icon {
    color: var(--spoosh-text-muted);
    opacity: 0.5;
    margin-bottom: 4px;
  }

  .spoosh-import-empty-text {
    color: var(--spoosh-text);
    font-size: 13px;
    font-weight: 500;
  }

  .spoosh-import-empty-hint {
    color: var(--spoosh-text-muted);
    font-size: 11px;
    margin-bottom: 8px;
  }

  .spoosh-import-btn {
    padding: 6px 16px;
    font-size: 12px;
    font-family: inherit;
    color: var(--spoosh-text);
    background: var(--spoosh-primary);
    border: none;
    border-radius: 4px;
    cursor: pointer;
    transition: opacity 0.15s;
  }

  .spoosh-import-btn:hover {
    opacity: 0.85;
  }

  .spoosh-state-clear-all .spoosh-import-btn {
    width: 100%;
    margin-bottom: 4px;
  }
`;
