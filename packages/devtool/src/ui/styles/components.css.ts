import type { DevToolTheme } from "../../types";
import { headerCSS } from "./header.css";
import { listCSS } from "./list.css";
import { detailCSS } from "./detail.css";
import { timelineCSS } from "./timeline.css";
import { settingsCSS } from "./settings.css";
import { stateCSS } from "./state.css";
import { subscriptionCSS } from "./subscription.css";

export function getFabCSS(theme: DevToolTheme): string {
  return `
    /* ===== Floating Action Button ===== */
    #spoosh-devtool-fab {
      position: fixed;
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background: ${theme.colors.surface};
      border: 1px solid ${theme.colors.border};
      color: ${theme.colors.text};
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 4px 14px rgba(0, 0, 0, 0.25);
      z-index: 999998;
    }

    #spoosh-devtool-fab.bottom-right { bottom: 20px; right: 20px; }
    #spoosh-devtool-fab.bottom-left { bottom: 20px; left: 20px; }
    #spoosh-devtool-fab.top-right { top: 20px; right: 20px; }
    #spoosh-devtool-fab.top-left { top: 20px; left: 20px; }

    #spoosh-devtool-fab {
      transition: top 0.2s ease, left 0.2s ease, bottom 0.2s ease, right 0.2s ease;
    }

    #spoosh-devtool-fab:active {
      cursor: grabbing;
    }

    #spoosh-devtool-fab .badge {
      position: absolute;
      top: -6px;
      right: -6px;
      background: ${theme.colors.error};
      color: white;
      font-size: 9px;
      font-weight: 600;
      min-width: 16px;
      height: 16px;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 0 4px;
      font-family: ${theme.fonts.mono};
    }
  `;
}

export const componentsCSS = [
  headerCSS,
  listCSS,
  detailCSS,
  timelineCSS,
  settingsCSS,
  stateCSS,
  subscriptionCSS,
].join("\n");
