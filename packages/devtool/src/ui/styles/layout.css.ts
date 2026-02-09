export const layoutCSS = `
  /* ===== Sidebar Container ===== */
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
    box-shadow: -4px 0 24px rgba(0, 0, 0, 0.15);
    display: flex;
    flex-direction: column;
  }

  #spoosh-devtool-sidebar.open {
    transform: translateX(0);
  }

  /* Left-side sidebar positioning */
  #spoosh-devtool-sidebar.left {
    right: auto;
    left: 0;
    border-left: none;
    border-right: 1px solid var(--spoosh-border);
    transform: translateX(-100%);
    box-shadow: 4px 0 24px rgba(0, 0, 0, 0.15);
  }

  #spoosh-devtool-sidebar.left.open {
    transform: translateX(0);
  }

  #spoosh-devtool-sidebar.left .spoosh-resize-handle {
    left: auto;
    right: 0;
  }

  /* ===== Scrollbar Styling ===== */
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

  /* ===== Main Panel Layout ===== */
  .spoosh-panel {
    display: flex;
    flex: 1;
    min-height: 0;
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

  /* ===== Resize Handles ===== */
  .spoosh-resize-handle {
    position: absolute;
    left: 0;
    top: 0;
    width: 3px;
    height: 100%;
    cursor: ew-resize;
    background: transparent;
    z-index: 10;
  }

  .spoosh-divider-handle {
    width: 3px;
    cursor: col-resize;
    background: var(--spoosh-border);
    flex-shrink: 0;
  }

  .spoosh-horizontal-divider {
    height: 3px;
    cursor: row-resize;
    background: var(--spoosh-border);
    flex-shrink: 0;
  }

  /* ===== List Content ===== */
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

  .spoosh-traces {
    flex: 1;
    overflow-y: auto;
  }

  .spoosh-events {
    flex: 1;
    overflow-y: auto;
  }

  /* ===== Tab Content ===== */
  .spoosh-tab-content {
    flex: 1;
    overflow-y: auto;
    padding: 10px 12px;
  }

  /* ===== Empty States ===== */
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

  /* ===== Timeline Layout ===== */
  .spoosh-timeline {
    display: flex;
    flex-direction: column;
  }

  .spoosh-plugins-list {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  /* ===== Group Items Layout ===== */
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

  /* ===== Diff Layout ===== */
  .spoosh-plugin-diff {
    padding: 8px;
    border-top: 1px solid var(--spoosh-border);
    background: var(--spoosh-bg);
  }

  .spoosh-diff-header {
    display: flex;
    justify-content: flex-end;
    margin-bottom: 4px;
  }

  .spoosh-diff-block {
    margin-bottom: 8px;
  }

  .spoosh-diff-block:last-child {
    margin-bottom: 0;
  }

  /* ===== Plugin Details Layout ===== */
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

  /* ===== Data Section Layout ===== */
  .spoosh-data-section {
    margin-bottom: 10px;
  }

  .spoosh-data-section:last-child {
    margin-bottom: 0;
  }

  /* ===== Settings Layout ===== */
  .spoosh-settings-content {
    padding: 16px;
  }

  .spoosh-settings-section {
    margin-bottom: 20px;
  }

  .spoosh-settings-section:last-child {
    margin-bottom: 0;
  }
`;
