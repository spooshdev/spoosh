import {
  PAGE_MESSAGE_SOURCE,
  EXTENSION_MESSAGE_SOURCE,
  type PageMessage,
  type ExtensionCommand,
} from "../shared/protocol";
import {
  CONNECTION_NAME,
  DEVTOOLS_PAGE_CONNECTION_NAME,
} from "../shared/constants";

interface TabConnection {
  port: chrome.runtime.Port;
  tabId: number;
}

const tabConnections = new Map<number, TabConnection>();
const devtoolsPageConnections = new Map<number, chrome.runtime.Port>();
const spooshDetectedTabs = new Set<number>();

function updateIcon(tabId: number) {
  if (!chrome.action) return;

  const isDetected = spooshDetectedTabs.has(tabId);

  chrome.action.setIcon({
    tabId,
    path: isDetected
      ? {
          16: "icons/icon-16.png",
          32: "icons/icon-32.png",
          48: "icons/icon-48.png",
          128: "icons/icon-128.png",
        }
      : {
          16: "icons/icon-16-inactive.png",
          32: "icons/icon-32-inactive.png",
          48: "icons/icon-48-inactive.png",
          128: "icons/icon-128-inactive.png",
        },
  });
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type === "GET_DETECTION_STATUS" && message.tabId) {
    sendResponse({ detected: spooshDetectedTabs.has(message.tabId) });
    return true;
  }

  const tabId = sender.tab?.id;

  if (!tabId) {
    return;
  }

  const pageMessage = message as PageMessage;

  if (pageMessage?.source !== PAGE_MESSAGE_SOURCE) {
    return;
  }

  if (pageMessage.type === "SPOOSH_DETECTED") {
    spooshDetectedTabs.add(tabId);
    updateIcon(tabId);
  } else if (pageMessage.type === "SPOOSH_NOT_DETECTED") {
    spooshDetectedTabs.delete(tabId);
    updateIcon(tabId);
  }

  const connection = tabConnections.get(tabId);

  if (connection) {
    connection.port.postMessage(pageMessage);
  }
});

chrome.runtime.onConnect.addListener((port) => {
  if (port.name === DEVTOOLS_PAGE_CONNECTION_NAME) {
    let tabId: number | undefined;

    port.onMessage.addListener((message: { type: string; tabId?: number }) => {
      if (message.type === "INIT_DEVTOOLS_PAGE" && message.tabId) {
        tabId = message.tabId;
        devtoolsPageConnections.set(tabId, port);
      }
    });

    port.onDisconnect.addListener(() => {
      if (tabId) {
        devtoolsPageConnections.delete(tabId);
      }
    });

    return;
  }

  if (port.name !== CONNECTION_NAME) return;

  let tabId: number | undefined;

  port.onMessage.addListener(
    (message: {
      type: string;
      tabId?: number;
      commandType?: string;
      commandPayload?: unknown;
    }) => {
      if (message.type === "INIT" && message.tabId) {
        tabId = message.tabId;
        tabConnections.set(tabId, { port, tabId });

        const isAlreadyDetected = spooshDetectedTabs.has(tabId);

        if (isAlreadyDetected) {
          port.postMessage({
            source: PAGE_MESSAGE_SOURCE,
            type: "SPOOSH_DETECTED",
            payload: { version: "unknown" },
          });
        } else {
          chrome.tabs
            .sendMessage(tabId, {
              source: EXTENSION_MESSAGE_SOURCE,
              type: "REQUEST_DETECTION",
            })
            .catch(() => {});
        }
      }

      if (!tabId) return;

      if (message.type === "COMMAND" && message.commandType) {
        const extCommand: ExtensionCommand = {
          source: EXTENSION_MESSAGE_SOURCE,
          type: message.commandType as ExtensionCommand["type"],
          payload: message.commandPayload,
        };
        chrome.tabs.sendMessage(tabId, extCommand);
      }
    }
  );

  port.onDisconnect.addListener(() => {
    if (tabId) {
      tabConnections.delete(tabId);
    }
  });
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (changeInfo.status === "complete") {
    chrome.tabs
      .sendMessage(tabId, {
        source: EXTENSION_MESSAGE_SOURCE,
        type: "REQUEST_DETECTION",
      })
      .catch(() => {
        spooshDetectedTabs.delete(tabId);
        updateIcon(tabId);
      });
  }
});

chrome.tabs.onRemoved.addListener((tabId) => {
  spooshDetectedTabs.delete(tabId);
  tabConnections.delete(tabId);
  devtoolsPageConnections.delete(tabId);
});

chrome.commands.onCommand.addListener((command, tab) => {
  if (command === "open-panel" && tab?.id) {
    const devtoolsPort = devtoolsPageConnections.get(tab.id);

    if (devtoolsPort) {
      devtoolsPort.postMessage({
        source: PAGE_MESSAGE_SOURCE,
        type: "FOCUS_PANEL",
      });
    }
  }
});
