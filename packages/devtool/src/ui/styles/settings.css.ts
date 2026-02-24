export const settingsCSS = `
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
`;
