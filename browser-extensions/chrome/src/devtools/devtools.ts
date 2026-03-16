import { DEVTOOLS_PANEL_NAME, DEVTOOLS_PANEL_ICON } from "../shared/constants";

chrome.devtools.panels.create(
  DEVTOOLS_PANEL_NAME,
  DEVTOOLS_PANEL_ICON,
  "src/devtools/panel.html",
  (panel) => {
    panel.onShown.addListener(() => {});
    panel.onHidden.addListener(() => {});
  }
);
