export const listCSS = `
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
  .method-sse { color: #2dd4bf; }

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
`;
