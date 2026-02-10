export const effectsCSS = `
  /* ===== Sidebar Transitions ===== */
  #spoosh-devtool-sidebar {
    transition: transform 0.25s ease;
  }

  /* ===== FAB Transitions ===== */
  #spoosh-devtool-fab {
    transition: transform 0.2s, box-shadow 0.2s;
  }

  #spoosh-devtool-fab:hover {
    transform: scale(1.08);
    box-shadow: 0 6px 20px rgba(0, 0, 0, 0.3);
  }

  /* ===== Resize Handle Hover ===== */
  .spoosh-resize-handle {
    transition: background 0.15s;
  }

  .spoosh-resize-handle:hover {
    background: var(--spoosh-primary);
  }

  .spoosh-divider-handle {
    transition: background 0.15s;
  }

  .spoosh-divider-handle:hover {
    background: var(--spoosh-primary);
  }

  .spoosh-horizontal-divider {
    transition: background 0.15s;
  }

  .spoosh-horizontal-divider:hover {
    background: var(--spoosh-primary);
  }

  /* ===== Button Transitions ===== */
  .spoosh-icon-btn {
    transition: background 0.15s, color 0.15s;
  }

  .spoosh-icon-btn:hover {
    background: var(--spoosh-border);
    color: var(--spoosh-text);
  }

  .spoosh-icon-btn.active:hover {
    background: var(--spoosh-primary);
    color: white;
  }

  /* ===== Filter Transitions ===== */
  .spoosh-filter {
    transition: all 0.15s;
  }

  .spoosh-filter:hover {
    background: var(--spoosh-text-muted);
    color: var(--spoosh-bg);
  }

  .spoosh-filter.active:hover {
    background: rgba(88, 166, 255, 0.3);
    color: var(--spoosh-primary);
  }

  /* ===== Tab Transitions ===== */
  .spoosh-tab {
    transition: color 0.15s, border-color 0.15s;
  }

  .spoosh-tab:hover {
    color: var(--spoosh-text);
  }

  /* ===== Trace Row Hover ===== */
  .spoosh-trace {
    transition: background 0.15s;
  }

  .spoosh-trace:hover {
    background: var(--spoosh-bg);
  }

  /* ===== Timeline Hover ===== */
  .spoosh-timeline-step-header:hover {
    background: var(--spoosh-surface);
  }

  .spoosh-timeline-group-header:hover {
    background: var(--spoosh-surface);
  }

  /* ===== Plugin Transitions ===== */
  .spoosh-plugin-header {
    transition: background 0.15s;
  }

  .spoosh-plugin-header:hover {
    background: var(--spoosh-bg);
  }

  .spoosh-plugin-item.passed .spoosh-plugin-header:hover {
    background: transparent;
  }

  .spoosh-step-detail-header:hover {
    background: var(--spoosh-surface);
  }

  /* ===== Toggle Passed Button ===== */
  .spoosh-toggle-passed {
    transition: all 0.15s;
  }

  .spoosh-toggle-passed:hover {
    border-color: var(--spoosh-text-muted);
    color: var(--spoosh-text);
  }

  /* ===== Diff Toggle Button ===== */
  .spoosh-diff-toggle {
    transition: all 0.15s;
  }

  .spoosh-diff-toggle:hover {
    border-color: var(--spoosh-text-muted);
    color: var(--spoosh-text);
  }

  /* ===== Settings Toggle Slider ===== */
  .spoosh-toggle-slider {
    transition: background 0.2s;
  }

  .spoosh-toggle-slider::after {
    transition: transform 0.2s;
  }

  /* ===== Pulse Animation ===== */
  @keyframes spoosh-pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.4; }
  }

  .spoosh-trace-status.pending {
    animation: spoosh-pulse 1.5s ease-in-out infinite;
  }

  /* ===== Spin Animation ===== */
  @keyframes spoosh-spin {
    to { transform: rotate(360deg); }
  }

  .spoosh-spinner {
    animation: spoosh-spin 0.8s linear infinite;
  }
`;
