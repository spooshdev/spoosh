export const timelineCSS = `
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
`;
