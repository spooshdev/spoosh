import {
  DEVTOOLS_PANEL_NAME,
  DEVTOOLS_PANEL_ICON,
  DEVTOOLS_PAGE_CONNECTION_NAME,
} from "../shared/constants";
import { PAGE_MESSAGE_SOURCE, type PageMessage } from "../shared/protocol";

let panelRef: chrome.devtools.panels.ExtensionPanel | null = null;

chrome.devtools.panels.create(
  DEVTOOLS_PANEL_NAME,
  DEVTOOLS_PANEL_ICON,
  "src/devtools/panel.html",
  (panel) => {
    panelRef = panel;
    panel.onShown.addListener(() => {});
    panel.onHidden.addListener(() => {});
  }
);

const port = chrome.runtime.connect({ name: DEVTOOLS_PAGE_CONNECTION_NAME });

port.postMessage({
  type: "INIT_DEVTOOLS_PAGE",
  tabId: chrome.devtools.inspectedWindow.tabId,
});

port.onMessage.addListener((message: PageMessage) => {
  if (message?.source !== PAGE_MESSAGE_SOURCE) return;

  if (message.type === "FOCUS_PANEL" && panelRef) {
    (panelRef as unknown as { show: () => void }).show();
  }
});
