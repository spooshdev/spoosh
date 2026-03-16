import {
  PAGE_MESSAGE_SOURCE,
  EXTENSION_MESSAGE_SOURCE,
  type PageMessage,
  type ExtensionCommand,
} from "../shared/protocol";
import { CONNECTION_NAME } from "../shared/constants";

interface TabConnection {
  port: chrome.runtime.Port;
  tabId: number;
}

const tabConnections = new Map<number, TabConnection>();
const spooshDetectedTabs = new Set<number>();

function updateBadge(tabId: number) {
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

chrome.runtime.onMessage.addListener((message: PageMessage, sender) => {
  const tabId = sender.tab?.id;

  if (!tabId) return;

  if (message?.source !== PAGE_MESSAGE_SOURCE) return;

  if (message.type === "SPOOSH_DETECTED") {
    spooshDetectedTabs.add(tabId);
    updateBadge(tabId);
  } else if (message.type === "SPOOSH_NOT_DETECTED") {
    spooshDetectedTabs.delete(tabId);
    updateBadge(tabId);
  }

  const connection = tabConnections.get(tabId);

  if (connection) {
    connection.port.postMessage(message);
  }
});

chrome.runtime.onConnect.addListener((port) => {
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

        if (spooshDetectedTabs.has(tabId)) {
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
  const connection = tabConnections.get(tabId);

  if (changeInfo.status === "loading") {
    spooshDetectedTabs.delete(tabId);
    updateBadge(tabId);

    if (connection) {
      connection.port.postMessage({
        source: PAGE_MESSAGE_SOURCE,
        type: "PAGE_NAVIGATING",
      });

      setTimeout(() => {
        chrome.tabs
          .sendMessage(tabId, {
            source: EXTENSION_MESSAGE_SOURCE,
            type: "REQUEST_DETECTION",
          })
          .catch(() => {});
      }, 500);
    }
    return;
  }

  if (changeInfo.url && connection && spooshDetectedTabs.has(tabId)) {
    setTimeout(() => {
      chrome.tabs
        .sendMessage(tabId, {
          source: EXTENSION_MESSAGE_SOURCE,
          type: "REQUEST_DETECTION",
        })
        .catch(() => {});
    }, 100);
  }
});

chrome.tabs.onRemoved.addListener((tabId) => {
  spooshDetectedTabs.delete(tabId);
  tabConnections.delete(tabId);
});
