export const subscriptionCSS = `
  /* ===== Subscription Message List ===== */
  .spoosh-messages-list {
    padding: 4px 8px;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .spoosh-message-row {
    background: var(--spoosh-surface);
    border: 1px solid var(--spoosh-border);
    border-radius: 6px;
    overflow: hidden;
    cursor: pointer;
    transition: border-color 0.15s;
  }

  .spoosh-message-row:hover {
    border-color: var(--spoosh-primary);
  }

  .spoosh-message-row.expanded {
    border-color: var(--spoosh-primary);
    background: rgba(88, 166, 255, 0.03);
  }

  .spoosh-message-row.muted {
    opacity: 0.4;
  }

  .spoosh-message-row.muted:hover {
    opacity: 0.6;
  }

  .spoosh-message-header {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 10px;
  }

  .spoosh-message-expand {
    color: var(--spoosh-text-muted);
    font-size: 8px;
    flex-shrink: 0;
    width: 10px;
  }

  .spoosh-message-time {
    font-size: 9px;
    color: var(--spoosh-text-muted);
    flex-shrink: 0;
    font-family: var(--spoosh-font-mono);
  }

  .spoosh-message-event {
    font-size: 10px;
    font-weight: 600;
    padding: 2px 6px;
    border-radius: 3px;
    background: rgba(136, 87, 229, 0.15);
    color: #a78bfa;
    flex-shrink: 0;
  }

  .spoosh-message-event-message {
    background: rgba(63, 185, 80, 0.15);
    color: var(--spoosh-success);
  }

  .spoosh-message-preview {
    font-size: 10px;
    color: var(--spoosh-text-muted);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    flex: 1;
    min-width: 0;
  }

  .spoosh-message-content {
    padding: 0 10px 10px 10px;
    border-top: 1px solid var(--spoosh-border);
    background: var(--spoosh-bg);
  }

  .spoosh-message-content .spoosh-json {
    margin-top: 8px;
    max-height: 200px;
    overflow-y: auto;
  }

  /* ===== Subscription Accumulated Diff ===== */
  .spoosh-accumulated-container {
    padding: 12px;
  }

  .spoosh-accumulated-header {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 12px;
  }

  .spoosh-accumulated-diff {
    margin-top: 8px;
  }

  .spoosh-accumulated-diff .spoosh-diff-lines {
    max-height: 400px;
    overflow-y: auto;
  }

  .spoosh-empty-inline {
    color: var(--spoosh-text-muted);
    font-size: 11px;
    font-style: italic;
    margin-bottom: 8px;
  }

  /* ===== Accumulated Event Sections ===== */
  .spoosh-accumulated-summary {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 12px;
  }

  .spoosh-event-list {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .spoosh-event-section {
    background: var(--spoosh-surface);
    border: 1px solid var(--spoosh-border);
    border-radius: 6px;
    overflow: hidden;
    cursor: pointer;
    transition: border-color 0.15s;
  }

  .spoosh-event-section:hover {
    border-color: var(--spoosh-text-muted);
  }

  .spoosh-event-section.expanded {
    border-color: var(--spoosh-primary);
  }

  .spoosh-event-section.muted {
    opacity: 0.4;
  }

  .spoosh-event-section.muted:hover {
    opacity: 0.6;
  }

  .spoosh-event-header {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 12px;
  }

  .spoosh-event-expand {
    color: var(--spoosh-text-muted);
    font-size: 8px;
    flex-shrink: 0;
    width: 10px;
  }

  .spoosh-event-name {
    font-size: 12px;
    font-weight: 600;
    color: var(--spoosh-text);
    flex: 1;
  }

  .spoosh-event-stats {
    display: flex;
    align-items: center;
    gap: 12px;
    font-size: 10px;
    color: var(--spoosh-text-muted);
  }

  .spoosh-event-count {
    opacity: 0.8;
  }

  .spoosh-event-time {
    font-family: var(--spoosh-font-mono);
    opacity: 0.6;
  }

  .spoosh-event-content {
    padding: 0 12px 12px 12px;
    border-top: 1px solid var(--spoosh-border);
    background: var(--spoosh-bg);
  }

  .spoosh-event-content .spoosh-json {
    margin-top: 8px;
    max-height: 300px;
    overflow-y: auto;
  }

  /* ===== Subscription Connection Info ===== */
  .spoosh-connection-container {
    padding: 12px;
  }

  .spoosh-connection-info {
    background: var(--spoosh-surface);
    border: 1px solid var(--spoosh-border);
    border-radius: 6px;
    overflow: hidden;
  }

  .spoosh-connection-row {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    padding: 8px 12px;
    border-bottom: 1px solid var(--spoosh-border);
    gap: 12px;
  }

  .spoosh-connection-row:last-child {
    border-bottom: none;
  }

  .spoosh-connection-label {
    font-size: 11px;
    color: var(--spoosh-text-muted);
    flex-shrink: 0;
  }

  .spoosh-connection-value {
    font-size: 11px;
    color: var(--spoosh-text);
    text-align: right;
    word-break: break-all;
  }

  .spoosh-connection-value.error {
    color: var(--spoosh-error);
  }

  .spoosh-connection-url {
    font-family: var(--spoosh-font-mono);
    font-size: 10px;
  }

  /* ===== Subscription Status Indicator ===== */
  .spoosh-status-indicator {
    font-size: 10px;
  }

  .spoosh-status-indicator.connecting {
    color: var(--spoosh-primary);
    animation: pulse 1.5s infinite;
  }

  .spoosh-status-indicator.connected {
    color: var(--spoosh-success);
  }

  .spoosh-status-indicator.disconnected {
    color: var(--spoosh-text-muted);
  }

  .spoosh-status-indicator.error {
    color: var(--spoosh-error);
  }

  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.4; }
  }

  /* ===== Subscription Card Styles ===== */
  .spoosh-trace-card.subscription {
    border-left: 3px solid var(--spoosh-primary);
  }

  .spoosh-trace-card.subscription.status-success {
    border-left-color: var(--spoosh-success);
  }

  .spoosh-trace-card.subscription.status-error {
    border-left-color: var(--spoosh-error);
  }

  .spoosh-trace-card.subscription.status-neutral {
    border-left-color: var(--spoosh-text-muted);
  }

  .spoosh-trace-method-badge.method-sse {
    background: rgba(45, 212, 191, 0.15);
    color: #2dd4bf;
  }

  /* TODO: Add WS styles back when WebSocket transport is implemented
  .spoosh-trace-method-badge.method-ws {
    background: rgba(136, 87, 255, 0.15);
    color: #8857ff;
  }
  */

  .spoosh-subscription-status {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 10px;
    color: var(--spoosh-text-muted);
  }

  .spoosh-subscription-duration {
    font-size: 9px;
  }

  .spoosh-subscription-messages {
    font-size: 9px;
    padding: 2px 6px;
    border-radius: 3px;
    background: var(--spoosh-border);
    color: var(--spoosh-text-muted);
    font-weight: 500;
  }
`;
