export const headerCSS = `
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
  .spoosh-theme-toggle::after,
  .spoosh-chip-icon::after {
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
  .spoosh-theme-toggle:hover::after,
  .spoosh-chip-icon:hover::after {
    opacity: 1;
    visibility: visible;
  }

  /* Header buttons - tooltip below */
  .spoosh-icon-btn::after,
  .spoosh-chip-icon::after {
    top: calc(100% + 6px);
  }

  /* Bottom bar buttons - tooltip above */
  .spoosh-view-nav-btn::after,
  .spoosh-theme-toggle::after {
    bottom: calc(100% + 6px);
  }

  /* ===== Filter Bar ===== */
  .spoosh-filter-bar {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 4px;
    padding: 6px 10px;
    border-bottom: 1px solid var(--spoosh-border);
  }

  .spoosh-filter-divider {
    width: 1px;
    height: 16px;
    background: var(--spoosh-border);
    margin: 0 4px;
  }

  .spoosh-chip {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 3px 8px;
    border: none;
    border-radius: 4px;
    background: transparent;
    color: var(--spoosh-text-muted);
    cursor: pointer;
    font-size: 10px;
    font-family: inherit;
    font-weight: 500;
    text-transform: uppercase;
    letter-spacing: 0.3px;
    transition: all 0.15s ease;
  }

  .spoosh-chip:hover {
    background: var(--spoosh-border);
    color: var(--spoosh-text);
  }

  .spoosh-chip.active {
    background: rgba(88, 166, 255, 0.15);
    color: var(--spoosh-primary);
  }

  .spoosh-chip.active svg {
    stroke: var(--spoosh-primary);
  }

  .spoosh-chip svg {
    flex-shrink: 0;
  }

  .spoosh-chip-icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 4px 6px;
    border: none;
    border-radius: 4px;
    background: transparent;
    color: var(--spoosh-text-muted);
    cursor: pointer;
    transition: all 0.15s ease;
    position: relative;
  }

  .spoosh-chip-icon:hover {
    background: var(--spoosh-border);
    color: var(--spoosh-text);
  }

  .spoosh-chip-icon.active {
    background: rgba(88, 166, 255, 0.15);
    color: var(--spoosh-primary);
  }

  .spoosh-chip-icon.active svg {
    stroke: var(--spoosh-primary);
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
`;
