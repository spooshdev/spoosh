export const detailCSS = `
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

  .spoosh-empty {
    padding: 20px;
    text-align: center;
    color: var(--spoosh-text-muted);
    font-size: 12px;
  }

  .spoosh-empty-tab {
    padding: 20px;
    text-align: center;
    color: var(--spoosh-text-muted);
    font-size: 11px;
  }

  .spoosh-tab-section {
    padding: 12px;
  }

  .spoosh-tab-section + .spoosh-tab-section {
    border-top: 1px solid var(--spoosh-border);
  }
`;
