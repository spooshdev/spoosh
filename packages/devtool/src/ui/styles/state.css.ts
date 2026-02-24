export const stateCSS = `
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
