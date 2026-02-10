import type { InternalTab } from "../../view-model";

export interface StateTabsContext {
  activeTab: InternalTab;
}

export function renderStateTabs(ctx: StateTabsContext): string {
  const { activeTab } = ctx;

  return `
    <div class="spoosh-tabs">
      <button
        class="spoosh-tab ${activeTab === "data" ? "active" : ""}"
        data-internal-tab="data"
      >
        Data
      </button>
      <button
        class="spoosh-tab ${activeTab === "meta" ? "active" : ""}"
        data-internal-tab="meta"
      >
        Meta
      </button>
      <button
        class="spoosh-tab ${activeTab === "raw" ? "active" : ""}"
        data-internal-tab="raw"
      >
        Raw
      </button>
    </div>
  `;
}
